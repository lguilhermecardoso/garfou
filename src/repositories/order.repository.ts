import { prisma } from "@/lib/db";
import type { OrderStatus, OrderType, Prisma } from "@prisma/client";

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  type?: OrderType;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export const orderRepository = {
  async findMany(restaurantId: string, filters: OrderFilters = {}) {
    const { status, type, from, to, page = 1, pageSize = 20 } = filters;

    const where: Prisma.OrderWhereInput = {
      restaurantId,
      ...(status && {
        status: Array.isArray(status) ? { in: status } : status,
      }),
      ...(type && { type }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          waiter: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, image: true } },
              addons: {
                include: {
                  addon: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, pageSize };
  },

  async findById(restaurantId: string, orderId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        waiter: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, image: true } },
            addons: {
              include: {
                addon: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  },

  async findPrintQueue(restaurantId: string) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        printConfirmed: false,
        status: { in: ["CONFIRMADO", "EM_PREPARO"] },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            addons: {
              include: { addon: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async getNextOrderNumber(restaurantId: string): Promise<number> {
    const last = await prisma.order.findFirst({
      where: { restaurantId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    return (last?.orderNumber ?? 0) + 1;
  },

  async create(
    restaurantId: string,
    data: Omit<Prisma.OrderCreateInput, "restaurant">
  ) {
    return prisma.order.create({
      data: {
        ...data,
        restaurant: { connect: { id: restaurantId } },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
  },

  async updateStatus(
    restaurantId: string,
    orderId: string,
    status: OrderStatus
  ) {
    return prisma.order.update({
      where: { id: orderId, restaurantId },
      data: { status },
    });
  },

  async confirmPrint(restaurantId: string, orderId: string) {
    return prisma.order.update({
      where: { id: orderId, restaurantId },
      data: { printConfirmed: true, printedAt: new Date() },
    });
  },
};
