import { describe, expect, it } from "vitest";
import { formatMoney } from "./formatters";

describe("formatMoney typography and formatting", () => {
  it("formats IDR with clean 'Rp ' space prefix", () => {
    const formatted = formatMoney(20000000, "IDR", "id", false);
    expect(formatted).toMatch(/^Rp\s20\.000\.000/);
  });

  it("formats compact IDR with 'Rp X Jt' and proper spacing", () => {
    const formatted = formatMoney(20000000, "IDR", "id", true);
    expect(formatted).toBe("Rp 20 Jt");
  });

  it("formats compact IDR with decimal places and 'Rp X,X Jt'", () => {
    const formatted = formatMoney(20500000, "IDR", "id", true);
    expect(formatted).toBe("Rp 20,5 Jt");
  });

  it("formats compact IDR billions with 'Rp X M'", () => {
    const formatted = formatMoney(1500000000, "IDR", "id", true);
    expect(formatted).toBe("Rp 1,5 M");
  });

  it("formats compact IDR trillions with 'Rp X T'", () => {
    const formatted = formatMoney(2000000000000, "IDR", "id", true);
    expect(formatted).toBe("Rp 2 T");
  });

  it("formats zero and handles negative values correctly", () => {
    expect(formatMoney(-5000000, "IDR", "id", true)).toBe("-Rp 5 Jt");
    expect(formatMoney(0, "IDR", "id", false)).toMatch(/^Rp\s0/);
  });
});
