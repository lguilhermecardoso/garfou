import { describe, it, expect, beforeEach, vi } from "vitest";
import { menuRepository } from "../menu.repository";
import { prisma } from "@/lib/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockRestaurantId = "rest-123";

describe("menuRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCategories", () => {
    it("should get active categories with products", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Pizzas",
          isActive: true,
          deletedAt: null,
          products: [
            {
              id: "prod-1",
              name: "Margherita",
              isActive: true,
              deletedAt: null,
              addons: [],
            },
            {
              id: "prod-2",
              name: "Pepperoni",
              isActive: true,
              deletedAt: null,
              addons: [],
            },
          ],
        },
        {
          id: "cat-2",
          name: "Drinks",
          isActive: true,
          deletedAt: null,
          products: [
            {
              id: "prod-3",
              name: "Coca-Cola",
              isActive: true,
              deletedAt: null,
              addons: [],
            },
          ],
        },
      ];

      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(mockCategories as any);

      const result = await menuRepository.getCategories(mockRestaurantId);

      expect(result).toHaveLength(2);
      expect(result[0].products).toHaveLength(2);
      expect(result[1].products).toHaveLength(1);
    });

    it("should filter out deleted categories", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Pizzas",
          isActive: true,
          deletedAt: null,
          products: [],
        },
      ];

      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(mockCategories as any);

      await menuRepository.getCategories(mockRestaurantId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("should filter out inactive categories by default", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.getCategories(mockRestaurantId, false);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it("should include inactive categories when requested", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.getCategories(mockRestaurantId, true);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it("should filter products within categories", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Pizzas",
          products: [{ id: "prod-1", name: "Margherita", isActive: true, deletedAt: null }],
        },
      ];

      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(mockCategories as any);

      const result = await menuRepository.getCategories(mockRestaurantId);

      expect(result[0].products[0].deletedAt).toBeNull();
      expect(result[0].products[0].isActive).toBe(true);
    });

    it("should enforce restaurantId isolation", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.getCategories(mockRestaurantId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: mockRestaurantId,
          }),
        })
      );
    });

    it("should order by sortOrder", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.getCategories(mockRestaurantId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { sortOrder: "asc" },
        })
      );
    });
  });

  describe("findProductById", () => {
    it("should find active product with addons and category", async () => {
      const mockProduct = {
        id: "prod-1",
        name: "Margherita",
        isActive: true,
        deletedAt: null,
        category: { id: "cat-1", name: "Pizzas" },
        addons: [
          { id: "addon-1", name: "Extra cheese" },
          { id: "addon-2", name: "Extra sauce" },
        ],
      };

      vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(mockProduct as any);

      const result = await menuRepository.findProductById(mockRestaurantId, "prod-1");

      expect(result?.name).toBe("Margherita");
      expect(result?.addons).toHaveLength(2);
      expect(result?.category.name).toBe("Pizzas");
    });

    it("should return null for deleted product", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(null);

      const result = await menuRepository.findProductById(mockRestaurantId, "prod-999");

      expect(result).toBeNull();
    });

    it("should filter by deletedAt = null", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(null);

      await menuRepository.findProductById(mockRestaurantId, "prod-1");

      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("should enforce restaurantId isolation", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(null);

      await menuRepository.findProductById(mockRestaurantId, "prod-1");

      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: mockRestaurantId,
            id: "prod-1",
          }),
        })
      );
    });

    it("should include category and addons", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(null);

      await menuRepository.findProductById(mockRestaurantId, "prod-1");

      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            addons: true,
            category: true,
          }),
        })
      );
    });
  });

  describe("findProductsByIds", () => {
    it("should find multiple products by ids", async () => {
      const mockProducts = [
        {
          id: "prod-1",
          name: "Margherita",
          isActive: true,
          deletedAt: null,
          addons: [],
        },
        {
          id: "prod-2",
          name: "Pepperoni",
          isActive: true,
          deletedAt: null,
          addons: [],
        },
      ];

      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(mockProducts as any);

      const result = await menuRepository.findProductsByIds(mockRestaurantId, ["prod-1", "prod-2"]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Margherita");
      expect(result[1].name).toBe("Pepperoni");
    });

    it("should return empty array if no products found", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      const result = await menuRepository.findProductsByIds(mockRestaurantId, ["prod-999"]);

      expect(result).toHaveLength(0);
    });

    it("should handle empty id array", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      const result = await menuRepository.findProductsByIds(mockRestaurantId, []);

      expect(result).toHaveLength(0);
    });

    it("should filter by active status", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.findProductsByIds(mockRestaurantId, ["prod-1", "prod-2"]);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it("should filter by deletedAt = null", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.findProductsByIds(mockRestaurantId, ["prod-1"]);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("should enforce restaurantId isolation", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.findProductsByIds(mockRestaurantId, ["prod-1"]);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: mockRestaurantId,
          }),
        })
      );
    });

    it("should use IN operator for multiple ids", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      const ids = ["prod-1", "prod-2", "prod-3"];
      await menuRepository.findProductsByIds(mockRestaurantId, ids);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ids },
          }),
        })
      );
    });

    it("should include addons relation", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await menuRepository.findProductsByIds(mockRestaurantId, ["prod-1"]);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            addons: true,
          }),
        })
      );
    });
  });
});
