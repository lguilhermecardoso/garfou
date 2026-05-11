import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

describe("getRequestIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });

    expect(getRequestIp(request)).toBe("192.168.1.1");
  });

  it("extracts IP from x-real-ip header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "203.0.113.42" },
    });

    expect(getRequestIp(request)).toBe("203.0.113.42");
  });

  it("returns unknown when no IP headers present", () => {
    const request = new Request("http://localhost");
    expect(getRequestIp(request)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "x-real-ip": "203.0.113.42",
      },
    });

    expect(getRequestIp(request)).toBe("192.168.1.1");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  it("allows first request", () => {
    const key = `test-${Math.random()}`;
    const result = checkRateLimit({ key, limit: 10, windowMs: 60000 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("increments remaining count correctly", () => {
    const key = `test-${Math.random()}`;

    const first = checkRateLimit({ key, limit: 5, windowMs: 60000 });
    const second = checkRateLimit({ key, limit: 5, windowMs: 60000 });
    const third = checkRateLimit({ key, limit: 5, windowMs: 60000 });

    expect(first.remaining).toBe(4);
    expect(second.remaining).toBe(3);
    expect(third.remaining).toBe(2);
  });

  it("blocks when limit exceeded", () => {
    const key = `test-${Math.random()}`;

    checkRateLimit({ key, limit: 2, windowMs: 60000 });
    checkRateLimit({ key, limit: 2, windowMs: 60000 });
    const third = checkRateLimit({ key, limit: 2, windowMs: 60000 });

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("provides retry-after seconds", () => {
    const key = `test-${Math.random()}`;

    checkRateLimit({ key, limit: 1, windowMs: 60000 });
    const blocked = checkRateLimit({ key, limit: 1, windowMs: 60000 });

    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("handles multiple independent buckets", () => {
    const result1 = checkRateLimit({ key: "user-1", limit: 2, windowMs: 60000 });
    const result2 = checkRateLimit({ key: "user-2", limit: 2, windowMs: 60000 });

    checkRateLimit({ key: "user-1", limit: 2, windowMs: 60000 });
    const user1Third = checkRateLimit({ key: "user-1", limit: 2, windowMs: 60000 });
    const user2Second = checkRateLimit({ key: "user-2", limit: 2, windowMs: 60000 });

    expect(user1Third.allowed).toBe(false);
    expect(user2Second.allowed).toBe(true);
  });
});
