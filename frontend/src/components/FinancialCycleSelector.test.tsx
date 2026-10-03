import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FinancialCycleSelector } from "./FinancialCycleSelector";
import { FinancialCycleBanner } from "./FinancialCycleBanner";
import { createInitialState } from "@/lib/localDb";

describe("FinancialCycleSelector", () => {
  it("renders quick presets and live preview card", () => {
    const html = renderToStaticMarkup(
      <FinancialCycleSelector value={25} onChange={vi.fn()} locale="id" />,
    );

    expect(html).toContain("data-testid=\"financial-cycle-selector\"");
    expect(html).toContain("data-testid=\"cycle-preset-button-1\"");
    expect(html).toContain("data-testid=\"cycle-preset-button-25\"");
    expect(html).toContain("data-testid=\"cycle-preset-button-28\"");
    expect(html).toContain("data-testid=\"cycle-preset-button--1\"");
    expect(html).toContain("data-testid=\"cycle-live-preview-card\"");
    expect(html).toContain("Gajian Tgl 25");
  });

  it("renders custom day grid and stepper when in custom mode", () => {
    // Custom day 15 is not a default preset (1, 25, 28)
    const html = renderToStaticMarkup(
      <FinancialCycleSelector value={15} onChange={vi.fn()} locale="id" />,
    );

    expect(html).toContain("data-testid=\"cycle-day-custom-input\"");
    expect(html).toContain("data-testid=\"cycle-day-decrement\"");
    expect(html).toContain("data-testid=\"cycle-day-increment\"");
    expect(html).toContain("data-testid=\"cycle-grid-day-15\"");
    expect(html).toContain("data-testid=\"cycle-grid-day-1\"");
    expect(html).toContain("data-testid=\"cycle-grid-day-31\"");
  });
});

describe("FinancialCycleBanner", () => {
  it("renders active cycle banner with change button", () => {
    const state = createInitialState();
    state.customCycleDay = 25;

    const html = renderToStaticMarkup(
      <FinancialCycleBanner state={state} onOpenEditCycle={vi.fn()} />,
    );

    expect(html).toContain("data-testid=\"cycle-banner-card\"");
    expect(html).toContain("data-testid=\"cycle-banner-edit-button\"");
    expect(html).toContain("Gajian Tgl 25");
    expect(html).toContain("Ubah");
  });
});
