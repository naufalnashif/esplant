import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardWidgetContainer } from "./DashboardWidgetContainer";

describe("DashboardWidgetContainer", () => {
  it("renders children in normal mode", () => {
    const html = renderToStaticMarkup(
      <DashboardWidgetContainer
        id="hero_balance"
        title="Total Saldo"
        isVisible={true}
        isEditing={false}
        colSpan={6}
      >
        <div data-testid="widget-child">Widget Child Content</div>
      </DashboardWidgetContainer>
    );

    expect(html).toContain("Widget Child Content");
    expect(html).not.toContain("widget-edit-toolbar");
    expect(html).toContain("md:col-span-6");
  });

  it("returns empty string when isVisible is false and isEditing is false", () => {
    const html = renderToStaticMarkup(
      <DashboardWidgetContainer
        id="hero_balance"
        title="Total Saldo"
        isVisible={false}
        isEditing={false}
        colSpan={6}
      >
        <div data-testid="widget-child">Widget Child Content</div>
      </DashboardWidgetContainer>
    );

    expect(html).toBe("");
  });

  it("renders toolbar in edit mode with size selector and reorder buttons", () => {
    const html = renderToStaticMarkup(
      <DashboardWidgetContainer
        id="hero_balance"
        title="Total Saldo"
        isVisible={true}
        isEditing={true}
        colSpan={6}
        onColSpanChange={() => {}}
        onToggleVisibility={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
      >
        <div>Widget Child</div>
      </DashboardWidgetContainer>
    );

    expect(html).toContain("widget-edit-toolbar-hero_balance");
    expect(html).toContain("Total Saldo");
    expect(html).toContain("widget-size-hero_balance-4");
    expect(html).toContain("widget-size-hero_balance-8");
    expect(html).toContain("widget-move-up-hero_balance");
    expect(html).toContain("widget-move-down-hero_balance");
  });
});
