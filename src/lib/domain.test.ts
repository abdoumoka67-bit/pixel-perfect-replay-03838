import { describe, expect, it } from "vitest";
import { cnamePointsToTarget } from "./domain.functions";

describe("cnamePointsToTarget", () => {
  it("accepts CNAME pointing to cname.oranix.co (trailing dot)", () => {
    expect(cnamePointsToTarget([{ data: "cname.oranix.co." }], "cname.oranix.co")).toBe(true);
  });
  it("rejects other targets", () => {
    expect(cnamePointsToTarget([{ data: "other.host.com." }], "cname.oranix.co")).toBe(false);
    expect(cnamePointsToTarget(undefined, "cname.oranix.co")).toBe(false);
  });
});
