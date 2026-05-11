import { describe, expect, it } from "vitest";
import { hasMinRole } from "@/lib/roles";

describe("hasMinRole", () => {
  it("allows OWNER for all roles", () => {
    expect(hasMinRole("OWNER", "OWNER")).toBe(true);
    expect(hasMinRole("OWNER", "MANAGER")).toBe(true);
    expect(hasMinRole("OWNER", "CASHIER")).toBe(true);
    expect(hasMinRole("OWNER", "WAITER")).toBe(true);
    expect(hasMinRole("OWNER", "KITCHEN")).toBe(true);
  });

  it("enforces hierarchy correctly", () => {
    expect(hasMinRole("MANAGER", "WAITER")).toBe(true);
    expect(hasMinRole("MANAGER", "KITCHEN")).toBe(true);
    expect(hasMinRole("WAITER", "MANAGER")).toBe(false);
    expect(hasMinRole("KITCHEN", "WAITER")).toBe(false);
  });

  it("allows same role threshold", () => {
    expect(hasMinRole("CASHIER", "CASHIER")).toBe(true);
    expect(hasMinRole("WAITER", "WAITER")).toBe(true);
  });
});
