export type DesktopColSpan = 4 | 5 | 6 | 7 | 8 | 12;

export type WidgetId =
  | "hero_balance"
  | "cashflow_trend"
  | "quick_filters"
  | "financial_summary"
  | "payday_status"
  | "upcoming_bills"
  | "category_comparison"
  | "recent_transactions"
  | "spending_allocation"
  | "budget_guardrails";

export interface WidgetLayoutItem {
  id: WidgetId;
  titleKey: string;
  isVisible: boolean;
  order: number;
  desktopColSpan: DesktopColSpan;
  minColSpan?: DesktopColSpan;
}

export interface DashboardLayoutConfig {
  version: 1;
  widgets: WidgetLayoutItem[];
  lastModified?: string;
}

export const DASHBOARD_STORAGE_KEY = "dashboard_layout_preferences_v1";

export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutItem[] = [
  {
    id: "hero_balance",
    titleKey: "totalBalance",
    isVisible: true,
    order: 1,
    desktopColSpan: 7,
    minColSpan: 4,
  },
  {
    id: "quick_filters",
    titleKey: "filterPeriod",
    isVisible: true,
    order: 2,
    desktopColSpan: 12,
    minColSpan: 6,
  },
  {
    id: "financial_summary",
    titleKey: "financialSummary",
    isVisible: true,
    order: 3,
    desktopColSpan: 12,
    minColSpan: 6,
  },
  {
    id: "cashflow_trend",
    titleKey: "cashFlow",
    isVisible: true,
    order: 4,
    desktopColSpan: 6,
    minColSpan: 4,
  },
  {
    id: "category_comparison",
    titleKey: "spendingComparison",
    isVisible: true,
    order: 5,
    desktopColSpan: 6,
    minColSpan: 4,
  },
  {
    id: "spending_allocation",
    titleKey: "spendingAllocation",
    isVisible: true,
    order: 6,
    desktopColSpan: 6,
    minColSpan: 4,
  },
  {
    id: "upcoming_bills",
    titleKey: "dueSoon",
    isVisible: true,
    order: 7,
    desktopColSpan: 6,
    minColSpan: 4,
  },
  {
    id: "recent_transactions",
    titleKey: "recentActivity",
    isVisible: true,
    order: 8,
    desktopColSpan: 6,
    minColSpan: 4,
  },
  {
    id: "budget_guardrails",
    titleKey: "budgets",
    isVisible: true,
    order: 9,
    desktopColSpan: 12,
    minColSpan: 6,
  },
  {
    id: "payday_status",
    titleKey: "paydayCycle",
    isVisible: true,
    order: 10,
    desktopColSpan: 12,
    minColSpan: 4,
  },
];

export const VALID_WIDGET_IDS: ReadonlySet<string> = new Set<WidgetId>([
  "hero_balance",
  "cashflow_trend",
  "quick_filters",
  "financial_summary",
  "payday_status",
  "upcoming_bills",
  "category_comparison",
  "recent_transactions",
  "spending_allocation",
  "budget_guardrails",
]);

export const VALID_COL_SPANS: ReadonlySet<number> = new Set<DesktopColSpan>([4, 5, 6, 7, 8, 12]);

/**
 * Validasi dan sanitasi ketat untuk payload LocalStorage.
 * Menghindari runtime crash akibat data corrupt, XSS, atau schema version mismatch.
 */
export function sanitizeDashboardLayout(raw: unknown): WidgetLayoutItem[] {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_DASHBOARD_LAYOUT;
  }

  let itemsCandidate: unknown = raw;
  if ("version" in raw && "widgets" in raw) {
    const config = raw as { version: unknown; widgets: unknown };
    if (config.version !== 1 || !Array.isArray(config.widgets)) {
      return DEFAULT_DASHBOARD_LAYOUT;
    }
    itemsCandidate = config.widgets;
  }

  if (!Array.isArray(itemsCandidate)) {
    return DEFAULT_DASHBOARD_LAYOUT;
  }

  const validItems: WidgetLayoutItem[] = [];
  const seenIds = new Set<string>();

  for (const item of itemsCandidate) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Partial<WidgetLayoutItem>;

    if (typeof entry.id !== "string" || !VALID_WIDGET_IDS.has(entry.id)) {
      continue;
    }

    if (seenIds.has(entry.id)) {
      continue;
    }
    seenIds.add(entry.id);

    const defaultMatch = DEFAULT_DASHBOARD_LAYOUT.find((d) => d.id === entry.id);

    const isVisible = typeof entry.isVisible === "boolean" ? entry.isVisible : (defaultMatch?.isVisible ?? true);
    const order = typeof entry.order === "number" && Number.isFinite(entry.order) ? Math.round(entry.order) : (defaultMatch?.order ?? validItems.length + 1);
    const desktopColSpan: DesktopColSpan =
      typeof entry.desktopColSpan === "number" && VALID_COL_SPANS.has(entry.desktopColSpan)
        ? (entry.desktopColSpan as DesktopColSpan)
        : (defaultMatch?.desktopColSpan ?? 12);

    validItems.push({
      id: entry.id as WidgetId,
      titleKey: defaultMatch?.titleKey ?? (typeof entry.titleKey === "string" ? entry.titleKey.slice(0, 50) : "Widget"),
      isVisible,
      order,
      desktopColSpan,
      minColSpan: defaultMatch?.minColSpan ?? 4,
    });
  }

  // Lengkapi jika ada widget default yang belum terdaftar di local storage
  for (const defaultItem of DEFAULT_DASHBOARD_LAYOUT) {
    if (!seenIds.has(defaultItem.id)) {
      validItems.push({ ...defaultItem, order: validItems.length + 1 });
      seenIds.add(defaultItem.id);
    }
  }

  return validItems.sort((a, b) => a.order - b.order);
}
