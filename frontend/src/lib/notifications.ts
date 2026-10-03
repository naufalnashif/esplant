import type { FinanceState, Locale } from "./localDb";
import { openDb, STORE_NOTIFICATIONS } from "./localDb";
import { formatMoney } from "./formatters";

export type NotificationType = "bill_due" | "anomaly" | "daily_checkin" | "budget_alert" | "system" | "system_update";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number; // epoch ms
  read: boolean;
  priority: "high" | "medium" | "low" | "normal";
  actionTarget?: {
    tab?: "overview" | "transactions" | "commitments" | "goals" | "accounts" | "settings";
    modal?: "transaction" | "commitment";
    targetId?: string;
  };
}

const NOTIFICATIONS_LS_KEY = "selfmanage-notifications";

/** Appends a notification to storage if not already present by id. */
export async function pushStoredNotification(notification: AppNotification): Promise<AppNotification[]> {
  const current = await getStoredNotifications();
  if (current.some((n) => n.id === notification.id)) {
    return current;
  }
  const updated = [notification, ...current];
  await saveStoredNotifications(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("selfmanage-notifications-changed"));
  }
  return updated;
}

/** Reads all stored notifications from IndexedDB (with localStorage fallback). */
export async function getStoredNotifications(): Promise<AppNotification[]> {
  try {
    const db = await openDb();
    const items = await new Promise<AppNotification[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NOTIFICATIONS, "readonly");
      const store = transaction.objectStore(STORE_NOTIFICATIONS);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as AppNotification[]) || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    try {
      const fallback = localStorage.getItem(NOTIFICATIONS_LS_KEY);
      if (fallback) {
        return (JSON.parse(fallback) as AppNotification[]).sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch {}
  }
  return [];
}

/** Saves all notifications to IndexedDB and mirrors to localStorage. */
export async function saveStoredNotifications(notifications: AppNotification[]): Promise<void> {
  const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);

  try {
    localStorage.setItem(NOTIFICATIONS_LS_KEY, JSON.stringify(sorted));
  } catch {}

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NOTIFICATIONS, "readwrite");
      const store = transaction.objectStore(STORE_NOTIFICATIONS);
      store.clear();
      for (const item of sorted) {
        store.put(item);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch {}
}

/** Helper to mark a single notification as read. */
export async function markNotificationRead(id: string, current: AppNotification[]): Promise<AppNotification[]> {
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  await saveStoredNotifications(updated);
  return updated;
}

/** Helper to mark all notifications as read. */
export async function markAllNotificationsRead(current: AppNotification[]): Promise<AppNotification[]> {
  const updated = current.map((n) => ({ ...n, read: true }));
  await saveStoredNotifications(updated);
  return updated;
}

/** Helper to delete a single notification. */
export async function deleteStoredNotification(id: string, current: AppNotification[]): Promise<AppNotification[]> {
  const updated = current.filter((n) => n.id !== id);
  await saveStoredNotifications(updated);
  return updated;
}

/**
 * Formats a relative timestamp (e.g. "Baru saja", "5 mnt lalu", "2 jam lalu", "Kemarin").
 */
export function formatRelativeTime(timestamp: number, locale: Locale = "id"): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const isId = locale === "id";

  if (diffSec < 60) {
    return isId ? "Baru saja" : "Just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return isId ? `${diffMin} mnt lalu` : `${diffMin}m ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return isId ? `${diffHour} jam lalu` : `${diffHour}h ago`;
  }
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) {
    return isId ? "Kemarin" : "Yesterday";
  }
  if (diffDays < 7) {
    return isId ? `${diffDays} hari lalu` : `${diffDays}d ago`;
  }

  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(isId ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Evaluates in-app notification rules based on current financial state.
 * Preserves the read/unread state of existing notifications.
 */
export function evaluateNotificationRules(
  state: FinanceState,
  existing: AppNotification[],
): { notifications: AppNotification[]; newlyAddedCount: number } {
  const existingMap = new Map<string, AppNotification>();
  for (const item of existing) {
    existingMap.set(item.id, item);
  }

  const generated: AppNotification[] = [];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonth = todayStr.slice(0, 7);
  const isId = state.locale === "id";
  const nowMs = now.getTime();
  let newlyAddedCount = 0;

  // 1. BILL & DEBT DUE ENGINE
  // Check active bills
  for (const bill of state.bills) {
    if (bill.active === false || (bill.remainingInstallments !== undefined && bill.remainingInstallments <= 0)) {
      continue;
    }
    const isPaidThisMonth = bill.lastPaidDate && String(bill.lastPaidDate).slice(0, 7) === currentMonth;
    if (isPaidThisMonth) continue;

    if (bill.nextDueDate) {
      const dueDate = new Date(bill.nextDueDate);
      const diffDays = Math.ceil((dueDate.getTime() - nowMs) / (1000 * 60 * 60 * 24));

      // Trigger if due in 3 days, due today, or overdue up to 7 days
      if (diffDays <= 3 && diffDays >= -7) {
        const id = `bill-due-${bill.id}-${currentMonth}`;
        const existingItem = existingMap.get(id);

        let title = isId ? "Tagihan Jatuh Tempo" : "Bill Due Reminder";
        let message = "";
        const formattedAmount = formatMoney(bill.amount, bill.currency, state.locale);

        if (diffDays < 0) {
          title = isId ? "⚠️ Tagihan Terlewat!" : "⚠️ Bill Overdue!";
          message = isId
            ? `Tagihan "${bill.name}" (${formattedAmount}) sudah lewat jatuh tempo (${bill.nextDueDate}). Segera lunasi.`
            : `Bill "${bill.name}" (${formattedAmount}) is overdue (${bill.nextDueDate}). Please settle.`;
        } else if (diffDays === 0) {
          title = isId ? "Tagihan Jatuh Tempo Hari Ini" : "Bill Due Today";
          message = isId
            ? `Tagihan "${bill.name}" (${formattedAmount}) jatuh tempo HARI INI.`
            : `Bill "${bill.name}" (${formattedAmount}) is due TODAY.`;
        } else {
          message = isId
            ? `Tagihan "${bill.name}" (${formattedAmount}) akan jatuh tempo dalam ${diffDays} hari (${bill.nextDueDate}).`
            : `Bill "${bill.name}" (${formattedAmount}) is due in ${diffDays} days (${bill.nextDueDate}).`;
        }

        if (!existingItem) newlyAddedCount++;

        generated.push({
          id,
          type: "bill_due",
          title,
          message,
          timestamp: existingItem?.timestamp ?? nowMs,
          read: existingItem?.read ?? false,
          priority: diffDays <= 0 ? "high" : "medium",
          actionTarget: {
            tab: "commitments",
            targetId: bill.id,
          },
        });
      }
    }
  }

  // Check active debts / receivables
  for (const debt of state.debts) {
    if (debt.paid >= debt.total) continue;
    if (debt.dueDate) {
      const dueDate = new Date(debt.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - nowMs) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3 && diffDays >= -7) {
        const id = `debt-due-${debt.id}-${currentMonth}`;
        const existingItem = existingMap.get(id);
        const remaining = debt.total - debt.paid;
        const formattedAmount = formatMoney(remaining, debt.currency, state.locale);
        const isReceivable = debt.type === "receivable";

        let title = isReceivable
          ? isId ? "Jatuh Tempo Piutang" : "Receivable Due"
          : isId ? "Jatuh Tempo Utang" : "Debt Due";

        let message = "";
        if (diffDays < 0) {
          title = isId ? "⚠️ Komitmen Terlewat" : "⚠️ Commitment Overdue";
          message = isId
            ? `${isReceivable ? "Piutang dari" : "Utang kepada"} ${debt.person} (${formattedAmount}) sudah lewat jatuh tempo.`
            : `${isReceivable ? "Receivable from" : "Debt to"} ${debt.person} (${formattedAmount}) is overdue.`;
        } else if (diffDays === 0) {
          message = isId
            ? `${isReceivable ? "Piutang dari" : "Utang kepada"} ${debt.person} (${formattedAmount}) jatuh tempo hari ini.`
            : `${isReceivable ? "Receivable from" : "Debt to"} ${debt.person} (${formattedAmount}) is due today.`;
        } else {
          message = isId
            ? `${isReceivable ? "Piutang dari" : "Utang kepada"} ${debt.person} (${formattedAmount}) jatuh tempo dalam ${diffDays} hari.`
            : `${isReceivable ? "Receivable from" : "Debt to"} ${debt.person} (${formattedAmount}) is due in ${diffDays} days.`;
        }

        if (!existingItem) newlyAddedCount++;

        generated.push({
          id,
          type: "bill_due",
          title,
          message,
          timestamp: existingItem?.timestamp ?? nowMs,
          read: existingItem?.read ?? false,
          priority: diffDays <= 0 ? "high" : "medium",
          actionTarget: {
            tab: "commitments",
            targetId: debt.id,
          },
        });
      }
    }
  }

  // 2. SPENDING ANOMALY DETECTION ENGINE
  // Calculate rolling daily average strictly from past days (t < today)
  const pastExpenses = state.transactions.filter(
    (t) => t.kind === "expense" && t.date < todayStr,
  );

  if (pastExpenses.length > 0) {
    const datesWithExpense = new Set(pastExpenses.map((t) => t.date));
    const totalPastBaseExpense = pastExpenses.reduce((sum, t) => sum + (t.baseAmount || t.amount), 0);
    const rollingAvgDailyExpense = totalPastBaseExpense / Math.max(1, datesWithExpense.size);

    // Calculate today's spending
    const todayExpenses = state.transactions.filter(
      (t) => t.kind === "expense" && t.date === todayStr,
    );
    const todayTotalBaseExpense = todayExpenses.reduce((sum, t) => sum + (t.baseAmount || t.amount), 0);

    // Anomaly condition: today's spending exceeds 2.2x rolling daily average and is >= 150,000 IDR base
    if (
      todayTotalBaseExpense > rollingAvgDailyExpense * 2.2 &&
      todayTotalBaseExpense >= 150_000 &&
      datesWithExpense.size >= 3 // only trigger if we have at least 3 days of baseline
    ) {
      const id = `anomaly-spend-${todayStr}`;
      const existingItem = existingMap.get(id);

      const formattedToday = formatMoney(todayTotalBaseExpense, state.baseCurrency, state.locale);
      const formattedAvg = formatMoney(rollingAvgDailyExpense, state.baseCurrency, state.locale);

      if (!existingItem) newlyAddedCount++;

      generated.push({
        id,
        type: "anomaly",
        title: isId ? "Peringatan Lonjakan Pengeluaran" : "Spending Surge Alert",
        message: isId
          ? `Pengeluaran hari ini (${formattedToday}) melebihi 2x rata-rata harian (${formattedAvg}). Cek rincian transaksi Anda.`
          : `Today's spending (${formattedToday}) is more than 2x your daily average (${formattedAvg}). Review your expenses.`,
        timestamp: existingItem?.timestamp ?? nowMs,
        read: existingItem?.read ?? false,
        priority: "high",
        actionTarget: {
          tab: "transactions",
        },
      });
    }
  }

  // 3. DAILY CHECK-IN REMINDER ENGINE
  // Trigger after 17:00 (5 PM) if no transactions have been logged today
  const currentHour = now.getHours();
  if (currentHour >= 17) {
    const hasTodayTransactions = state.transactions.some((t) => t.date === todayStr);
    if (!hasTodayTransactions && state.transactions.length > 0) {
      const id = `daily-checkin-${todayStr}`;
      const existingItem = existingMap.get(id);

      if (!existingItem) newlyAddedCount++;

      generated.push({
        id,
        type: "daily_checkin",
        title: isId ? "Catat Pengeluaran Hari Ini" : "Daily Check-in",
        message: isId
          ? "Belum ada transaksi tercatat hari ini. Jangan lupa mencatat pengeluaran harian agar catatan keuangan Anda tetap akurat!"
          : "No transactions recorded yet today. Keep your financial records up to date!",
        timestamp: existingItem?.timestamp ?? nowMs,
        read: existingItem?.read ?? false,
        priority: "low",
        actionTarget: {
          tab: "transactions",
          modal: "transaction",
        },
      });
    }
  }

  // Combine with any previously existing manual/system notifications not superseded
  for (const [id, item] of existingMap.entries()) {
    if (!generated.some((g) => g.id === id)) {
      // Keep old notifications within 30 days
      if (nowMs - item.timestamp < 30 * 24 * 60 * 60 * 1000) {
        generated.push(item);
      }
    }
  }

  const sorted = generated.sort((a, b) => b.timestamp - a.timestamp);
  return { notifications: sorted, newlyAddedCount };
}

/** Local Notification API helper for desktop / standalone PWA mode. */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== "undefined" && "Notification" in window) {
    return await Notification.requestPermission();
  }
  return "denied";
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        ...options,
      });
    } catch {}
  }
}
