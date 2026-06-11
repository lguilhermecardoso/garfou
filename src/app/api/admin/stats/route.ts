import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;

  const dateFilter =
    from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {};

  const [feesAgg, pendingCount, restaurantsCount, recentFees] = await Promise.all([
    // Sum of collected platform fees
    prisma.platformFee.aggregate({
      where: { collectedAt: { not: null }, ...dateFilter },
      _sum: { amount: true },
      _count: true,
    }),
    // Pending (not yet collected)
    prisma.platformFee.count({ where: { collectedAt: null } }),
    // Total active restaurants
    prisma.restaurant.count({ where: { deletedAt: null } }),
    // Recent collected fees with restaurant info
    prisma.platformFee.findMany({
      where: { collectedAt: { not: null }, ...dateFilter },
      include: {
        order: { select: { orderNumber: true, total: true } },
        restaurant: { select: { name: true, slug: true } },
      },
      orderBy: { collectedAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    data: {
      collectedTotal: Number(feesAgg._sum.amount ?? 0),
      collectedCount: feesAgg._count,
      pendingCount,
      restaurantsCount,
      recentFees: recentFees.map((fee) => ({
        id: fee.id,
        restaurantName: fee.restaurant.name,
        restaurantSlug: fee.restaurant.slug,
        orderNumber: fee.order.orderNumber,
        orderTotal: Number(fee.order.total),
        amount: Number(fee.amount),
        paymentMethod: fee.paymentMethod,
        collectedAt: fee.collectedAt,
        createdAt: fee.createdAt,
      })),
    },
  });
}
