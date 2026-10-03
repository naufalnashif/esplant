import type { FinanceState } from "./localDb";
import { loadLocalState, saveLocalState, sanitizeImportedState, createInitialState, createErasedState } from "./localDb";
import { createSampleState } from "./sampleData";
import { readState, writeState, isSignedIn, authorize, AuthRequiredError } from "./googleSheets";
import { isCacheFresh, getCachedState, setCachedState, invalidateCache } from "./sheetsCache";

export type StorageMode = "local" | "sheets";
/**
 * "disconnected" = the spreadsheet link is still configured but Google auth expired and a silent
 * refresh did not work. The user keeps seeing their cached data and is offered a "sync ulang"
 * action; they are NEVER signed out or bounced back to onboarding.
 */
export type SyncStatus = "idle" | "syncing" | "saved" | "error" | "offline" | "disconnected";

type Listener = (status: SyncStatus, detail?: string) => void;

let listener: Listener | null = null;
export const onSyncStatus = (next: Listener | null) => {
  listener = next;
};
const emit = (status: SyncStatus, detail?: string) => listener?.(status, detail);

const failureStatus = (error: unknown): SyncStatus => {
  if (!navigator.onLine) return "offline";
  return error instanceof AuthRequiredError ? "disconnected" : "error";
};

/** Reads the active workspace: isolated demo cache when in demo mode, spreadsheet when connected, otherwise production browser cache. */
export async function loadFinanceState(
  mode: StorageMode,
  spreadsheetId: string,
  isDemo?: boolean,
): Promise<FinanceState> {
  if (isDemo) {
    const demo = await loadLocalState("demo");
    // If the demo store has no transactions and no accounts, auto-seed with deterministic 6-month sample data
    if (demo.transactions.length === 0 && demo.accounts.length === 0) {
      const seeded = createSampleState(demo);
      await saveLocalState(seeded, "demo");
      return seeded;
    }
    return demo;
  }

  if (mode === "sheets" && spreadsheetId) {
    // SWR: return cached data immediately if still fresh
    if (isCacheFresh(spreadsheetId)) {
      const cached = getCachedState(spreadsheetId);
      if (cached) return cached;
    }
    emit("syncing");
    try {
      // Silent-only here: a popup on app start-up would be blocked by the browser anyway.
      if (!isSignedIn()) await authorize(false);
      const remote = await readState(spreadsheetId);
      const clean = sanitizeImportedState(remote) ?? createInitialState();
      await saveLocalState(clean, "production"); // offline mirror
      setCachedState(spreadsheetId, clean); // update SWR cache
      emit("saved");
      return clean;
    } catch (error) {
      emit(failureStatus(error), error instanceof Error ? error.message : undefined);
      // Always degrade to the offline mirror — losing the session must not blank the workspace.
      return loadLocalState("production");
    }
  }
  return loadLocalState("production");
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let pending: { spreadsheetId: string; state: FinanceState } | null = null;
let flushing = false;

async function flush(): Promise<void> {
  if (flushing || !pending) return;
  flushing = true;
  const job = pending;
  pending = null;
  emit("syncing");
  let ok = false;
  try {
    if (!isSignedIn()) await authorize(false);
    await writeState(job.spreadsheetId, job.state);
    invalidateCache(job.spreadsheetId); // force fresh read on next load
    emit("saved");
    ok = true;
  } catch (error) {
    emit(failureStatus(error), error instanceof Error ? error.message : undefined);
    // Keep the unsent snapshot queued (unless a newer one arrived) so "sync ulang" can push it
    // once the session is healthy again — the local mirror already holds the data.
    if (!pending) pending = job;
  } finally {
    flushing = false;
  }
  // Chain a newer snapshot only after a success, so a failing session cannot spin forever.
  if (ok && pending) await flush();
}

/** True when a local change has not reached the spreadsheet yet. */
export const hasPendingSync = (): boolean => pending !== null;

/**
 * Retries the queued snapshot after the user reconnects. Interactive auth is allowed here because
 * it is always triggered by a click.
 */
export async function retrySync(spreadsheetId: string, state: FinanceState): Promise<void> {
  if (!isSignedIn()) await authorize(true);
  pending = pending ?? { spreadsheetId, state };
  await flush();
}

/** Writes locally right away, then pushes to the spreadsheet (debounced, coalesced) when connected. */
export async function saveFinanceState(
  mode: StorageMode,
  spreadsheetId: string,
  state: FinanceState,
  isDemo?: boolean,
): Promise<FinanceState> {
  if (isDemo) {
    await saveLocalState(state, "demo");
    return state;
  }

  await saveLocalState(state, "production");

  if (mode === "sheets" && spreadsheetId) {
    pending = { spreadsheetId, state };
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => void flush(), 1500); // raised from 1200ms for better coalescing
  }
  return state;
}

/** Immediate push, used by the manual "Push to Sheets" control. */
export async function pushNow(spreadsheetId: string, state: FinanceState): Promise<void> {
  if (writeTimer) clearTimeout(writeTimer);
  pending = { spreadsheetId, state };
  await flush();
}

/**
 * "Hapus semua data": wipes financial records locally (localStorage + IndexedDB).
 * When in demo mode, only the demo sandbox is reset.
 * When in sheets mode, immediately clears remote spreadsheet as well.
 */
export async function eraseAllData(
  mode: StorageMode,
  spreadsheetId: string,
  state: FinanceState,
  isDemo?: boolean,
): Promise<{ state: FinanceState; sheetsError?: string }> {
  const erased = createErasedState(state);
  if (isDemo) {
    await saveLocalState(erased, "demo");
    return { state: erased };
  }

  await saveLocalState(erased, "production");

  if (mode === "sheets" && spreadsheetId) {
    // Drop any stale queued write so it cannot race the erase and resurrect old rows afterward.
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = null;
    pending = null;
    emit("syncing");
    try {
      if (!isSignedIn()) await authorize(false);
      await writeState(spreadsheetId, erased);
      emit("saved");
    } catch (error) {
      emit(failureStatus(error), error instanceof Error ? error.message : undefined);
      return { state: erased, sheetsError: error instanceof Error ? error.message : "Gagal menghapus data di spreadsheet" };
    }
  }

  return { state: erased };
}
