import React, { useState, useEffect, useRef, useTransition } from "react";
import { useNavigate } from "react-router-dom";
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
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";

interface NotificationCenterProps {
  state: FinanceState;
  onNavigate: (tab: "overview" | "transactions" | "commitments" | "goals" | "accounts" | "settings") => void;
  onOpenAddTransaction?: () => void;
  onOpenAddCommitment?: () => void;
}

/** Icon per notification type */
function NotifIcon({ type }: { type: AppNotification["type"] }) {
  switch (type) {
    case "bill_due":
      return <CalendarClock size={16} className="text-amber-400 shrink-0" />;
    case "anomaly":
      return <AlertTriangle size={16} className="text-rose-400 shrink-0" />;
    case "daily_checkin":
      return <Sparkles size={16} className="text-primary shrink-0" />;
    case "system_update":
      return <Sparkles size={16} className="text-emerald-400 shrink-0" />;
    default:
      return <ShieldAlert size={16} className="text-muted-foreground shrink-0" />;
  }
}

/** Shared notification list content — used by both mobile sheet and desktop dropdown */
function NotificationContent({
  notifications,
  filter,
  setFilter,
  unreadCount,
  isId,
  onItemClick,
  onDelete,
  onMarkAllRead,
  onEnableBrowser,
  locale,
}: {
  notifications: AppNotification[];
  filter: "all" | "unread";
  setFilter: (f: "all" | "unread") => void;
  unreadCount: number;
  isId: boolean;
  onItemClick: (item: AppNotification) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onMarkAllRead: () => void;
  onEnableBrowser: () => void;
  locale: Locale;
}) {
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="flex flex-col gap-0">
      {/* Filter pills + mark-all row */}
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="notification-filter-all"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-secondary text-foreground"
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
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            {isId ? "Belum Dibaca" : "Unread"} ({unreadCount})
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            data-testid="mark-all-read-button"
            onClick={onMarkAllRead}
            title={isId ? "Tandai semua dibaca" : "Mark all as read"}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <CheckCheck size={14} className="text-primary" />
            <span>{isId ? "Baca semua" : "Read all"}</span>
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="space-y-2 overscroll-contain">
        {filtered.length === 0 ? (
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
          filtered.map((item) => (
            <div
              key={item.id}
              data-testid={`notification-item-${item.id}`}
              onClick={() => onItemClick(item)}
              className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                item.read
                  ? "border-border/40 bg-card/40 opacity-75 hover:opacity-100 hover:border-border hover:bg-card/70"
                  : "border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 shadow-sm"
              }`}
            >
              <div className="mt-0.5 grid size-8 place-items-center rounded-lg bg-secondary/80 shrink-0">
                <NotifIcon type={item.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-xs font-bold text-foreground truncate pr-2">{item.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground font-medium">
                    {formatRelativeTime(item.timestamp, locale)}
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
                onClick={(e) => onDelete(e, item.id)}
                title={isId ? "Hapus" : "Delete"}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 p-1 transition-opacity cursor-pointer shrink-0"
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

      {/* Browser permission prompt */}
      {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
        <div className="mt-4 pt-3 border-t border-border/60">
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
              onClick={onEnableBrowser}
              className="rounded-lg bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/30 transition-colors shrink-0 cursor-pointer"
            >
              {isId ? "Aktifkan" : "Enable"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationCenter({
  state,
  onNavigate,
  onOpenAddTransaction,
  onOpenAddCommitment,
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isId = state.locale === "id";
  const isMobile = useIsMobile();

  // Load and evaluate notifications on state change
  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await getStoredNotifications();
      const { notifications: evaluated, newlyAddedCount } = evaluateNotificationRules(state, stored);
      if (!alive) return;
      setNotifications(evaluated);
      await saveStoredNotifications(evaluated);

      if (newlyAddedCount > 0) {
        const topHigh = evaluated.find((n) => !n.read && n.priority === "high");
        if (topHigh) {
          sendBrowserNotification(topHigh.title, { body: topHigh.message });
        }
      }
    })();
    return () => { alive = false; };
  }, [state]);

  // Re-read stored notifications if updated externally (e.g. system update announcement)
  useEffect(() => {
    const handleExternalUpdate = () => {
      void (async () => {
        const stored = await getStoredNotifications();
        const { notifications: evaluated } = evaluateNotificationRules(state, stored);
        setNotifications(evaluated);
      })();
    };
    window.addEventListener("selfmanage-notifications-changed", handleExternalUpdate);
    return () => window.removeEventListener("selfmanage-notifications-changed", handleExternalUpdate);
  }, [state]);

  // Click outside listener — desktop only
  useEffect(() => {
    if (!open || isMobile) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isMobile]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const updated = await markAllNotificationsRead(notifications);
    startTransition(() => { setNotifications(updated); });
    toast.success(isId ? "Semua notifikasi ditandai dibaca" : "All notifications marked as read");
  };

  const handleItemClick = async (item: AppNotification) => {
    if (!item.read) {
      const updated = await markNotificationRead(item.id, notifications);
      setNotifications(updated);
    }
    setOpen(false);
    if (item.type === "system_update") {
      navigate("/changelog");
      return;
    }
    if (item.actionTarget) {
      if (item.actionTarget.tab) onNavigate(item.actionTarget.tab);
      if (item.actionTarget.modal === "transaction" && onOpenAddTransaction) onOpenAddTransaction();
      else if (item.actionTarget.modal === "commitment" && onOpenAddCommitment) onOpenAddCommitment();
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
        body: isId ? "Pengingat keuangan Anda akan muncul di perangkat ini." : "Your financial reminders will appear on this device.",
      });
    } else {
      toast.error(isId ? "Izin notifikasi ditolak oleh browser." : "Notification permission denied by browser.");
    }
  };

  /** Bell trigger button — shared between mobile and desktop */
  const bellButton = (
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
  );

  const sharedContentProps = {
    notifications,
    filter,
    setFilter,
    unreadCount,
    isId,
    onItemClick: handleItemClick,
    onDelete: handleDelete,
    onMarkAllRead: handleMarkAllRead,
    onEnableBrowser: handleEnableBrowserNotification,
    locale: state.locale as Locale,
  };

  /* ─── MOBILE: Bell + BottomSheet ─── */
  if (isMobile) {
    return (
      <>
        {bellButton}
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title={isId ? "Notifikasi" : "Notifications"}
          description={
            isId
              ? "Pengingat tagihan & anomali pengeluaran"
              : "Bill reminders & spending anomaly alerts"
          }
          testid="notification-center-sheet"
          maxWidth="sm:max-w-lg"
        >
          <NotificationContent {...sharedContentProps} />
        </BottomSheet>
      </>
    );
  }

  /* ─── DESKTOP: Bell + Dropdown ─── */
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {bellButton}
      {open && (
        <div
          data-testid="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-[380px] max-w-[420px] rounded-2xl border border-border/80 bg-background/95 p-4 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Desktop header */}
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
            <button
              type="button"
              data-testid="close-notification-panel-button"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-3 max-h-[380px] overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin">
            <NotificationContent {...sharedContentProps} />
          </div>
        </div>
      )}
    </div>
  );
}
