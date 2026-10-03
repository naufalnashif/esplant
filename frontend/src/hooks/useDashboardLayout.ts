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

export function useDashboardLayout(): UseDashboardLayoutResult {
  // Load layout dari localStorage dengan sanitasi ketat (kebal parsing error)
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!raw) return DEFAULT_DASHBOARD_LAYOUT;
      const parsed = JSON.parse(raw);
      return sanitizeDashboardLayout(parsed);
    } catch {
      return DEFAULT_DASHBOARD_LAYOUT;
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draftLayout, setDraftLayout] = useState<WidgetLayoutItem[]>(layout);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced persistence helper to prevent localStorage thrashing
  const persistToStorage = useCallback((itemsToSave: WidgetLayoutItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const payload = {
          version: 1,
          widgets: itemsToSave,
          lastModified: new Date().toISOString(),
        };
        localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error("Gagal menyimpan konfigurasi dashboard layout:", err);
      }
    }, 350);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const startEditing = useCallback(() => {
    setDraftLayout(layout);
    setIsEditing(true);
  }, [layout]);

  const cancelEditing = useCallback(() => {
    setDraftLayout(layout);
    setIsEditing(false);
  }, [layout]);

  const saveEditing = useCallback(() => {
    setLayout(draftLayout);
    persistToStorage(draftLayout);
    setIsEditing(false);
    toast.success("Tata letak dashboard berhasil disimpan.");
  }, [draftLayout, persistToStorage]);

  const setColSpan = useCallback((id: WidgetId, span: DesktopColSpan) => {
    setDraftLayout((prev) =>
      prev.map((item) => (item.id === id ? { ...item, desktopColSpan: span } : item))
    );
  }, []);

  const toggleVisibility = useCallback((id: WidgetId) => {
    setDraftLayout((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isVisible: !item.isVisible } : item))
    );
  }, []);

  const moveWidget = useCallback((id: WidgetId, direction: "up" | "down") => {
    setDraftLayout((prev) => {
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
    });
  }, []);

  const reorderWidgets = useCallback((newOrderedIds: WidgetId[]) => {
    setDraftLayout((prev) => {
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
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setDraftLayout(DEFAULT_DASHBOARD_LAYOUT);
    if (!isEditing) {
      setLayout(DEFAULT_DASHBOARD_LAYOUT);
      persistToStorage(DEFAULT_DASHBOARD_LAYOUT);
      toast.success("Tata letak dikembalikan ke default.");
    }
  }, [isEditing, persistToStorage]);

  const showAllWidgets = useCallback(() => {
    setDraftLayout((prev) => prev.map((item) => ({ ...item, isVisible: true })));
  }, []);

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
