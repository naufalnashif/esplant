import type { FinanceState } from "./localDb";
import { loadLocalState, saveLocalState, sanitizeImportedState, createInitialState } from "./localDb";
import { readState, writeState, isSignedIn, authorize, AuthRequiredError } from "./googleSheets";

export type StorageMode = "local" | "sheets";
export type SyncStatus = "idle" | "syncing" | "saved" | "error" | "offline";

type Listener = (status: SyncStatus, detail?: string) => void;

let listener: Listener | null = null;
export const onSyncStatus = (next: Listener | null) => {
  listener = next;
};
const emit = (status: SyncStatus, detail?: string) => listener?.(status, detail);

/** Reads the active workspace: the user's spreadsheet when connected, otherwise this browser. */
export async function loadFinanceState(mode: StorageMode, spreadsheetId: string): Promise<FinanceState> {
  if (mode === "sheets" && spreadsheetId) {
    emit("syncing");
    try {
      if (!isSignedIn()) await authorize(false);
      const remote = await readState(spreadsheetId);
      const clean = sanitizeImportedState(remote) ?? createInitialState();
      await saveLocalState(clean); // offline mirror
      emit("saved");
      return clean;
    } catch (error) {
      const offline = !navigator.onLine;
      emit(offline ? "offline" : "error", error instanceof Error ? error.message : undefined);
      if (error instanceof AuthRequiredError) throw error;
      return loadLocalState(); // degrade to the mirror instead of a blank screen
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
  try {
    if (!isSignedIn()) await authorize(false);
    await writeState(job.spreadsheetId, job.state);
    emit("saved");
  } catch (error) {
    emit(!navigator.onLine ? "offline" : "error", error instanceof Error ? error.message : undefined);
  } finally {
    flushing = false;
    if (pending) void flush();
  }
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
