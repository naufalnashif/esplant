import { describe, expect, it } from "vitest";
import {
  createDefaultBundles,
  calculateBundleTotal,
  generateBundleTransactions,
  type SpendingBundle,
} from "./templates";

describe("Spending Bundles & Recurring Templates Engine", () => {
  it("provides localized default templates", () => {
    const bundlesId = createDefaultBundles("id");
    expect(bundlesId.length).toBeGreaterThanOrEqual(2);
    expect(bundlesId[0].name).toContain("Kebutuhan Pokok");

    const bundlesEn = createDefaultBundles("en");
    expect(bundlesEn[0].name).toContain("Essentials");
  });

  it("calculates bundle total sum properly", () => {
    const bundle: SpendingBundle = {
      id: "b1",
      name: "Test Bundle",
      createdDate: "2026-10-01",
      items: [
        { id: "i1", description: "Item 1", category: "Food", amount: 100_000 },
        { id: "i2", description: "Item 2", category: "Utilities", amount: 250_000 },
      ],
    };
    expect(calculateBundleTotal(bundle)).toBe(350_000);
  });

  it("generates valid transaction batch with bundle tags and account attribution", () => {
    const bundle: SpendingBundle = {
      id: "b1",
      name: "Kebutuhan Pokok",
      createdDate: "2026-10-01",
      items: [
        { id: "i1", description: "PLN", category: "Utilities", amount: 200_000 },
        { id: "i2", description: "Wifi", category: "Utilities", amount: 300_000 },
      ],
    };

    const targetDate = "2026-10-03";
    const transactions = generateBundleTransactions(bundle, targetDate, "acc-bca");

    expect(transactions).toHaveLength(2);
    expect(transactions[0].kind).toBe("expense");
    expect(transactions[0].date).toBe("2026-10-03");
    expect(transactions[0].accountId).toBe("acc-bca");
    expect(transactions[0].tags).toContain("bundle");
    expect(transactions[0].tags).toContain("bundle:kebutuhan-pokok");
  });
});
