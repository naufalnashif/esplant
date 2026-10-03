import type { Currency, Locale, Transaction } from "./localDb";

export interface SpendingBundleItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency?: Currency;
  accountId?: string;
  tags?: string[];
}

export interface SpendingBundle {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  items: SpendingBundleItem[];
  createdDate: string;
}

/**
 * Returns default spending bundle templates tailored for initial setup.
 */
export function createDefaultBundles(locale: Locale = "id"): SpendingBundle[] {
  const isId = locale === "id";
  return [
    {
      id: "bundle-essentials",
      name: isId ? "Kebutuhan Pokok Bulanan" : "Monthly Living Essentials",
      description: isId
        ? "Paket pengeluaran rutin awal bulan: tagihan listrik, internet, dan stok belanja."
        : "Routine start-of-month expenses: electricity, internet, and groceries.",
      color: "#ffa116",
      createdDate: new Date().toISOString().slice(0, 10),
      items: [
        {
          id: "item-1",
          description: isId ? "Listrik PLN & Token" : "Electricity Bill / Token",
          category: "Utilities",
          amount: 250_000,
          currency: "IDR",
          tags: ["rutin", "utilities"],
        },
        {
          id: "item-2",
          description: isId ? "Wifi Internet Rumah" : "Home Internet / Wifi",
          category: "Utilities",
          amount: 350_000,
          currency: "IDR",
          tags: ["rutin", "internet"],
        },
        {
          id: "item-3",
          description: isId ? "Belanja Bahan Pokok & Supermarket" : "Monthly Groceries",
          category: "Food",
          amount: 750_000,
          currency: "IDR",
          tags: ["sembako", "groceries"],
        },
      ],
    },
    {
      id: "bundle-subscriptions",
      name: isId ? "Langganan Digital" : "Digital Subscriptions",
      description: isId
        ? "Hiburan, musik, dan penyimpanan cloud."
        : "Entertainment, music, and cloud storage subscriptions.",
      color: "#60a5fa",
      createdDate: new Date().toISOString().slice(0, 10),
      items: [
        {
          id: "sub-1",
          description: isId ? "Streaming Film & Hiburan" : "Video Streaming",
          category: "Lifestyle",
          amount: 186_000,
          currency: "IDR",
          tags: ["subscription", "streaming"],
        },
        {
          id: "sub-2",
          description: isId ? "Cloud Backup & Storage" : "Cloud Storage Subscription",
          category: "Utilities",
          amount: 45_000,
          currency: "IDR",
          tags: ["subscription", "cloud"],
        },
      ],
    },
  ];
}

/**
 * Calculates total nominal of a bundle.
 */
export function calculateBundleTotal(bundle: SpendingBundle): number {
  return bundle.items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
}

/**
 * Generates an array of Transaction objects ready to be prepended to the finance state.
 */
export function generateBundleTransactions(
  bundle: SpendingBundle,
  targetDate: string,
  defaultAccountId: string,
  rates: Record<Currency, number> = { IDR: 1, USD: 16250, EUR: 17600, SGD: 12100, MYR: 3800, JPY: 108, AUD: 10600 },
  baseCurrency: Currency = "IDR",
): Transaction[] {
  const bundleSlug = bundle.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const now = Date.now();

  return bundle.items.map((item, idx) => {
    const currency = item.currency || baseCurrency;
    const rate = rates[currency] || 1;
    const baseAmount = item.amount * rate;
    const txId = `tx-bundle-${bundle.id}-${idx + 1}-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const tags = Array.from(new Set([...(item.tags || []), "bundle", `bundle:${bundleSlug}`]));

    return {
      id: txId,
      kind: "expense",
      date: targetDate || new Date().toISOString().slice(0, 10),
      description: item.description,
      category: item.category || "Lifestyle",
      accountId: item.accountId || defaultAccountId,
      amount: item.amount,
      currency,
      baseAmount,
      tags,
    };
  });
}
