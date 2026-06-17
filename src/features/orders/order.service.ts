import { orderRepository } from "@/repositories/order.repository";
import { menuRepository } from "@/repositories/menu.repository";
import { findOrUpsertCustomerByPhone } from "@/repositories/customer.repository";
import { prisma } from "@/lib/db";
import { TabService } from "@/features/tabs/tab.service";
import type { z } from "zod";
import type { createOrderSchema, updateOrderStatusSchema } from "@/lib/validations";
import type { OrderStatus, SplitPriceRule } from "@prisma/client";

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type UpdateStatusInput = z.infer<typeof updateOrderStatusSchema>;

function applySplitPriceRule(prices: number[], rule: SplitPriceRule) {
  if (prices.length === 0) return 0;

  switch (rule) {
    case "AVERAGE":
      return prices.reduce((acc, price) => acc + price, 0) / prices.length;
    case "SUM":
      return prices.reduce((acc, price) => acc + price, 0);
    case "HIGHEST":
    default:
      return Math.max(...prices);
  }
}

export const orderService = {
  async getOrders(restaurantId: string, filters = {}) {
    return orderRepository.findMany(restaurantId, filters);
  },

  async getOrder(restaurantId: string, orderId: string) {
    const order = await orderRepository.findById(restaurantId, orderId);
    if (!order) throw new Error("Pedido não encontrado");
    return order;
  },

  async createOrder(restaurantId: string, input: CreateOrderInput, waiterId?: string) {
    let validatedTabId: string | undefined;

    if (input.tabId) {
      const tab = await prisma.tab.findFirst({
        where: {
          id: input.tabId,
          restaurantId,
          status: "OPEN",
        },
        include: {
          table: true,
        },
      });

      if (!tab) {
        throw new Error("Comanda não encontrada ou não está aberta");
      }

      validatedTabId = tab.id;
    }

    // Find or upsert customer by phone (phone is the deduplication key)
    let customerId = input.customerId;

    if (!customerId && input.customerPhone) {
      const customer = await findOrUpsertCustomerByPhone({
        restaurantId,
        phone: input.customerPhone,
        name: input.customerName,
        email: input.customerEmail || null,
        source: "DIGITAL_MENU",
      });
      customerId = customer?.id;
    }

    // 1. Validate products exist and are active
    const productIds = input.items.map((i) => i.productId);
    const products = await menuRepository.findProductsByIds(restaurantId, productIds);

    if (products.length !== new Set(productIds).size) {
      throw new Error("Um ou mais produtos não encontrados ou inativos");
    }

    // 1b. Check for paused products (temporarily unavailable)
    const pausedProducts = products.filter((p) => p.isPaused);
    if (pausedProducts.length > 0) {
      const names = pausedProducts.map((p) => p.name).join(", ");
      throw new Error(
        `${pausedProducts.length === 1 ? "O produto" : "Os produtos"} "${names}" ${pausedProducts.length === 1 ? "está" : "estão"} temporariamente indisponível${pausedProducts.length === 1 ? "" : "s"}. Por favor, remova-${pausedProducts.length === 1 ? "o" : "os"} do carrinho.`
      );
    }

    // 2. Build product price map
    const productMap = new Map(products.map((p) => [p.id, p]));
    const addonMap = new Map(products.flatMap((p) => p.addons ?? []).map((a) => [a.id, a]));

    // 3. Calculate totals
    let subtotal = 0;
    const orderItems = input.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const modifierOptionMap = new Map(
        (product.modifierGroups ?? [])
          .flatMap((group) => group.options)
          .map((option) => [option.id, option])
      );
      const splitFlavorMap = new Map(
        (product.splitSources ?? []).map((split) => [split.flavorProductId, split])
      );

      const selectedOptionsInput = item.selectedOptions ?? [];
      const splitInput = item.splits ?? [];
      const addonsInput = item.addons ?? [];

      const hasSelectedOptions = selectedOptionsInput.length > 0;
      const hasSplits = splitInput.length > 0;

      if (hasSelectedOptions && !product.allowCustomization) {
        throw new Error(`O produto ${product.name} nao aceita personalizacao`);
      }

      if (product.allowSplit && !hasSplits) {
        throw new Error(
          `O produto ${product.name} exige a selecao de ${product.maxSplits} sabores`
        );
      }

      let itemPrice = product.allowSplit ? 0 : Number(product.price);
      const splitSnapshots = hasSplits
        ? splitInput
            .slice()
            .sort((left, right) => left.splitIndex - right.splitIndex)
            .map((split) => {
              if (!product.allowSplit) {
                throw new Error(`O produto ${product.name} nao aceita divisao em partes`);
              }

              if (split.splitIndex < 0 || split.splitIndex >= product.maxSplits) {
                throw new Error(`Indice de parte invalido para ${product.name}`);
              }

              const splitFlavor = splitFlavorMap.get(split.flavorProductId);
              if (
                !splitFlavor ||
                !splitFlavor.isAvailable ||
                splitFlavor.flavorProduct.deletedAt !== null
              ) {
                throw new Error(`Sabor de divisao invalido para ${product.name}`);
              }

              return {
                splitIndex: split.splitIndex,
                productId: splitFlavor.flavorProduct.id,
                productName: splitFlavor.flavorProduct.name,
                unitPrice: Number(splitFlavor.flavorProduct.price),
              };
            })
        : [];

      if (product.allowSplit && splitInput.length !== product.maxSplits) {
        throw new Error(`O produto ${product.name} exige exatamente ${product.maxSplits} partes`);
      }

      if (splitSnapshots.length > 0) {
        const uniqueIndexes = new Set(splitSnapshots.map((split) => split.splitIndex));
        if (uniqueIndexes.size !== splitSnapshots.length) {
          throw new Error(`O produto ${product.name} recebeu partes duplicadas`);
        }

        itemPrice = applySplitPriceRule(
          splitSnapshots.map((split) => split.unitPrice),
          product.splitPriceRule
        );
      }

      const addonTotal = addonsInput.reduce((acc, a) => {
        const addon = addonMap.get(a.addonId);
        return acc + (addon ? Number(addon.price) * a.quantity : 0);
      }, 0);
      const selectedOptionSnapshots = selectedOptionsInput.map((selection) => {
        const option = modifierOptionMap.get(selection.optionId);
        if (!option || option.deletedAt !== null) {
          throw new Error(`Opcao invalida para ${product.name}`);
        }

        if (!selection.isRemoval && !option.isAvailable) {
          throw new Error(`Opcao indisponivel para ${product.name}`);
        }

        if (selection.isRemoval && !option.isDefault) {
          throw new Error(`Somente ingredientes padrao podem ser removidos em ${product.name}`);
        }

        return {
          optionId: option.id,
          optionName: option.name,
          quantity: selection.quantity,
          unitPrice: Number(option.price),
          isRemoval: selection.isRemoval,
        };
      });
      const selectedOptionsTotal = selectedOptionSnapshots.reduce((acc, selection) => {
        return selection.isRemoval ? acc : acc + selection.unitPrice * selection.quantity;
      }, 0);

      // Free-form extras added by the PDV operator (not linked to DB addon records)
      const customAddons = item.customAddons ?? [];
      const customAddonUnitTotal = customAddons.reduce(
        (sum, a) => sum + a.unitPrice * (a.quantity ?? 1),
        0
      );
      const customAddonNotes = customAddons
        .map((a) => {
          const qty = (a.quantity ?? 1) > 1 ? `${a.quantity}x ` : "";
          return `+ ${qty}${a.name} R$${a.unitPrice.toFixed(2).replace(".", ",")}`;
        })
        .join("\n");
      const combinedNotes = [item.notes, customAddonNotes].filter(Boolean).join("\n") || undefined;

      const lineTotal =
        (itemPrice + addonTotal + selectedOptionsTotal + customAddonUnitTotal) * item.quantity;
      subtotal += lineTotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: itemPrice + customAddonUnitTotal,
        notes: combinedNotes,
        addons: {
          create: addonsInput.map((a) => ({
            addonId: a.addonId,
            quantity: a.quantity,
            unitPrice: Number(addonMap.get(a.addonId)?.price ?? 0),
          })),
        },
        selectedOptions: {
          create: selectedOptionSnapshots,
        },
        splits: {
          create: splitSnapshots,
        },
      };
    });

    // 4. Apply coupon if provided
    let discount = 0;
    if (input.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          restaurantId,
          code: input.couponCode.toUpperCase(),
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      const canUseCoupon = coupon && (coupon.maxUses === null || coupon.usedCount < coupon.maxUses);

      if (canUseCoupon) {
        discount =
          coupon.type === "PERCENTAGE"
            ? (subtotal * Number(coupon.value)) / 100
            : Number(coupon.value);
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // 5. Get restaurant settings for auto-approve
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    });
    const settings = (restaurant?.settings as { autoApproveOrders?: boolean }) ?? {};
    const autoApprove = settings.autoApproveOrders ?? false;

    const orderNumber = await orderRepository.getNextOrderNumber(restaurantId);
    const deliveryFee = input.deliveryFee ?? 0;
    const total = subtotal - discount + deliveryFee;

    const createdOrder = await orderRepository.create(restaurantId, {
      orderNumber,
      type: input.type,
      status: autoApprove ? "CONFIRMADO" : "NOVO_PEDIDO",
      tableNumber: input.tableNumber,
      notes: input.notes,
      deliveryAddress: input.deliveryAddress ?? undefined,
      subtotal,
      discount,
      deliveryFee,
      total,
      paymentMethod: input.paymentMethod,
      ...(validatedTabId && { tab: { connect: { id: validatedTabId } } }),
      ...(waiterId && { waiter: { connect: { id: waiterId } } }),
      ...(customerId && { customer: { connect: { id: customerId } } }),
      items: { create: orderItems },
    });

    // Always recalculate tab total when order is added to a tab
    if (validatedTabId) {
      await new TabService().recalculateTabTotal(restaurantId, validatedTabId);
    }

    return createdOrder;
  },

  async updateStatus(
    restaurantId: string,
    orderId: string,
    input: UpdateStatusInput,
    userId?: string
  ) {
    const order = await orderRepository.findById(restaurantId, orderId);
    if (!order) throw new Error("Pedido não encontrado");

    // Validate status transition
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      NOVO_PEDIDO: ["AGUARDANDO_CONFIRMACAO", "CONFIRMADO", "CANCELADO"],
      AGUARDANDO_CONFIRMACAO: ["CONFIRMADO", "CANCELADO"],
      CONFIRMADO: ["EM_PREPARO", "FINALIZADO", "CANCELADO"],
      EM_PREPARO: ["PRONTO", "CANCELADO"],
      PRONTO: ["SAIU_PARA_ENTREGA", "FINALIZADO", "CANCELADO"],
      SAIU_PARA_ENTREGA: ["FINALIZADO", "CANCELADO"],
      FINALIZADO: ["CANCELADO"],
    };

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(input.status as OrderStatus)) {
      throw new Error(`Transição inválida: ${order.status} → ${input.status}`);
    }

    const updatedOrder = await orderRepository.updateStatus(
      restaurantId,
      orderId,
      input.status as OrderStatus
    );

    if (updatedOrder.tab?.id) {
      await new TabService().recalculateTabTotal(restaurantId, updatedOrder.tab.id);
    }

    // Cancelled orders must not be reflected in finance reports
    if (input.status === "CANCELADO") {
      await prisma.financeEntry.deleteMany({
        where: { restaurantId, orderId },
      });
    }

    // Auto-create finance entry when order is finalized
    if (input.status === "FINALIZADO") {
      const resolvedUserId = userId ?? order.waiterId ?? order.customerId ?? "system";

      // Avoid duplicates: only create if no finance entry already linked to this order
      const existing = await prisma.financeEntry.findFirst({
        where: { restaurantId, orderId },
      });

      if (!existing) {
        const orderTypeLabel: Record<string, string> = {
          DINE_IN: "Mesa",
          TAKEOUT: "Retirada",
          DELIVERY: "Delivery",
        };
        const typeLabel = orderTypeLabel[order.type] ?? order.type;
        const tableInfo = order.tableNumber ? ` — Mesa ${order.tableNumber}` : "";
        const paymentMethodMap: Record<string, string> = {
          CASH: "Dinheiro",
          PIX: "PIX",
          CREDIT_CARD: "Cartão de Crédito",
          DEBIT_CARD: "Cartão de Débito",
          VOUCHER: "Voucher",
        };
        const paymentLabel = order.paymentMethod ? paymentMethodMap[order.paymentMethod] : null;

        await prisma.financeEntry.create({
          data: {
            restaurantId,
            orderId,
            type: "REVENUE",
            category: "Pedidos",
            description: `Pedido #${order.orderNumber} (${typeLabel}${tableInfo})${paymentLabel ? ` — ${paymentLabel}` : ""}`,
            amount: order.total,
            date: new Date(),
            paymentMethod: order.paymentMethod ?? null,
            userId: resolvedUserId,
          },
        });
      }
    }

    return updatedOrder;
  },

  async getPrintQueue(restaurantId: string) {
    return orderRepository.findPrintQueue(restaurantId);
  },

  async confirmPrint(restaurantId: string, orderId: string) {
    return orderRepository.confirmPrint(restaurantId, orderId);
  },
};
