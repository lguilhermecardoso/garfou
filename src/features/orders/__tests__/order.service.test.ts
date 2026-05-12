import { describe, expect, it, vi, beforeEach } from "vitest";
import { orderService } from "@/features/orders/order.service";
import type { OrderStatus } from "@prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock dependencies
vi.mock("@/repositories/order.repository", () => ({
  orderRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    getNextOrderNumber: vi.fn(),
  },
}));

vi.mock("@/repositories/menu.repository", () => ({
  menuRepository: {
    findProductsByIds: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    coupon: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    restaurant: {
      findUnique: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { orderRepository } from "@/repositories/order.repository";
import { menuRepository } from "@/repositories/menu.repository";
import { prisma } from "@/lib/db";

describe("orderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrder", () => {
    it("returns order when found", async () => {
      const mockOrder = {
        id: "order-1",
        orderNumber: 1,
        restaurantId: "rest-1",
        status: "CONFIRMADO" as OrderStatus,
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);

      const result = await orderService.getOrder("rest-1", "order-1");
      expect(result).toEqual(mockOrder);
    });

    it("throws error when order not found", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(orderService.getOrder("rest-1", "order-1")).rejects.toThrow(
        "Pedido não encontrado"
      );
    });
  });

  describe("updateStatus", () => {
    it("allows valid NOVO_PEDIDO to CONFIRMADO transition", async () => {
      const mockOrder = {
        id: "order-1",
        status: "NOVO_PEDIDO" as OrderStatus,
        restaurantId: "rest-1",
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(orderRepository.updateStatus).mockResolvedValue({} as any);

      await orderService.updateStatus("rest-1", "order-1", {
        status: "CONFIRMADO",
      });

      expect(orderRepository.updateStatus).toHaveBeenCalledWith("rest-1", "order-1", "CONFIRMADO");
    });

    it("allows CONFIRMADO to EM_PREPARO transition", async () => {
      const mockOrder = {
        id: "order-1",
        status: "CONFIRMADO" as OrderStatus,
        restaurantId: "rest-1",
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(orderRepository.updateStatus).mockResolvedValue({} as any);

      await orderService.updateStatus("rest-1", "order-1", {
        status: "EM_PREPARO",
      });

      expect(orderRepository.updateStatus).toHaveBeenCalled();
    });

    it("rejects invalid EM_PREPARO to NOVO_PEDIDO transition", async () => {
      const mockOrder = {
        id: "order-1",
        status: "EM_PREPARO" as OrderStatus,
        restaurantId: "rest-1",
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);

      await expect(
        orderService.updateStatus("rest-1", "order-1", {
          status: "NOVO_PEDIDO" as unknown as "CONFIRMADO",
        })
      ).rejects.toThrow("Transição inválida");
    });

    it("rejects transition when order not found", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(
        orderService.updateStatus("rest-1", "order-1", { status: "CONFIRMADO" })
      ).rejects.toThrow("Pedido não encontrado");
    });

    it("allows PRONTO to FINALIZADO transition", async () => {
      const mockOrder = {
        id: "order-1",
        status: "PRONTO" as OrderStatus,
        restaurantId: "rest-1",
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(orderRepository.updateStatus).mockResolvedValue({} as any);

      await orderService.updateStatus("rest-1", "order-1", {
        status: "FINALIZADO",
      });

      expect(orderRepository.updateStatus).toHaveBeenCalled();
    });
  });

  describe("createOrder", () => {
    it("throws error when product not found", async () => {
      const input = {
        type: "DINE_IN" as const,
        items: [
          {
            productId: "prod-1",
            quantity: 1,
            notes: "",
            addons: [],
            selectedOptions: [],
            splits: [],
          },
        ],
      };

      vi.mocked(menuRepository.findProductsByIds).mockResolvedValue([]);

      await expect(orderService.createOrder("rest-1", input as any)).rejects.toThrow(
        "Um ou mais produtos não encontrados ou inativos"
      );
    });

    it("throws error when product count mismatch", async () => {
      const input = {
        type: "DINE_IN" as const,
        items: [
          {
            productId: "prod-1",
            quantity: 1,
            notes: "",
            addons: [],
            selectedOptions: [],
            splits: [],
          },
          {
            productId: "prod-2",
            quantity: 1,
            notes: "",
            addons: [],
            selectedOptions: [],
            splits: [],
          },
        ],
      };

      // Only return one product when two were requested
      vi.mocked(menuRepository.findProductsByIds).mockResolvedValue([
        {
          id: "prod-1",
          price: 1000,
          addons: [],
          modifierGroups: [],
          splitSources: [],
          allowCustomization: false,
          allowSplit: false,
          maxSplits: 2,
          splitPriceRule: "HIGHEST",
        } as any,
      ]);

      await expect(orderService.createOrder("rest-1", input as any)).rejects.toThrow(
        "Um ou mais produtos não encontrados ou inativos"
      );
    });

    it("creates order with valid products", async () => {
      const input = {
        type: "DINE_IN" as const,
        items: [
          {
            productId: "prod-1",
            quantity: 2,
            notes: "",
            addons: [],
            selectedOptions: [],
            splits: [],
          },
        ],
      };

      vi.mocked(menuRepository.findProductsByIds).mockResolvedValue([
        {
          id: "prod-1",
          price: 1000,
          addons: [],
          modifierGroups: [],
          splitSources: [],
          allowCustomization: false,
          allowSplit: false,
          maxSplits: 2,
          splitPriceRule: "HIGHEST",
        } as any,
      ]);

      vi.mocked(prisma.restaurant.findUnique).mockResolvedValue({
        settings: { autoApproveOrders: false },
      } as any);

      vi.mocked(orderRepository.getNextOrderNumber).mockResolvedValue(1);

      vi.mocked(orderRepository.create).mockResolvedValue({
        id: "order-1",
        orderNumber: 1,
      } as any);

      const result = await orderService.createOrder("rest-1", input as any);

      expect(orderRepository.create).toHaveBeenCalled();
      expect(result.orderNumber).toBe(1);
    });

    it("requires split selection for split products and uses highest flavor price", async () => {
      const input = {
        type: "DINE_IN" as const,
        items: [
          {
            productId: "prod-split",
            quantity: 1,
            notes: "",
            addons: [],
            selectedOptions: [],
            splits: [
              { splitIndex: 0, flavorProductId: "flavor-1" },
              { splitIndex: 1, flavorProductId: "flavor-2" },
            ],
          },
        ],
      };

      vi.mocked(menuRepository.findProductsByIds).mockResolvedValue([
        {
          id: "prod-split",
          name: "Pizza Grande 2 Sabores",
          price: 0,
          addons: [],
          modifierGroups: [],
          splitSources: [
            {
              flavorProductId: "flavor-1",
              isAvailable: true,
              flavorProduct: { id: "flavor-1", name: "Calabresa", price: 50, deletedAt: null },
            },
            {
              flavorProductId: "flavor-2",
              isAvailable: true,
              flavorProduct: { id: "flavor-2", name: "Frango", price: 60, deletedAt: null },
            },
          ],
          allowCustomization: false,
          allowSplit: true,
          maxSplits: 2,
          splitPriceRule: "HIGHEST",
        } as any,
      ]);

      vi.mocked(prisma.restaurant.findUnique).mockResolvedValue({
        settings: { autoApproveOrders: false },
      } as any);
      vi.mocked(orderRepository.getNextOrderNumber).mockResolvedValue(10);
      vi.mocked(orderRepository.create).mockResolvedValue({
        id: "order-10",
        orderNumber: 10,
      } as any);

      await orderService.createOrder("rest-1", input as any);

      expect(orderRepository.create).toHaveBeenCalledWith(
        "rest-1",
        expect.objectContaining({
          subtotal: 60,
          total: 60,
        })
      );
    });

    it("rejects split product without all required flavors", async () => {
      const input = {
        type: "DINE_IN" as const,
        items: [
          {
            productId: "prod-split",
            quantity: 1,
            notes: "",
            addons: [],
            selectedOptions: [],
            splits: [],
          },
        ],
      };

      vi.mocked(menuRepository.findProductsByIds).mockResolvedValue([
        {
          id: "prod-split",
          name: "Pizza Grande 2 Sabores",
          price: 0,
          addons: [],
          modifierGroups: [],
          splitSources: [],
          allowCustomization: false,
          allowSplit: true,
          maxSplits: 2,
          splitPriceRule: "HIGHEST",
        } as any,
      ]);

      await expect(orderService.createOrder("rest-1", input as any)).rejects.toThrow(
        "O produto Pizza Grande 2 Sabores exige a selecao de 2 sabores"
      );
    });
  });
});
