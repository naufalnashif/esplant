import { describe, expect, it } from "vitest";
import { createInitialState } from "./localDb";
import {
  evaluateNotificationRules,
  formatRelativeTime,
  type AppNotification,
} from "./notifications";

describe("Notification rule engine", () => {
  it("generates bill_due notification when a bill is due in <= 3 days", () => {
    const state = createInitialState();
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    state.bills.push({
      id: "bill-wifi",
      name: "IndiHome Fiber",
      category: "Utilities",
      amount: 450_000,
      currency: "IDR",
      frequency: "monthly",
      nextDueDate: twoDaysLater,
      active: true,
    });

    const { notifications, newlyAddedCount } = evaluateNotificationRules(state, []);
    expect(newlyAddedCount).toBe(1);
    const billNotif = notifications.find((n) => n.id.startsWith("bill-due-bill-wifi"));
    expect(billNotif).toBeDefined();
    expect(billNotif?.type).toBe("bill_due");
    expect(billNotif?.title).toContain("Tagihan");
    expect(billNotif?.actionTarget?.tab).toBe("commitments");
    expect(billNotif?.actionTarget?.targetId).toBe("bill-wifi");
  });

  it("generates anomaly notification when today's spending exceeds 2.2x historical daily baseline", () => {
    const state = createInitialState();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Past 3 days: daily average ~ Rp 50.000
    state.transactions.push(
      {
        id: "tx-1",
        kind: "expense",
        date: "2026-09-01",
        description: "Makan siang",
        category: "Food",
        accountId: "acc-cash",
        amount: 50_000,
        currency: "IDR",
        baseAmount: 50_000,
        tags: [],
      },
      {
        id: "tx-2",
        kind: "expense",
        date: "2026-09-02",
        description: "Bensin",
        category: "Transport",
        accountId: "acc-cash",
        amount: 50_000,
        currency: "IDR",
        baseAmount: 50_000,
        tags: [],
      },
      {
        id: "tx-3",
        kind: "expense",
        date: "2026-09-03",
        description: "Kopi",
        category: "Food",
        accountId: "acc-cash",
        amount: 50_000,
        currency: "IDR",
        baseAmount: 50_000,
        tags: [],
      },
      // Today: Rp 500.000 (10x average)
      {
        id: "tx-today",
        kind: "expense",
        date: todayStr,
        description: "Belanja elektronik",
        category: "Lifestyle",
        accountId: "acc-cash",
        amount: 500_000,
        currency: "IDR",
        baseAmount: 500_000,
        tags: [],
      },
    );

    const { notifications } = evaluateNotificationRules(state, []);
    const anomalyNotif = notifications.find((n) => n.type === "anomaly");
    expect(anomalyNotif).toBeDefined();
    expect(anomalyNotif?.priority).toBe("high");
    expect(anomalyNotif?.title).toContain("Peringatan");
    expect(anomalyNotif?.actionTarget?.tab).toBe("transactions");
  });

  it("preserves read status of already seen notifications", () => {
    const state = createInitialState();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    state.bills.push({
      id: "bill-electric",
      name: "Listrik PLN",
      category: "Utilities",
      amount: 300_000,
      currency: "IDR",
      frequency: "monthly",
      nextDueDate: tomorrow,
      active: true,
    });

    const currentMonth = tomorrow.slice(0, 7);
    const existing: AppNotification[] = [
      {
        id: `bill-due-bill-electric-${currentMonth}`,
        type: "bill_due",
        title: "Old title",
        message: "Old msg",
        timestamp: 1700000000000,
        read: true,
        priority: "high",
      },
    ];

    const { notifications, newlyAddedCount } = evaluateNotificationRules(state, existing);
    expect(newlyAddedCount).toBe(0);
    const item = notifications.find((n) => n.id === `bill-due-bill-electric-${currentMonth}`);
    expect(item?.read).toBe(true);
    expect(item?.timestamp).toBe(1700000000000);
  });
});

describe("Relative time formatter", () => {
  it("formats relative timestamps accurately in id and en", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10_000, "id")).toBe("Baru saja");
    expect(formatRelativeTime(now - 10_000, "en")).toBe("Just now");

    expect(formatRelativeTime(now - 5 * 60 * 1000, "id")).toBe("5 mnt lalu");
    expect(formatRelativeTime(now - 5 * 60 * 1000, "en")).toBe("5m ago");

    expect(formatRelativeTime(now - 3 * 3600 * 1000, "id")).toBe("3 jam lalu");
    expect(formatRelativeTime(now - 3 * 3600 * 1000, "en")).toBe("3h ago");

    expect(formatRelativeTime(now - 25 * 3600 * 1000, "id")).toBe("Kemarin");
    expect(formatRelativeTime(now - 25 * 3600 * 1000, "en")).toBe("Yesterday");
  });
});

describe("System update and pushStoredNotification", () => {
  it("preserves system_update notifications during rule evaluation", () => {
    const state = createInitialState();
    const existing: AppNotification[] = [
      {
        id: "version-2.1.0",
        type: "system_update",
        title: "Update v2.1.0",
        message: "Perbaikan dan fitur baru",
        timestamp: Date.now(),
        read: false,
        priority: "normal",
      },
    ];

    const { notifications } = evaluateNotificationRules(state, existing);
    const updateNotif = notifications.find((n) => n.id === "version-2.1.0");
    expect(updateNotif).toBeDefined();
    expect(updateNotif?.type).toBe("system_update");
    expect(updateNotif?.read).toBe(false);
  });
});

