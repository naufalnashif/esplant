import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingModal } from "./OnboardingModal";
import { createInitialState } from "@/lib/localDb";

// Provide dummy document for SSR testing
if (typeof globalThis.document === "undefined") {
  (globalThis as any).document = {
    body: { style: {} },
  };
}

// Mock createPortal to render children directly for SSR testing
vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe("OnboardingModal", () => {
  it("renders Step 1 with name input and next button", () => {
    const state = createInitialState();
    const html = renderToStaticMarkup(
      <OnboardingModal state={state} onComplete={vi.fn()} />,
    );

    expect(html).toContain("data-testid=\"onboarding-modal\"");
    expect(html).toContain("data-testid=\"onboarding-name-input\"");
    expect(html).toContain("data-testid=\"onboarding-next-button\"");
    expect(html).toContain("Siapa nama panggilan Anda?");
  });

  it("renders in English when locale is en", () => {
    const state = createInitialState();
    state.locale = "en";
    const html = renderToStaticMarkup(
      <OnboardingModal state={state} onComplete={vi.fn()} />,
    );

    expect(html).toContain("What should we call you?");
    expect(html).toContain("Step 1 of 2");
  });
});
