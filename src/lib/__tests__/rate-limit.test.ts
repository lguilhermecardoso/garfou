import { describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests until the limit and blocks afterwards", () => {
    const key = `test-limit-${Math.random()}`;

    const first = checkRateLimit({ key, limit: 2, windowMs: 60_000 });
    const second = checkRateLimit({ key, limit: 2, windowMs: 60_000 });
    const third = checkRateLimit({ key, limit: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets after the configured window", () => {
    const key = `test-reset-${Math.random()}`;
    const nowSpy = vi.spyOn(Date, "now");

    nowSpy.mockReturnValue(1_000);
    const first = checkRateLimit({ key, limit: 1, windowMs: 1_000 });
    const blocked = checkRateLimit({ key, limit: 1, windowMs: 1_000 });

    nowSpy.mockReturnValue(2_001);
    const afterWindow = checkRateLimit({ key, limit: 1, windowMs: 1_000 });

    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(afterWindow.allowed).toBe(true);

    nowSpy.mockRestore();
  });
});
