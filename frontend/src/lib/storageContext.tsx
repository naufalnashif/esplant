import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loadGoogleApi } from './googleSheets';

export type StorageMode = 'local' | 'sheets';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface UserProfile {
  nickname: string;
  email: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  storageMode: StorageMode;
  onboarded: boolean;
}

export interface StorageContextValue {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  storageMode: StorageMode;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  googleReady: boolean;
  isAuthenticated: boolean;
  lastSyncTime: Date | null;
  setLastSyncTime: (time: Date) => void;
}

const StorageContext = createContext<StorageContextValue | undefined>(undefined);

const PROFILE_KEY = 'esplan-user-profile';

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [googleReady, setGoogleReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const storageMode: StorageMode = profile?.storageMode || 'local';

  useEffect(() => {
    const initGoogle = async () => {
      try {
        await loadGoogleApi();
        setGoogleReady(true);
        // Note: we'd also check if token exists to set isAuthenticated
        if (window.gapi?.client?.getToken()) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to load Google API:', e);
      }
    };
    initGoogle();
  }, []);

  const setProfile = (newProfile: UserProfile) => {
    setProfileState(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
  };

  const clearProfile = () => {
    setProfileState(null);
    localStorage.removeItem(PROFILE_KEY);
  };

  // Keep track of auth status periodically or by listening to events if needed
  useEffect(() => {
    const interval = setInterval(() => {
      if (googleReady && window.gapi?.client) {
        setIsAuthenticated(!!window.gapi.client.getToken());
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [googleReady]);

  return (
    <StorageContext.Provider
      value={{
        profile,
        setProfile,
        clearProfile,
        storageMode,
        syncStatus,
        setSyncStatus,
        googleReady,
        isAuthenticated,
        lastSyncTime,
        setLastSyncTime,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = (): StorageContextValue => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};

export const useProfile = () => {
  const { profile, setProfile, clearProfile } = useStorage();
  return { profile, setProfile, clearProfile };
};

export const useSyncStatus = () => {
  const { syncStatus, setSyncStatus, lastSyncTime, setLastSyncTime } = useStorage();
  return { syncStatus, setSyncStatus, lastSyncTime, setLastSyncTime };
};
