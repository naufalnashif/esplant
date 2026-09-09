import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onSyncStatus, type StorageMode, type SyncStatus } from "./dataStore";
import { isSignedIn, signOutGoogle, spreadsheetUrl } from "./googleSheets";

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
}

const StorageContext = createContext<StorageContextValue | undefined>(undefined);
const PROFILE_KEY = "esplan-user-profile";

const readProfile = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
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

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(readProfile);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncDetail, setSyncDetail] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [googleSignedIn, setGoogleSignedIn] = useState(isSignedIn);

  useEffect(() => {
    onSyncStatus((status, detail) => {
      setSyncStatus(status);
      setSyncDetail(detail ?? "");
      if (status === "saved") setLastSyncTime(new Date());
      setGoogleSignedIn(isSignedIn());
    });
    return () => onSyncStatus(null);
  }, []);

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
    signOutGoogle();
    setGoogleSignedIn(false);
  }, []);

  const disconnectSheet = useCallback(() => {
    signOutGoogle();
    setGoogleSignedIn(false);
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
    };
  }, [profile, setProfile, clearProfile, disconnectSheet, syncStatus, syncDetail, lastSyncTime, googleSignedIn]);

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};

export const useStorage = (): StorageContextValue => {
  const context = useContext(StorageContext);
  if (!context) throw new Error("useStorage must be used within a StorageProvider");
  return context;
};
