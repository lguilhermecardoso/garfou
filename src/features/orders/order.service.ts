import { orderRepository } from "@/repositories/order.repository";
import { menuRepository } from "@/repositories/menu.repository";
import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { createOrderSchema, updateOrderStatusSchema } from "@/lib/validations";
import type { OrderStatus } from "@prisma/client";

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type UpdateStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const orderService = {
  async getOrders(restaurantId: string, filters = {}) {
    return orderRepository.findMany(restaurantId, filters);
  },

  async getOrder(restaurantId: string, orderId: string) {
    const order = await orderRepository.findById(restaurantId, orderId);
    if (!order) throw new Error("Pedido não encontrado");
    return order;
  },

  async createOrder(
    restaurantId: string,
    input: CreateOrderInput,
    waiterId?: string
  ) {
    // 1. Validate products exist and are active
    const productIds = input.items.map((i) => i.productId);
    const products = await menuRepository.findProductsByIds(restaurantId, productIds);

    if (products.length !== new Set(productIds).size) {
      throw new Error("Um ou mais produtos não encontrados ou inativos");
    }

    // 2. Build product price map
    const productMap = new Map(products.map((p) => [p.id, p]));
    const addonMap = new Map(
      products.flatMap((p) => p.addons).map((a) => [a.id, a])
    );

    // 3. Calculate totals
    let subtotal = 0;
    const orderItems = input.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const itemPrice = Number(product.price);
      const addonTotal = item.addons.reduce((acc, a) => {
        const addon = addonMap.get(a.addonId);
        return acc + (addon ? Number(addon.price) * a.quantity : 0);
      }, 0);
      const lineTotal = (itemPrice + addonTotal) * item.quantity;
      subtotal += lineTotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: itemPrice,
        notes: item.notes,
        addons: {
          create: item.addons.map((a) => ({
            addonId: a.addonId,
            quantity: a.quantity,
            unitPrice: Number(addonMap.get(a.addonId)?.price ?? 0),
          })),
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
    const total = subtotal - discount;

    return orderRepository.create(restaurantId, {
      orderNumber,
      type: input.type,
      status: autoApprove ? "CONFIRMADO" : "NOVO_PEDIDO",
      tableNumber: input.tableNumber,
      notes: input.notes,
      deliveryAddress: input.deliveryAddress ?? undefined,
      subtotal,
      discount,
      deliveryFee: 0,
      total,
      ...(waiterId && { waiter: { connect: { id: waiterId } } }),
      ...(input.customerId && { customer: { connect: { id: input.customerId } } }),
      items: { create: orderItems },
    });
  },

  async updateStatus(
    restaurantId: string,
    orderId: string,
    input: UpdateStatusInput
  ) {
    const order = await orderRepository.findById(restaurantId, orderId);
    if (!order) throw new Error("Pedido não encontrado");

    // Validate status transition
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      NOVO_PEDIDO: ["AGUARDANDO_CONFIRMACAO", "CONFIRMADO", "CANCELADO"],
      AGUARDANDO_CONFIRMACAO: ["CONFIRMADO", "CANCELADO"],
      CONFIRMADO: ["EM_PREPARO", "CANCELADO"],
      EM_PREPARO: ["PRONTO", "CANCELADO"],
      PRONTO: ["SAIU_PARA_ENTREGA", "FINALIZADO", "CANCELADO"],
      SAIU_PARA_ENTREGA: ["FINALIZADO", "CANCELADO"],
    };

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(input.status as OrderStatus)) {
      throw new Error(
        `Transição inválida: ${order.status} → ${input.status}`
      );
    }

    return orderRepository.updateStatus(restaurantId, orderId, input.status as OrderStatus);
  },

  async getPrintQueue(restaurantId: string) {
    return orderRepository.findPrintQueue(restaurantId);
  },

  async confirmPrint(restaurantId: string, orderId: string) {
    return orderRepository.confirmPrint(restaurantId, orderId);
  },
};
