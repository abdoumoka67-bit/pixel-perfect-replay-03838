import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiLanguageProvider } from "@/lib/ui-i18n";
import { AttributionLine } from "./AttributionLine";

function renderLine(value: unknown, language: "ar" | "en" | "fr" = "ar") {
  return render(
    <UiLanguageProvider language={language}>
      <AttributionLine value={value} />
    </UiLanguageProvider>,
  );
}

describe("AttributionLine", () => {
  it("shows the ad source and campaign stored on the order", () => {
    const { container } = renderLine({ source: "facebook", campaign: "sept" }, "en");
    expect(screen.getByText("Order source")).toBeInTheDocument();
    expect(screen.getByText("facebook · sept")).toBeInTheDocument();
    // Meta sources get the Facebook blue dot.
    expect(container.querySelector(".bg-\\[\\#1877F2\\]")).toBeTruthy();
  });

  it("colours a TikTok source with the TikTok red", () => {
    const { container } = renderLine({ source: "tiktok", campaign: "videos" }, "en");
    expect(screen.getByText("tiktok · videos")).toBeInTheDocument();
    expect(container.querySelector(".bg-\\[\\#FE2C55\\]")).toBeTruthy();
  });

  it("falls back to a direct visit when the order has no attribution", () => {
    renderLine(null, "en");
    expect(screen.getByText("Direct visit")).toBeInTheDocument();
  });

  it("ignores unknown keys coming from the jsonb column", () => {
    renderLine({ source: "instagram", evil: "x" }, "en");
    expect(screen.getByText("instagram")).toBeInTheDocument();
    expect(screen.queryByText(/evil/)).toBeNull();
  });
});
