import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { startOfDayBRT } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "CASHIER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const from = startOfDayBRT();

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: { gte: from },
      status: { not: "CANCELADO" },
      // Exclude Stripe orders not yet paid
      NOT: { stripePaymentIntentId: { not: null }, paymentStatus: "PENDING" },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      type: true,
      total: true,
      deliveryFee: true,
      paymentMethod: true,
      createdAt: true,
      tableNumber: true,
      customer: { select: { name: true, phone: true } },
      tab: {
        select: { guestCustomerName: true, customer: { select: { name: true, phone: true } } },
      },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0);
  const totalOrders = orders.length;

  return NextResponse.json({
    data: {
      date: from.toISOString(),
      totalOrders,
      totalRevenue,
      orders: orders.map((o) => {
        const customerName =
          o.customer?.name ?? o.tab?.customer?.name ?? o.tab?.guestCustomerName ?? null;
        const customerPhone = o.customer?.phone ?? o.tab?.customer?.phone ?? null;
        return {
          orderNumber: o.orderNumber,
          status: o.status,
          type: o.type,
          paymentMethod: o.paymentMethod,
          total: Number(o.total),
          deliveryFee: o.deliveryFee ? Number(o.deliveryFee) : 0,
          createdAt: o.createdAt.toISOString(),
          customerName,
          customerPhone,
          tableNumber: o.tableNumber,
          items: o.items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
        };
      }),
    },
  });
}
