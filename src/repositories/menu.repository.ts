import { prisma } from "@/lib/db";
import { productCustomizationInclude } from "@/features/menu/product-customization.server";

export const menuRepository = {
  async getCategories(restaurantId: string, includeInactive = false) {
    return prisma.category.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        products: {
          where: {
            deletedAt: null,
            ...(includeInactive ? {} : { isActive: true }),
          },
          include: productCustomizationInclude,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  },

  async findProductById(restaurantId: string, productId: string) {
    return prisma.product.findFirst({
      where: { id: productId, restaurantId, deletedAt: null },
      include: { ...productCustomizationInclude, category: true },
    });
  },

  async findProductsByIds(restaurantId: string, productIds: string[]) {
    return prisma.product.findMany({
      where: {
        id: { in: productIds },
        restaurantId,
        isActive: true,
        deletedAt: null,
      },
      include: productCustomizationInclude,
    });
  },
};
