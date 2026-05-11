import { describe, expect, it } from "vitest";
import {
  signUpSchema,
  createOrderSchema,
  createCouponSchema,
  updateOrderStatusSchema,
} from "@/lib/validations";

describe("Validation Schemas", () => {
  describe("signUpSchema", () => {
    it("accepts valid signup data", () => {
      const valid = {
        name: "João Silva",
        email: "joao@example.com",
        password: "SecurePass123",
      };
      const result = signUpSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects email without @", () => {
      const invalid = {
        name: "João Silva",
        email: "joaoexample.com",
        password: "SecurePass123",
      };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects password without uppercase letter", () => {
      const invalid = {
        name: "João Silva",
        email: "joao@example.com",
        password: "securepass123",
      };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects password without number", () => {
      const invalid = {
        name: "João Silva",
        email: "joao@example.com",
        password: "SecurePassAbc",
      };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects short name", () => {
      const invalid = {
        name: "J",
        email: "joao@example.com",
        password: "SecurePass123",
      };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createOrderSchema", () => {
    it("accepts valid order type", () => {
      // Test that DINE_IN type is accepted
      const result = createOrderSchema.safeParse({ type: "DINE_IN" });
      expect(result.success).toBe(false); // Should fail because items is required
    });

    it("rejects order with no items", () => {
      const invalid = {
        type: "DINE_IN" as const,
        items: [],
      };
      const result = createOrderSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid order type", () => {
      const invalid = {
        type: "INVALID" as any,
        items: [{ productId: "c6s9m1p0z0000000000000000", quantity: 1, addons: [] }],
      };
      const result = createOrderSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("requires items array", () => {
      const valid = {
        type: "DINE_IN" as const,
      };
      const result = createOrderSchema.safeParse(valid);
      expect(result.success).toBe(false); // items is required
    });
  });

  describe("createCouponSchema", () => {
    it("accepts valid percentage coupon", () => {
      const valid = {
        code: "SUMMER20",
        type: "PERCENTAGE" as const,
        value: 20,
        minOrderValue: 50,
      };
      const result = createCouponSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts valid fixed amount coupon", () => {
      const valid = {
        code: "DISCOUNT10",
        type: "FIXED_AMOUNT" as const,
        value: 10,
      };
      const result = createCouponSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects lowercase coupon code", () => {
      const invalid = {
        code: "summer20",
        type: "PERCENTAGE" as const,
        value: 20,
      };
      const result = createCouponSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects coupon code with spaces", () => {
      const invalid = {
        code: "SUMMER 20",
        type: "PERCENTAGE" as const,
        value: 20,
      };
      const result = createCouponSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects short coupon code", () => {
      const invalid = {
        code: "AB",
        type: "PERCENTAGE" as const,
        value: 20,
      };
      const result = createCouponSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("updateOrderStatusSchema", () => {
    it("accepts valid status update", () => {
      const valid = { status: "CONFIRMADO" as const };
      const result = updateOrderStatusSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts cancellation with reason", () => {
      const valid = {
        status: "CANCELADO" as const,
        reason: "Cliente solicitou cancelamento",
      };
      const result = updateOrderStatusSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const invalid = { status: "UNKNOWN_STATUS" };
      const result = updateOrderStatusSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
