import { beforeEach, describe, expect, it, vi } from "vitest";

const store: Record<string, string> = {};

const storageStub = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

vi.stubGlobal("localStorage", storageStub);
vi.stubGlobal("navigator", { onLine: true });

describe("Dual-environment storage & Demo isolation", () => {
  beforeEach(() => {
    storageStub.clear();
  });

  it("isolates demo cache from production cache", async () => {
    const { saveLocalState, loadLocalState, createInitialState } = await import("./localDb");

    // 1. Save production state
    const prodState = createInitialState();
    prodState.profileName = "Akun Asli Produksi";
    await saveLocalState(prodState, "production");

    // 2. Save demo sandbox state
    const demoState = createInitialState();
    demoState.profileName = "Demo Sandbox";
    await saveLocalState(demoState, "demo");

    // 3. Verify production state is completely unaffected
    const loadedProd = await loadLocalState("production");
    expect(loadedProd.profileName).toBe("Akun Asli Produksi");

    // 4. Verify demo state is read from its own isolated store
    const loadedDemo = await loadLocalState("demo");
    expect(loadedDemo.profileName).toBe("Demo Sandbox");

    // 5. Verify local storage keys are separate
    expect(JSON.parse(store["nusa-artha-state"]).profileName).toBe("Akun Asli Produksi");
    expect(JSON.parse(store["nusa-artha-state-demo"]).profileName).toBe("Demo Sandbox");
  });

  it("clears demo cache without touching production cache", async () => {
    const { saveLocalState, loadLocalState, clearDemoState, createInitialState } = await import("./localDb");

    const prodState = createInitialState();
    prodState.profileName = "Production User";
    await saveLocalState(prodState, "production");

    const demoState = createInitialState();
    demoState.profileName = "Demo Sandbox User";
    await saveLocalState(demoState, "demo");

    await clearDemoState();

    // Demo store in localStorage should be removed
    expect(store["nusa-artha-state-demo"]).toBeUndefined();
    // Production store must remain 100% intact
    expect(store["nusa-artha-state"]).toBeDefined();
    const prodAfter = await loadLocalState("production");
    expect(prodAfter.profileName).toBe("Production User");
  });

  it("loadFinanceState auto-seeds demo data when demo workspace is empty", async () => {
    const { loadFinanceState } = await import("./dataStore");

    // Loading demo when empty should populate sample data
    const demoLoaded = await loadFinanceState("local", "", true);
    expect(demoLoaded.transactions.length).toBeGreaterThan(0);
    expect(demoLoaded.accounts.length).toBeGreaterThan(0);
    expect(demoLoaded.accounts.some((acc) => acc.name.includes("BCA"))).toBe(true);

    // Production localStorage should still be empty
    expect(store["nusa-artha-state"]).toBeUndefined();
    expect(store["nusa-artha-state-demo"]).toBeDefined();
  });
});
