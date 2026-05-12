/**
 * TabRepository
 *
 * Data access layer for Tab domain (comandas/bills that aggregate orders).
 * Enforces multi-tenancy via restaurantId.
 */

import { prisma } from "@/lib/db";
import { Prisma, type TabStatus, type PaymentMethod } from "@prisma/client";

export interface CreateTabInput {
  tableId?: string;
  customerId?: string;
  guestCustomerName?: string; // Cliente avulso (não salvo em customers)
  notes?: string;
}

export interface CloseTabInput {
  paymentMethod: PaymentMethod;
  discount?: number;
  serviceCharge?: number;
  coverCharge?: number;
  notes?: string;
}

export interface FindTabsFilters {
  status?: TabStatus;
  tableId?: string;
  customerId?: string;
}

export class TabRepository {
  /**
   * Find all tabs for a restaurant, with optional filters.
   */
  async findMany(restaurantId: string, filters?: FindTabsFilters) {
    const where: Prisma.TabWhereInput = {
      restaurantId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.tableId) {
      where.tableId = filters.tableId;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    return prisma.tab.findMany({
      where,
      include: {
        table: true,
        customer: { select: { id: true, name: true, phone: true } },
        openedByUser: { select: { id: true, name: true } },
        closedByUser: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: [
        { status: "asc" }, // OPEN first
        { createdAt: "desc" },
      ],
    });
  }

  /**
   * Find tab by ID with full order details (tenant-guarded).
   */
  async findById(restaurantId: string, tabId: string) {
    return prisma.tab.findFirst({
      where: {
        id: tabId,
        restaurantId,
      },
      include: {
        table: true,
        customer: { select: { id: true, name: true, phone: true, email: true } },
        openedByUser: { select: { id: true, name: true } },
        closedByUser: { select: { id: true, name: true } },
        orders: {
          include: {
            items: {
              include: {
                product: { select: { name: true } },
                addons: { include: { addon: { select: { name: true } } } },
                selectedOptions: true,
                splits: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  /**
   * Create a new tab (open comanda).
   */
  async create(restaurantId: string, data: CreateTabInput, openedBy: string) {
    return prisma.tab.create({
      data: {
        restaurantId,
        tableId: data.tableId,
        customerId: data.customerId,
        guestCustomerName: data.guestCustomerName,
        openedBy,
        notes: data.notes,
        status: "OPEN",
      },
      include: {
        table: true,
        customer: { select: { id: true, name: true, phone: true } },
        openedByUser: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Recalculate tab total from confirmed/finalized orders.
   * Returns the new total.
   */
  async updateTotal(restaurantId: string, tabId: string): Promise<Prisma.Decimal> {
    // Get all orders for this tab that should count toward total
    // Includes all orders except CANCELLED
    const orders = await prisma.order.findMany({
      where: {
        tabId,
        restaurantId,
        status: {
          in: [
            "NOVO_PEDIDO",
            "AGUARDANDO_CONFIRMACAO",
            "CONFIRMADO",
            "EM_PREPARO",
            "PRONTO",
            "SAIU_PARA_ENTREGA",
            "FINALIZADO",
          ],
        },
      },
      select: { total: true },
    });

    const total = orders.reduce((sum, order) => sum.add(order.total), new Prisma.Decimal(0));

    await prisma.tab.updateMany({
      where: { id: tabId, restaurantId },
      data: { total },
    });

    return total;
  }

  /**
   * Close/pay a tab.
   */
  async close(restaurantId: string, tabId: string, data: CloseTabInput, closedBy: string) {
    const discount = new Prisma.Decimal(data.discount ?? 0);
    const serviceCharge = new Prisma.Decimal(data.serviceCharge ?? 0);
    const coverCharge = new Prisma.Decimal(data.coverCharge ?? 0);

    // Get current total
    const tab = await prisma.tab.findFirst({
      where: { id: tabId, restaurantId },
      select: { total: true, notes: true },
    });

    if (!tab) {
      throw new Error("Tab not found");
    }

    // Total final = total - desconto + taxa de serviço + couvert
    const finalTotal = tab.total.minus(discount).plus(serviceCharge).plus(coverCharge);

    return prisma.tab.update({
      where: { id: tabId },
      data: {
        status: "PAID",
        paymentMethod: data.paymentMethod,
        discount,
        serviceCharge,
        coverCharge,
        finalTotal,
        closedBy,
        closedAt: new Date(),
        paidAt: new Date(),
        notes: data.notes ? `${tab.notes || ""}\n${data.notes}`.trim() : undefined,
      },
      include: {
        table: true,
        customer: { select: { id: true, name: true, phone: true } },
        openedByUser: { select: { id: true, name: true } },
        closedByUser: { select: { id: true, name: true } },
        orders: {
          include: {
            items: {
              include: {
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Cancel a tab (and all its orders).
   */
  async cancel(restaurantId: string, tabId: string) {
    // Cancel all orders first
    await prisma.order.updateMany({
      where: {
        tabId,
        restaurantId,
        status: { notIn: ["FINALIZADO", "CANCELADO"] },
      },
      data: { status: "CANCELADO" },
    });

    // Cancel tab
    return prisma.tab.updateMany({
      where: { id: tabId, restaurantId },
      data: {
        status: "CANCELLED",
        closedAt: new Date(),
      },
    });
  }
}
