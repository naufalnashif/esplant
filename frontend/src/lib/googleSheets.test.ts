import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_KEY = "selfmanage-google-token";
const store: Record<string, string> = {};

const sessionStorageStub = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
};

const loadModule = async () => {
  store[TOKEN_KEY] = JSON.stringify({ access_token: "test-token", expires_at: Date.now() + 3_600_000 });
  vi.stubGlobal("sessionStorage", sessionStorageStub);
  vi.stubGlobal("navigator", { onLine: true });
  vi.resetModules();
  return import("./googleSheets");
};

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe("spreadsheet id parsing", () => {
  it("accepts full urls and bare ids", async () => {
    const { extractSpreadsheetId } = await loadModule();
    expect(extractSpreadsheetId("https://docs.google.com/spreadsheets/d/ABC-123_x/edit#gid=0")).toBe("ABC-123_x");
    expect(extractSpreadsheetId("  ABC-123_x  ")).toBe("ABC-123_x");
  });
});

describe("state <-> rows mapping", () => {
  it("survives a round trip with real records", async () => {
    const { stateToRows, rowsToState } = await loadModule();
    const { createInitialState } = await import("./localDb");

    const state = createInitialState();
    state.profileName = "Rangga";
    state.accounts = [
      { id: "acc-1", name: "BCA", type: "debit", brand: "BCA", balance: 1_500_000, currency: "IDR", openingBalance: 1_000_000 },
    ];
    state.transactions = [
      {
        id: "tx-1", kind: "expense", date: "2026-06-01", description: "Kopi", category: "Food",
        accountId: "acc-1", amount: 25_000, currency: "IDR", baseAmount: 25_000, tags: ["cafe", "pagi"],
      },
      {
        id: "tx-2", kind: "income", date: "2026-06-02", description: "Gaji", category: "Salary",
        accountId: "acc-1", amount: 9_000_000, currency: "IDR", baseAmount: 9_000_000, tags: [],
      },
    ];
    state.budgets = [{ id: "b-1", category: "Food", limit: 1_200_000, currency: "IDR" }];

    const back = rowsToState(stateToRows(state));

    expect(back.profileName).toBe("Rangga");
    expect(back.accounts).toHaveLength(1);
    expect(back.accounts[0]).toMatchObject({ id: "acc-1", name: "BCA", balance: 1_500_000 });
    expect(back.transactions).toHaveLength(2);
    expect(back.transactions[0]).toMatchObject({ id: "tx-1", kind: "expense", amount: 25_000, tags: ["cafe", "pagi"] });
    expect(back.transactions[1].kind).toBe("income");
    expect(back.budgets[0]).toMatchObject({ category: "Food", limit: 1_200_000 });
  });
});

describe("CRUD requests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes by clearing data rows then batch updating", async () => {
    const { writeState } = await loadModule();
    const { createInitialState } = await import("./localDb");

    const calls: { url: string; body: unknown }[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const state = createInitialState();
    state.transactions = [
      {
        id: "tx-1", kind: "expense", date: "2026-06-01", description: "Kopi", category: "Food",
        accountId: "acc-1", amount: 25_000, currency: "IDR", baseAmount: 25_000, tags: [],
      },
    ];

    await writeState("SHEET1", state);

    expect(calls[0].url).toContain("/SHEET1/values:batchClear");
    expect((calls[0].body as { ranges: string[] }).ranges).toContain("'Transactions'!A2:Z");
    expect(calls[1].url).toContain("/SHEET1/values:batchUpdate");

    const payload = calls[1].body as { valueInputOption: string; data: { range: string; values: string[][] }[] };
    expect(payload.valueInputOption).toBe("RAW");
    const tx = payload.data.find((entry) => entry.range === "'Transactions'!A2");
    expect(tx?.values[0][0]).toBe("tx-1");
    expect(tx?.values[0][3]).toBe("Kopi");
  });

  it("reads every tab in one batchGet and maps the rows back", async () => {
    const { readState } = await loadModule();
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("values:batchGet");
      return jsonResponse({
        valueRanges: [
          { values: [["profileName", "Rangga"]] },
          { values: [["acc-1", "BCA", "debit", "BCA", "1500000", "IDR", "1000000"]] },
          { values: [["tx-1", "expense", "2026-06-01", "Kopi", "Food", "acc-1", "25000", "IDR", "25000", ""]] },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const state = await readState("SHEET1");
    expect(state.profileName).toBe("Rangga");
    expect(state.accounts[0].name).toBe("BCA");
    expect(state.transactions[0]).toMatchObject({ description: "Kopi", amount: 25_000, kind: "expense" });
  });

  it("rebuilds missing tabs when Google reports a bad range", async () => {
    const { readState } = await loadModule();
    let batchGetCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("values:batchGet")) {
        batchGetCalls += 1;
        if (batchGetCalls === 1) return jsonResponse({ error: { message: "Unable to parse range" } }, 400);
        return jsonResponse({ valueRanges: [] });
      }
      if (url.includes("?fields=")) return jsonResponse({ properties: { title: "Sheet" }, sheets: [] });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const state = await readState("SHEET1");
    expect(batchGetCalls).toBe(2);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes(":batchUpdate"))).toBe(true);
    expect(state.transactions).toEqual([]);
  });

  it("creates a spreadsheet with every tab and header", async () => {
    const { createSpreadsheet } = await loadModule();
    let payload: { properties: { title: string }; sheets: { properties: { title: string } }[] } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        payload = JSON.parse(String(init.body));
        return jsonResponse({ spreadsheetId: "NEW1" });
      }),
    );

    const id = await createSpreadsheet("_self.manage — Test");
    expect(id).toBe("NEW1");
    const titles = payload!.sheets.map((sheet) => sheet.properties.title);
    expect(titles).toEqual(["Config", "Accounts", "Transactions", "Bills", "Debts", "Savings", "Wishlist", "Budgets", "Categories"]);
  });

  it("drops the cached token on 401", async () => {
    const { readState, isSignedIn } = await loadModule();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { message: "unauthorized" } }, 401)));

    // Retries once with a fresh token; without a browser there is nothing to renew with.
    await expect(readState("SHEET1")).rejects.toBeTruthy();
    expect(isSignedIn()).toBe(false);
  });
});
