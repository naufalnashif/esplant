import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DASHBOARD_STORAGE_KEY,
  DEFAULT_DASHBOARD_LAYOUT,
  sanitizeDashboardLayout,
  type DesktopColSpan,
  type WidgetId,
  type WidgetLayoutItem,
} from "@/types/dashboardLayout";

export interface UseDashboardLayoutResult {
  layout: WidgetLayoutItem[];
  displayLayout: WidgetLayoutItem[];
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  setColSpan: (id: WidgetId, span: DesktopColSpan) => void;
  toggleVisibility: (id: WidgetId) => void;
  moveWidget: (id: WidgetId, direction: "up" | "down") => void;
  reorderWidgets: (newOrderedIds: WidgetId[]) => void;
  resetToDefault: () => void;
  showAllWidgets: () => void;
  isWidgetVisible: (id: WidgetId) => boolean;
}

const cloneDefaultLayout = (): WidgetLayoutItem[] =>
  DEFAULT_DASHBOARD_LAYOUT.map((item) => ({ ...item }));

export function useDashboardLayout(): UseDashboardLayoutResult {
  // Load layout dari localStorage dengan sanitasi ketat (kebal parsing error)
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!raw) return cloneDefaultLayout();
      const parsed = JSON.parse(raw);
      return sanitizeDashboardLayout(parsed);
    } catch {
      return cloneDefaultLayout();
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draftLayout, setDraftLayout] = useState<WidgetLayoutItem[]>(layout);
  const draftLayoutRef = useRef<WidgetLayoutItem[]>(layout);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronous immediate persistence helper (for Save & Reset)
  const persistImmediately = useCallback((itemsToSave: WidgetLayoutItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    try {
      const payload = {
        version: 1,
        widgets: itemsToSave,
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(payload));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dashboard-layout-change"));
      }
    } catch (err) {
      console.error("Gagal menyimpan konfigurasi dashboard layout:", err);
    }
  }, []);

  // Debounced persistence helper to prevent localStorage thrashing
  const persistToStorage = useCallback((itemsToSave: WidgetLayoutItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistImmediately(itemsToSave);
    }, 350);
  }, [persistImmediately]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Cross-component and cross-tab synchronization listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSync = () => {
      try {
        const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
        const next = raw ? sanitizeDashboardLayout(JSON.parse(raw)) : cloneDefaultLayout();
        setLayout(next);
        setDraftLayout(next);
        draftLayoutRef.current = next;
      } catch {
        const fresh = cloneDefaultLayout();
        setLayout(fresh);
        setDraftLayout(fresh);
        draftLayoutRef.current = fresh;
      }
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("dashboard-layout-change", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("dashboard-layout-change", handleSync);
    };
  }, []);

  const startEditing = useCallback(() => {
    draftLayoutRef.current = layout;
    setDraftLayout(layout);
    setIsEditing(true);
  }, [layout]);

  const cancelEditing = useCallback(() => {
    draftLayoutRef.current = layout;
    setDraftLayout(layout);
    setIsEditing(false);
  }, [layout]);

  const saveEditing = useCallback(() => {
    const toSave = draftLayoutRef.current;
    setLayout(toSave);
    persistImmediately(toSave);
    setIsEditing(false);
    toast.success("Tata letak dashboard berhasil disimpan.");
  }, [persistImmediately]);

  const setColSpan = useCallback((id: WidgetId, span: DesktopColSpan) => {
    setDraftLayout((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, desktopColSpan: span } : item));
      draftLayoutRef.current = next;
      return next;
    });
    if (!isEditing) {
      setLayout((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, desktopColSpan: span } : item));
        persistToStorage(next);
        return next;
      });
    }
  }, [isEditing, persistToStorage]);

  const toggleVisibility = useCallback((id: WidgetId) => {
    setDraftLayout((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, isVisible: !item.isVisible } : item));
      draftLayoutRef.current = next;
      return next;
    });
    if (!isEditing) {
      setLayout((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, isVisible: !item.isVisible } : item));
        persistToStorage(next);
        return next;
      });
    }
  }, [isEditing, persistToStorage]);

  const moveWidget = useCallback((id: WidgetId, direction: "up" | "down") => {
    const calcNext = (prev: WidgetLayoutItem[]) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const currentIndex = sorted.findIndex((item) => item.id === id);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev;

      // Swap positions
      const nextSorted = [...sorted];
      const temp = nextSorted[currentIndex];
      nextSorted[currentIndex] = nextSorted[targetIndex];
      nextSorted[targetIndex] = temp;

      // Reassign sequential orders
      return nextSorted.map((item, idx) => ({ ...item, order: idx + 1 }));
    };

    setDraftLayout((prev) => {
      const next = calcNext(prev);
      draftLayoutRef.current = next;
      return next;
    });
    if (!isEditing) {
      setLayout((prev) => {
        const next = calcNext(prev);
        persistToStorage(next);
        return next;
      });
    }
  }, [isEditing, persistToStorage]);

  const reorderWidgets = useCallback((newOrderedIds: WidgetId[]) => {
    const calcNext = (prev: WidgetLayoutItem[]) => {
      const itemMap = new Map(prev.map((item) => [item.id, item]));
      const next: WidgetLayoutItem[] = [];

      newOrderedIds.forEach((id, index) => {
        const item = itemMap.get(id);
        if (item) {
          next.push({ ...item, order: index + 1 });
          itemMap.delete(id);
        }
      });

      // Append any missing items
      itemMap.forEach((item) => {
        next.push({ ...item, order: next.length + 1 });
      });

      return next;
    };

    setDraftLayout((prev) => {
      const next = calcNext(prev);
      draftLayoutRef.current = next;
      return next;
    });
    if (!isEditing) {
      setLayout((prev) => {
        const next = calcNext(prev);
        persistToStorage(next);
        return next;
      });
    }
  }, [isEditing, persistToStorage]);

  const resetToDefault = useCallback(() => {
    const fresh = cloneDefaultLayout();
    draftLayoutRef.current = fresh;
    setDraftLayout(fresh);
    setLayout(fresh);
    persistImmediately(fresh);
    toast.success("Tata letak dikembalikan ke default.");
  }, [persistImmediately]);

  const showAllWidgets = useCallback(() => {
    const calcNext = (prev: WidgetLayoutItem[]) => prev.map((item) => ({ ...item, isVisible: true }));
    setDraftLayout((prev) => {
      const next = calcNext(prev);
      draftLayoutRef.current = next;
      return next;
    });
    if (!isEditing) {
      setLayout((prev) => {
        const next = calcNext(prev);
        persistToStorage(next);
        return next;
      });
    }
  }, [isEditing, persistToStorage]);

  const isWidgetVisible = useCallback(
    (id: WidgetId) => {
      const activeList = isEditing ? draftLayout : layout;
      const found = activeList.find((item) => item.id === id);
      return found ? found.isVisible : true;
    },
    [isEditing, draftLayout, layout]
  );

  const displayLayout = isEditing ? draftLayout : layout;
  const hasUnsavedChanges = JSON.stringify(draftLayout) !== JSON.stringify(layout);

  return {
    layout,
    displayLayout: [...displayLayout].sort((a, b) => a.order - b.order),
    isEditing,
    hasUnsavedChanges,
    startEditing,
    cancelEditing,
    saveEditing,
    setColSpan,
    toggleVisibility,
    moveWidget,
    reorderWidgets,
    resetToDefault,
    showAllWidgets,
    isWidgetVisible,
  };
}
