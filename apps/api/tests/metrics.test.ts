import { describe, expect, it } from "vitest";
import { calculateMetrics } from "../src/utils/metrics";

describe("calculateMetrics", () => {
  it("handles zero time", () => {
    const metrics = calculateMetrics("abc", "abc", 0, 1000);
    expect(metrics.wpm).toBe(0);
    expect(metrics.netWpm).toBe(0);
  });

  it("handles empty target", () => {
    const metrics = calculateMetrics("", "hello", 30000, 1000);
    expect(metrics.accuracy).toBe(0);
  });

  it("computes accuracy for mismatched text", () => {
    const metrics = calculateMetrics("hello", "hxllo", 60000, 1000);
    expect(metrics.accuracy).toBe(80);
  });
});
