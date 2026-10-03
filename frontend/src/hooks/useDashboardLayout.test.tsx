import { describe, expect, it, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useDashboardLayout } from "./useDashboardLayout";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/types/dashboardLayout";

describe("useDashboardLayout hook logic", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("loads default layout when no storage data exists", () => {
    function TestComponent() {
      const { displayLayout, isEditing } = useDashboardLayout();
      return (
        <div>
          <span data-testid="is-editing">{String(isEditing)}</span>
          <span data-testid="count">{displayLayout.length}</span>
          <span data-testid="first">{displayLayout[0].id}</span>
        </div>
      );
    }

    const html = renderToStaticMarkup(<TestComponent />);
    expect(html).toContain("false");
    expect(html).toContain(String(DEFAULT_DASHBOARD_LAYOUT.length));
    expect(html).toContain("hero_balance");
  });

  it("provides toggleVisibility and moveWidget functions", () => {
    let toggleFn: ((id: any) => void) | null = null;
    let moveFn: ((id: any, dir: "up" | "down") => void) | null = null;

    function TestComponent() {
      const { displayLayout, toggleVisibility, moveWidget } = useDashboardLayout();
      toggleFn = toggleVisibility;
      moveFn = moveWidget;
      return <div>{displayLayout.find((w) => w.id === "hero_balance")?.isVisible ? "HERO_VISIBLE" : "HERO_HIDDEN"}</div>;
    }

    const html1 = renderToStaticMarkup(<TestComponent />);
    expect(html1).toContain("HERO_VISIBLE");
    expect(typeof toggleFn).toBe("function");
    expect(typeof moveFn).toBe("function");
  });
});
