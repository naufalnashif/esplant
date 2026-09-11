import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onSyncStatus, type StorageMode, type SyncStatus } from "./dataStore";
import { isSignedIn, restoreSession, signOutGoogle, spreadsheetUrl, authorize } from "./googleSheets";

export type { StorageMode, SyncStatus };

/**
 * Workspace pointer kept in this browser only. Deliberately holds no email,
 * no token and nothing that identifies the user to our servers.
 */
export interface UserProfile {
  nickname: string;
  spreadsheetId: string;
  spreadsheetName: string;
  storageMode: StorageMode;
  onboarded: boolean;
}

export interface StorageContextValue {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  disconnectSheet: () => void;
  storageMode: StorageMode;
  spreadsheetId: string;
  sheetUrl: string;
  syncStatus: SyncStatus;
  syncDetail: string;
  lastSyncTime: Date | null;
  googleSignedIn: boolean;
  /** True while the silent session restore is still running on app start-up. */
  restoringSession: boolean;
  /** Set when the sheet link is intact but Google auth needs one interactive click. */
  needsReconnect: boolean;
  /** Interactive re-auth for the "Terputus, klik untuk sync ulang" affordance. */
  reconnect: () => Promise<boolean>;
}

const StorageContext = createContext<StorageContextValue | undefined>(undefined);
const PROFILE_KEY = "selfmanage-user-profile";
const LEGACY_PROFILE_KEY = "esplan-user-profile";
const LAST_SYNC_KEY = "selfmanage-last-sync";

const readProfile = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY) ?? localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile> & { email?: string };
    if (!parsed || typeof parsed !== "object") return null;
    // Migration: drop the legacy `email` field, it was never used.
    return {
      nickname: String(parsed.nickname ?? "").slice(0, 24),
      spreadsheetId: String(parsed.spreadsheetId ?? ""),
      spreadsheetName: String(parsed.spreadsheetName ?? ""),
      storageMode: parsed.spreadsheetId ? "sheets" : "local",
      onboarded: Boolean(parsed.onboarded),
    };
  } catch {
    return null;
  }
};

/** Last successful sync, so reopening the tab can show it before the first round-trip. */
const readLastSync = (): Date | null => {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    if (!raw) return null;
    const time = new Date(raw);
    return Number.isNaN(time.getTime()) ? null : time;
  } catch {
    return null;
  }
};

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(readProfile);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncDetail, setSyncDetail] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(readLastSync);
  const [googleSignedIn, setGoogleSignedIn] = useState(isSignedIn);
  const [restoringSession, setRestoringSession] = useState(false);

  useEffect(() => {
    onSyncStatus((status, detail) => {
      setSyncStatus(status);
      setSyncDetail(detail ?? "");
      if (status === "saved") {
        const now = new Date();
        setLastSyncTime(now);
        try {
          localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
        } catch {
          /* private mode */
        }
      }
      setGoogleSignedIn(isSignedIn());
    });
    return () => onSyncStatus(null);
  }, []);

  /*
    Start-up session restore. A cached access token survives a tab close now, and when it has
    expired we try exactly ONE silent refresh. Whatever happens we keep the profile — a failed
    restore only flips the pill to "Terputus", it never sends the user back to onboarding.
  */
  useEffect(() => {
    if (profile?.storageMode !== "sheets" || !profile.spreadsheetId) return;
    if (isSignedIn()) {
      setGoogleSignedIn(true);
      return;
    }
    let alive = true;
    setRestoringSession(true);
    void restoreSession()
      .then((restored) => {
        if (!alive) return;
        setGoogleSignedIn(restored);
        if (!restored) setSyncStatus((current) => (current === "syncing" ? current : "disconnected"));
      })
      .finally(() => {
        if (alive) setRestoringSession(false);
      });
    return () => {
      alive = false;
    };
    // Runs once per connected workspace, not on every sync tick.
  }, [profile?.storageMode, profile?.spreadsheetId]);

  const setProfile = useCallback((next: UserProfile) => {
    setProfileState(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    setGoogleSignedIn(isSignedIn());
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
    signOutGoogle();
    setGoogleSignedIn(false);
  }, []);

  const reconnect = useCallback(async (): Promise<boolean> => {
    try {
      await authorize(true);
      setGoogleSignedIn(true);
      return true;
    } catch {
      setGoogleSignedIn(false);
      setSyncStatus("disconnected");
      return false;
    }
  }, []);

  const disconnectSheet = useCallback(() => {
    signOutGoogle();
    setGoogleSignedIn(false);
    setSyncStatus("idle");
    setProfileState((current) => {
      if (!current) return current;
      const next: UserProfile = { ...current, spreadsheetId: "", spreadsheetName: "", storageMode: "local" };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  const value = useMemo<StorageContextValue>(() => {
    const spreadsheetId = profile?.storageMode === "sheets" ? profile.spreadsheetId : "";
    return {
      profile,
      setProfile,
      clearProfile,
      disconnectSheet,
      storageMode: spreadsheetId ? "sheets" : "local",
      spreadsheetId,
      sheetUrl: spreadsheetId ? spreadsheetUrl(spreadsheetId) : "",
      syncStatus,
      syncDetail,
      lastSyncTime,
      googleSignedIn,
      restoringSession,
      needsReconnect: Boolean(spreadsheetId) && !googleSignedIn && !restoringSession,
      reconnect,
    };
  }, [profile, setProfile, clearProfile, disconnectSheet, syncStatus, syncDetail, lastSyncTime, googleSignedIn, restoringSession, reconnect]);

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};

export const useStorage = (): StorageContextValue => {
  const context = useContext(StorageContext);
  if (!context) throw new Error("useStorage must be used within a StorageProvider");
  return context;
};
