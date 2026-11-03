import { describe, expect, it } from "vitest";
import { cnamePointsToTarget } from "./domain.functions";

describe("cnamePointsToTarget", () => {
  it("accepts CNAME pointing to cname.oranix.app (trailing dot)", () => {
    expect(cnamePointsToTarget([{ data: "cname.oranix.app." }], "cname.oranix.app")).toBe(true);
  });
  it("rejects other targets", () => {
    expect(cnamePointsToTarget([{ data: "other.host.com." }], "cname.oranix.app")).toBe(false);
    expect(cnamePointsToTarget(undefined, "cname.oranix.app")).toBe(false);
  });
});
