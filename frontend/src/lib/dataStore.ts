import type { FinanceState } from "./localDb";
import { loadLocalState, saveLocalState, sanitizeImportedState, createInitialState } from "./localDb";
import { readState, writeState, isSignedIn, authorize, AuthRequiredError } from "./googleSheets";

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

/** Reads the active workspace: the user's spreadsheet when connected, otherwise this browser. */
export async function loadFinanceState(mode: StorageMode, spreadsheetId: string): Promise<FinanceState> {
  if (mode === "sheets" && spreadsheetId) {
    emit("syncing");
    try {
      // Silent-only here: a popup on app start-up would be blocked by the browser anyway.
      if (!isSignedIn()) await authorize(false);
      const remote = await readState(spreadsheetId);
      const clean = sanitizeImportedState(remote) ?? createInitialState();
      await saveLocalState(clean); // offline mirror
      emit("saved");
      return clean;
    } catch (error) {
      emit(failureStatus(error), error instanceof Error ? error.message : undefined);
      // Always degrade to the offline mirror — losing the session must not blank the workspace.
      return loadLocalState();
    }
  }
  return loadLocalState();
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

/** Writes locally right away, then pushes to the spreadsheet (debounced, coalesced). */
export async function saveFinanceState(
  mode: StorageMode,
  spreadsheetId: string,
  state: FinanceState,
): Promise<FinanceState> {
  await saveLocalState(state);

  if (mode === "sheets" && spreadsheetId) {
    pending = { spreadsheetId, state };
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => void flush(), 1200);
  }
  return state;
}

/** Immediate push, used by the manual "Push to Sheets" control. */
export async function pushNow(spreadsheetId: string, state: FinanceState): Promise<void> {
  if (writeTimer) clearTimeout(writeTimer);
  pending = { spreadsheetId, state };
  await flush();
}
