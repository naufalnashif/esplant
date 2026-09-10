import type { Currency, Locale } from "./localDb";

/**
 * Formats monetary amounts with precise compact formatting (e.g. 1.400.000 -> "Rp 1,4 Juta")
 * so no significant digits are lost due to coarse rounding.
 */
export const formatMoney = (
  value: number,
  currency: Currency = "IDR",
  locale: Locale = "id",
  compact = false
): string => {
  if (!Number.isFinite(value)) return "0";

  const isId = locale === "id";

  if (compact && Math.abs(value) >= 1_000_000) {
    const absVal = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    const prefix = currency === "IDR" ? "Rp " : "";

    if (absVal >= 1_000_000_000_000) {
      const num = absVal / 1_000_000_000_000;
      const formattedNum = num.toLocaleString(isId ? "id-ID" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return `${sign}${prefix}${formattedNum} ${isId ? "Triliun" : "T"}`;
    }

    if (absVal >= 1_000_000_000) {
      const num = absVal / 1_000_000_000;
      const formattedNum = num.toLocaleString(isId ? "id-ID" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return `${sign}${prefix}${formattedNum} ${isId ? "Miliar" : "B"}`;
    }

    if (absVal >= 1_000_000) {
      const num = absVal / 1_000_000;
      const formattedNum = num.toLocaleString(isId ? "id-ID" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return `${sign}${prefix}${formattedNum} ${isId ? "Juta" : "M"}`;
    }
  }

  return new Intl.NumberFormat(isId ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(value);
};
