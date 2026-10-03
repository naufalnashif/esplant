import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getUnseenVersion, markVersionSeen, CHANGELOG } from "./version";
import { pushStoredNotification, type AppNotification } from "./notifications";

/**
 * Hook that checks if the user has seen the current application version.
 * If unseen:
 * 1. Shows a prominent toast with a quick action to view the changelog.
 * 2. Emits an in-app notification entry (type: "system_update") to the NotificationCenter.
 * 3. Marks the current version as seen in localStorage.
 */
export function useAppVersionCheck(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const unseen = getUnseenVersion();
    if (!unseen) return;

    const entry = CHANGELOG[0];
    const summary = entry?.summary ?? `_self.manage telah diperbarui ke v${unseen}`;

    // 1. Interactive toast notification
    toast.info(`Diperbarui ke v${unseen}: ${summary}`, {
      duration: 8000,
      action: {
        label: "Lihat",
        onClick: () => navigate("/changelog"),
      },
    });

    // 2. Push to persistent NotificationCenter
    const updateNotification: AppNotification = {
      id: `version-${unseen}`,
      type: "system_update",
      title: `Update v${unseen}`,
      message: summary,
      timestamp: Date.now(),
      read: false,
      priority: "normal",
    };

    void pushStoredNotification(updateNotification);

    // 3. Mark version as seen
    markVersionSeen();
  }, [navigate]);
}
