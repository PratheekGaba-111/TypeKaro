import { describe, expect, it } from "vitest";
import { calculateMetrics, editDistance } from "./metrics";

describe("editDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(editDistance("test", "test")).toBe(0);
  });

  it("counts insert, delete, replace operations", () => {
    expect(editDistance("abc", "abxc")).toBe(1);
    expect(editDistance("abcd", "abc")).toBe(1);
    expect(editDistance("abc", "axc")).toBe(1);
  });
});

describe("calculateMetrics", () => {
  it("returns perfect accuracy for exact match", () => {
    const metrics = calculateMetrics("hello", "hello", 60000, 0);
    expect(metrics.accuracy).toBe(100);
    expect(metrics.netWpm).toBeCloseTo(metrics.wpm, 2);
  });

  it("penalizes accuracy and net WPM for errors", () => {
    const metrics = calculateMetrics("abc", "abxc", 60000, 0);
    expect(metrics.accuracy).toBeCloseTo(66.67, 2);
    expect(metrics.netWpm).toBe(0);
  });

  it("handles zero time safely", () => {
    const metrics = calculateMetrics("abc", "abc", 0, 0);
    expect(metrics.wpm).toBe(0);
    expect(metrics.netWpm).toBe(0);
  });

  it("handles empty target text", () => {
    const metrics = calculateMetrics("", "abc", 60000, 0);
    expect(metrics.accuracy).toBe(0);
  });
});
