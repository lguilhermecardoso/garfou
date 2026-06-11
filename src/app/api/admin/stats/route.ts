import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { STRIPE_PLANS } from "@/lib/stripe";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;

  const dateFilter =
    from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {};

  const [feesAgg, pendingCount, recentFees, subscriptionStats, allRestaurants] = await Promise.all([
    prisma.platformFee.aggregate({
      where: { collectedAt: { not: null }, ...dateFilter },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.platformFee.count({ where: { collectedAt: null } }),
    prisma.platformFee.findMany({
      where: { collectedAt: { not: null }, ...dateFilter },
      include: {
        order: { select: { orderNumber: true, total: true } },
        restaurant: { select: { name: true, slug: true } },
      },
      orderBy: { collectedAt: "desc" },
      take: 100,
    }),
    // Subscription counts by status
    prisma.restaurant.groupBy({
      by: ["subscriptionStatus"],
      where: { deletedAt: null },
      _count: true,
    }),
    // Active restaurants with stripe subscription info for MRR
    prisma.restaurant.findMany({
      where: { deletedAt: null, subscriptionStatus: { in: ["ACTIVE", "TRIALING"] } },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        trialEndsAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const g of subscriptionStats) {
    statusMap[g.subscriptionStatus] = g._count;
  }

  const totalRestaurants = subscriptionStats.reduce((acc, g) => acc + g._count, 0);

  // Estimate MRR: we can't know which plan without calling Stripe for each sub.
  // Use the cheapest plan price as a conservative floor; real MRR is in Stripe dashboard.
  const activePaying = statusMap["ACTIVE"] ?? 0;
  // Only count restaurants that have an active Stripe subscription (hasStripeSubscription)
  const payingWithStripe = allRestaurants.filter(
    (r) => r.subscriptionStatus === "ACTIVE" && r.stripeSubscriptionId
  ).length;
  const estimatedMRR = payingWithStripe * STRIPE_PLANS.STARTER.price; // cents

  return NextResponse.json({
    data: {
      // Platform fees
      collectedTotal: Number(feesAgg._sum.amount ?? 0),
      collectedCount: feesAgg._count,
      pendingCount,
      // Subscriptions
      totalRestaurants,
      activePaying,
      payingWithStripe,
      trialing: statusMap["TRIALING"] ?? 0,
      pastDue: statusMap["PAST_DUE"] ?? 0,
      canceled: statusMap["CANCELED"] ?? 0,
      estimatedMRR: estimatedMRR / 100, // in reais, conservative
      // Active restaurant list
      activeRestaurants: allRestaurants.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.subscriptionStatus,
        hasStripeSubscription: !!r.stripeSubscriptionId,
        trialEndsAt: r.trialEndsAt,
        createdAt: r.createdAt,
      })),
      // Fee transactions
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
