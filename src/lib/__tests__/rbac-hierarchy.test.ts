import { describe, expect, it } from "vitest";
import { hasMinRole } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";

describe("RBAC Role Hierarchy", () => {
  describe("Role hierarchy levels", () => {
    const roleHierarchy: Record<UserRole, number> = {
      OWNER: 5,
      MANAGER: 4,
      CASHIER: 3,
      WAITER: 2,
      KITCHEN: 1,
    };

    Object.entries(roleHierarchy).forEach(([role, level]) => {
      it(`${role} should have level ${level}`, () => {
        // Test that hasMinRole respects the hierarchy
        const allRoles: UserRole[] = ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"];
        const lowerRoles = allRoles.filter(
          (r) => roleHierarchy[r] < level
        ) as UserRole[];

        // This role should have access to itself
        expect(hasMinRole(role as UserRole, role as UserRole)).toBe(true);

        // This role should NOT have access to roles above it
        lowerRoles.forEach((lowerRole) => {
          expect(hasMinRole(lowerRole, role as UserRole)).toBe(false);
        });
      });
    });
  });

  describe("Common permission scenarios", () => {
    it("Owner can access all endpoints", () => {
      expect(hasMinRole("OWNER", "OWNER")).toBe(true);
      expect(hasMinRole("OWNER", "MANAGER")).toBe(true);
      expect(hasMinRole("OWNER", "CASHIER")).toBe(true);
      expect(hasMinRole("OWNER", "WAITER")).toBe(true);
      expect(hasMinRole("OWNER", "KITCHEN")).toBe(true);
    });

    it("Manager can access manager+ endpoints", () => {
      expect(hasMinRole("MANAGER", "OWNER")).toBe(false);
      expect(hasMinRole("MANAGER", "MANAGER")).toBe(true);
      expect(hasMinRole("MANAGER", "CASHIER")).toBe(true);
      expect(hasMinRole("MANAGER", "WAITER")).toBe(true);
      expect(hasMinRole("MANAGER", "KITCHEN")).toBe(true);
    });

    it("Waiter can only access waiter endpoints", () => {
      expect(hasMinRole("WAITER", "OWNER")).toBe(false);
      expect(hasMinRole("WAITER", "MANAGER")).toBe(false);
      expect(hasMinRole("WAITER", "CASHIER")).toBe(false);
      expect(hasMinRole("WAITER", "WAITER")).toBe(true);
      expect(hasMinRole("WAITER", "KITCHEN")).toBe(true);
    });

    it("Kitchen cannot access cashier endpoints", () => {
      expect(hasMinRole("KITCHEN", "OWNER")).toBe(false);
      expect(hasMinRole("KITCHEN", "MANAGER")).toBe(false);
      expect(hasMinRole("KITCHEN", "CASHIER")).toBe(false);
      expect(hasMinRole("KITCHEN", "WAITER")).toBe(false);
      expect(hasMinRole("KITCHEN", "KITCHEN")).toBe(true);
    });
  });

  describe("Dashboard access patterns", () => {
    it("allows manager to view dashboard", () => {
      expect(hasMinRole("MANAGER", "MANAGER")).toBe(true);
    });

    it("allows owner to view all reports", () => {
      // Reports require at least MANAGER
      expect(hasMinRole("OWNER", "MANAGER")).toBe(true);
    });

    it("prevents waiter from accessing reports", () => {
      // Reports require at least MANAGER
      expect(hasMinRole("WAITER", "MANAGER")).toBe(false);
    });

    it("allows kitchen to submit order status only", () => {
      // Kitchen operations require KITCHEN role minimum
      expect(hasMinRole("KITCHEN", "KITCHEN")).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("cashier is middle tier", () => {
      // Cashier can do: cashier, waiter, kitchen
      expect(hasMinRole("CASHIER", "CASHIER")).toBe(true);
      expect(hasMinRole("CASHIER", "WAITER")).toBe(true);
      expect(hasMinRole("CASHIER", "KITCHEN")).toBe(true);

      // But cannot do: manager, owner
      expect(hasMinRole("CASHIER", "MANAGER")).toBe(false);
      expect(hasMinRole("CASHIER", "OWNER")).toBe(false);
    });

    it("waiter bridges between operations and kitchen", () => {
      expect(hasMinRole("WAITER", "WAITER")).toBe(true);
      expect(hasMinRole("WAITER", "KITCHEN")).toBe(true);
      expect(hasMinRole("WAITER", "CASHIER")).toBe(false);
    });
  });
});
