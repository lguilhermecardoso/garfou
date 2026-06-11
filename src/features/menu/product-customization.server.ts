import { prisma } from "@/lib/db";
import type { createProductSchema, updateProductSchema } from "@/lib/validations";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productCustomizationInclude = {
  addons: { orderBy: { name: "asc" } },
  modifierGroups: {
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      options: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
    },
  },
  splitSources: {
    orderBy: { sortOrder: "asc" },
    include: {
      flavorProduct: {
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithCustomization = Prisma.ProductGetPayload<{
  include: typeof productCustomizationInclude;
}>;

type ProductWithOptionalCategory = ProductWithCustomization & {
  category?: {
    id: string;
    name: string;
  } | null;
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return value;
  return Number(value);
}

export function serializeProductWithCustomization(product: ProductWithOptionalCategory) {
  return {
    ...product,
    price: toNumber(product.price),
    costPrice: toNumber(product.costPrice),
    addons: product.addons.map((addon) => ({
      ...addon,
      price: toNumber(addon.price),
    })),
    modifierGroups: product.modifierGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        price: toNumber(option.price),
      })),
    })),
    splitFlavors: product.splitSources
      .filter((split) => split.flavorProduct.deletedAt === null)
      .map((split) => ({
        id: split.id,
        flavorProductId: split.flavorProductId,
        sortOrder: split.sortOrder,
        isAvailable: split.isAvailable,
        flavorProduct: {
          ...split.flavorProduct,
          price: toNumber(split.flavorProduct.price),
        },
      })),
  };
}

export function buildProductCreateInput(
  restaurantId: string,
  input: CreateProductInput
): Prisma.ProductCreateInput {
  const resolvedPrice = input.allowSplit ? 0 : input.price;

  return {
    restaurant: { connect: { id: restaurantId } },
    category: { connect: { id: input.categoryId } },
    name: input.name,
    description: input.description,
    price: resolvedPrice,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    isInternalOnly: input.isInternalOnly,
    isFeatured: input.isFeatured,
    allowCustomization: input.allowCustomization,
    allowSplit: input.allowSplit,
    maxSplits: input.maxSplits,
    splitPriceRule: input.splitPriceRule,
    preparationTime: input.preparationTime,
    costPrice: input.costPrice,
    promotionExpiresAt: input.promotionExpiresAt ? new Date(input.promotionExpiresAt) : null,
    image: input.image ?? undefined,
    modifierGroups: input.allowCustomization
      ? {
          create: input.modifierGroups.map((group) => ({
            restaurant: { connect: { id: restaurantId } },
            name: group.name,
            type: group.type,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            sortOrder: group.sortOrder,
            options: {
              create: group.options.map((option) => ({
                restaurant: { connect: { id: restaurantId } },
                name: option.name,
                price: option.price,
                isDefault: option.isDefault,
                isAvailable: option.isAvailable,
                sortOrder: option.sortOrder,
              })),
            },
          })),
        }
      : undefined,
    splitSources: input.allowSplit
      ? {
          create: input.splitFlavors.map((splitFlavor) => ({
            restaurant: { connect: { id: restaurantId } },
            flavorProduct: { connect: { id: splitFlavor.flavorProductId } },
            sortOrder: splitFlavor.sortOrder,
            isAvailable: splitFlavor.isAvailable,
          })),
        }
      : undefined,
  };
}

export async function syncProductCustomization(
  restaurantId: string,
  productId: string,
  input: UpdateProductInput
) {
  return prisma.$transaction(async (tx) => {
    const resolvedPrice = input.allowSplit ? 0 : input.price;

    await tx.product.updateMany({
      where: { id: productId, restaurantId, deletedAt: null },
      data: {
        name: input.name,
        description: input.description,
        price: resolvedPrice,
        categoryId: input.categoryId,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        isInternalOnly: input.isInternalOnly,
        isFeatured: input.isFeatured,
        allowCustomization: input.allowCustomization,
        allowSplit: input.allowSplit,
        maxSplits: input.maxSplits,
        splitPriceRule: input.splitPriceRule,
        preparationTime: input.preparationTime,
        costPrice: input.costPrice,
        promotionExpiresAt:
          input.promotionExpiresAt !== undefined
            ? input.promotionExpiresAt
              ? new Date(input.promotionExpiresAt)
              : null
            : undefined,
        ...(input.image !== undefined ? { image: input.image } : {}),
      },
    });

    if (input.allowSplit !== undefined || input.splitFlavors) {
      await tx.productSplitFlavor.deleteMany({
        where: { restaurantId, sourceProductId: productId },
      });

      if (input.allowSplit && input.splitFlavors?.length) {
        await tx.productSplitFlavor.createMany({
          data: input.splitFlavors.map((splitFlavor) => ({
            restaurantId,
            sourceProductId: productId,
            flavorProductId: splitFlavor.flavorProductId,
            sortOrder: splitFlavor.sortOrder,
            isAvailable: splitFlavor.isAvailable,
          })),
        });
      }
    }

    if (input.allowCustomization !== undefined || input.modifierGroups) {
      const existingGroups = await tx.modifierGroup.findMany({
        where: { restaurantId, productId, deletedAt: null },
        include: {
          options: {
            where: { deletedAt: null },
          },
        },
      });

      if (!input.allowCustomization) {
        const groupIds = existingGroups.map((group) => group.id);
        if (groupIds.length > 0) {
          await tx.modifierOption.updateMany({
            where: { groupId: { in: groupIds }, deletedAt: null },
            data: { deletedAt: new Date() },
          });
          await tx.modifierGroup.updateMany({
            where: { id: { in: groupIds }, deletedAt: null },
            data: { deletedAt: new Date() },
          });
        }
      } else if (input.modifierGroups) {
        const incomingGroupIds = new Set(
          input.modifierGroups.map((group) => group.id).filter(Boolean)
        );

        for (const existingGroup of existingGroups) {
          if (!incomingGroupIds.has(existingGroup.id)) {
            await tx.modifierOption.updateMany({
              where: { groupId: existingGroup.id, deletedAt: null },
              data: { deletedAt: new Date() },
            });
            await tx.modifierGroup.update({
              where: { id: existingGroup.id },
              data: { deletedAt: new Date() },
            });
          }
        }

        for (const group of input.modifierGroups) {
          let groupId = group.id;

          if (groupId) {
            await tx.modifierGroup.update({
              where: { id: groupId },
              data: {
                name: group.name,
                type: group.type,
                minSelections: group.minSelections,
                maxSelections: group.maxSelections,
                sortOrder: group.sortOrder,
                deletedAt: null,
              },
            });
          } else {
            const createdGroup = await tx.modifierGroup.create({
              data: {
                restaurantId,
                productId,
                name: group.name,
                type: group.type,
                minSelections: group.minSelections,
                maxSelections: group.maxSelections,
                sortOrder: group.sortOrder,
              },
            });
            groupId = createdGroup.id;
          }

          const existingOptions = existingGroups.find((item) => item.id === groupId)?.options ?? [];
          const incomingOptionIds = new Set(
            group.options.map((option) => option.id).filter(Boolean)
          );

          for (const existingOption of existingOptions) {
            if (!incomingOptionIds.has(existingOption.id)) {
              await tx.modifierOption.update({
                where: { id: existingOption.id },
                data: { deletedAt: new Date() },
              });
            }
          }

          for (const option of group.options) {
            if (option.id) {
              await tx.modifierOption.update({
                where: { id: option.id },
                data: {
                  name: option.name,
                  price: option.price,
                  isDefault: option.isDefault,
                  isAvailable: option.isAvailable,
                  sortOrder: option.sortOrder,
                  deletedAt: null,
                },
              });
            } else {
              await tx.modifierOption.create({
                data: {
                  restaurantId,
                  groupId,
                  name: option.name,
                  price: option.price,
                  isDefault: option.isDefault,
                  isAvailable: option.isAvailable,
                  sortOrder: option.sortOrder,
                },
              });
            }
          }
        }
      }
    }

    return tx.product.findFirst({
      where: { id: productId, restaurantId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        ...productCustomizationInclude,
      },
    });
  });
}

export async function assertSplitFlavorProducts(restaurantId: string, productIds: string[]) {
  if (productIds.length === 0) return;

  const total = await prisma.product.count({
    where: {
      restaurantId,
      id: { in: productIds },
      deletedAt: null,
    },
  });

  if (total !== new Set(productIds).size) {
    throw new Error("Um ou mais sabores de divisao nao pertencem ao restaurante");
  }
}
