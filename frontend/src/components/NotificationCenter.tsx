import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  Bell,
  CalendarClock,
  AlertTriangle,
  Sparkles,
  CheckCheck,
  X,
  Trash2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import type { FinanceState, Locale } from "@/lib/localDb";
import {
  type AppNotification,
  getStoredNotifications,
  saveStoredNotifications,
  evaluateNotificationRules,
  markNotificationRead,
  markAllNotificationsRead,
  deleteStoredNotification,
  formatRelativeTime,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "@/lib/notifications";
import { toast } from "sonner";

interface NotificationCenterProps {
  state: FinanceState;
  onNavigate: (tab: "overview" | "transactions" | "commitments" | "goals" | "accounts" | "settings") => void;
  onOpenAddTransaction?: () => void;
  onOpenAddCommitment?: () => void;
}

export function NotificationCenter({
  state,
  onNavigate,
  onOpenAddTransaction,
  onOpenAddCommitment,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isId = state.locale === "id";

  // Load and evaluate notifications on state change
  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await getStoredNotifications();
      const { notifications: evaluated, newlyAddedCount } = evaluateNotificationRules(state, stored);
      if (!alive) return;
      setNotifications(evaluated);
      await saveStoredNotifications(evaluated);

      // If new high-priority notifications arose, optionally trigger browser notification
      if (newlyAddedCount > 0) {
        const topHigh = evaluated.find((n) => !n.read && n.priority === "high");
        if (topHigh) {
          sendBrowserNotification(topHigh.title, { body: topHigh.message });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [state]);

  // Click outside listener to close dropdown
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const handleMarkAllRead = async () => {
    const updated = await markAllNotificationsRead(notifications);
    startTransition(() => {
      setNotifications(updated);
    });
    toast.success(isId ? "Semua notifikasi ditandai dibaca" : "All notifications marked as read");
  };

  const handleItemClick = async (item: AppNotification) => {
    if (!item.read) {
      const updated = await markNotificationRead(item.id, notifications);
      setNotifications(updated);
    }
    setOpen(false);

    if (item.actionTarget) {
      if (item.actionTarget.tab) {
        onNavigate(item.actionTarget.tab);
      }
      if (item.actionTarget.modal === "transaction" && onOpenAddTransaction) {
        onOpenAddTransaction();
      } else if (item.actionTarget.modal === "commitment" && onOpenAddCommitment) {
        onOpenAddCommitment();
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = await deleteStoredNotification(id, notifications);
    setNotifications(updated);
  };

  const handleEnableBrowserNotification = async () => {
    const perm = await requestBrowserNotificationPermission();
    if (perm === "granted") {
      toast.success(isId ? "Notifikasi browser aktif!" : "Browser notifications enabled!");
      sendBrowserNotification(isId ? "Notifikasi Aktif" : "Notifications Enabled", {
        body: isId
          ? "Pengingat keuangan Anda akan muncul di perangkat ini."
          : "Your financial reminders will appear on this device.",
      });
    } else {
      toast.error(isId ? "Izin notifikasi ditolak oleh browser." : "Notification permission denied by browser.");
    }
  };

  const renderIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "bill_due":
        return <CalendarClock size={16} className="text-amber-400 shrink-0" />;
      case "anomaly":
        return <AlertTriangle size={16} className="text-rose-400 shrink-0" />;
      case "daily_checkin":
        return <Sparkles size={16} className="text-primary shrink-0" />;
      default:
        return <ShieldAlert size={16} className="text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        data-testid="notification-bell-button"
        onClick={() => setOpen((prev) => !prev)}
        title={isId ? "Pusat Notifikasi" : "Notification Center"}
        aria-label="Notifications"
        className={`relative grid size-8 sm:size-9 place-items-center rounded-lg border transition-all cursor-pointer ${
          open
            ? "border-primary bg-primary/10 text-primary shadow-sm"
            : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
        }`}
      >
        <Bell size={17} className={unreadCount > 0 ? "animate-wiggle" : ""} />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge-count"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white shadow-sm ring-2 ring-background animate-pulse-soft"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating / Sliding Drawer */}
      {open && (
        <div
          data-testid="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[420px] rounded-2xl border border-border/80 bg-background/95 p-4 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold text-foreground">
                {isId ? "Notifikasi" : "Notifications"}
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} {isId ? "baru" : "new"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  data-testid="mark-all-read-button"
                  onClick={handleMarkAllRead}
                  title={isId ? "Tandai semua dibaca" : "Mark all as read"}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                >
                  <CheckCheck size={14} className="text-primary" />
                  <span className="hidden sm:inline">{isId ? "Baca semua" : "Read all"}</span>
                </button>
              )}
              <button
                type="button"
                data-testid="close-notification-panel-button"
                onClick={() => setOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-3 pb-2">
            <button
              type="button"
              data-testid="notification-filter-all"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              {isId ? "Semua" : "All"} ({notifications.length})
            </button>
            <button
              type="button"
              data-testid="notification-filter-unread"
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                filter === "unread"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              {isId ? "Belum Dibaca" : "Unread"} ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="mt-1 max-h-[360px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-secondary/60 text-muted-foreground mb-3">
                  <Bell size={22} className="opacity-40" />
                </div>
                <p className="text-xs font-bold text-foreground">
                  {isId ? "Tidak ada notifikasi" : "No notifications"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground max-w-[220px]">
                  {filter === "unread"
                    ? isId
                      ? "Semua notifikasi sudah dibaca."
                      : "All notifications are marked as read."
                    : isId
                    ? "Pengingat tagihan dan anomali spending akan muncul di sini."
                    : "Due bills and spending anomaly alerts will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  data-testid={`notification-item-${item.id}`}
                  onClick={() => void handleItemClick(item)}
                  className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    item.read
                      ? "border-border/40 bg-card/40 opacity-75 hover:opacity-100 hover:border-border hover:bg-card/70"
                      : "border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 shadow-sm"
                  }`}
                >
                  <div className="mt-0.5 grid size-8 place-items-center rounded-lg bg-secondary/80">
                    {renderIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-xs font-bold text-foreground truncate pr-2">
                        {item.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground font-medium">
                        {formatRelativeTime(item.timestamp, state.locale as Locale)}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                      {item.message}
                    </p>
                    {item.actionTarget && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary">
                        <span>{isId ? "Buka detail" : "Open detail"}</span>
                        <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid={`delete-notification-${item.id}`}
                    onClick={(e) => void handleDelete(e, item.id)}
                    title={isId ? "Hapus" : "Delete"}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 p-1 transition-opacity cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                  {!item.read && (
                    <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Browser Permission Prompt Banner */}
          {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 p-2.5">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-primary shrink-0" />
                  <p className="text-[10px] text-muted-foreground">
                    {isId ? "Aktifkan notifikasi browser untuk pengingat tagihan?" : "Enable browser notifications for bill reminders?"}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="enable-browser-notification-button"
                  onClick={handleEnableBrowserNotification}
                  className="rounded-lg bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/30 transition-colors shrink-0 cursor-pointer"
                >
                  {isId ? "Aktifkan" : "Enable"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
