import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { stripe, STRIPE_PLANS } from "@/lib/stripe";

type Params = { params: Promise<{ restaurantId: string }> };

// Strip priceId before sending to client
const PUBLIC_PLANS = Object.fromEntries(
  Object.entries(STRIPE_PLANS).map(([key, plan]) => {
    const { priceId: _priceId, ...rest } = plan;
    return [key, rest];
  })
) as Record<
  keyof typeof STRIPE_PLANS,
  Omit<(typeof STRIPE_PLANS)[keyof typeof STRIPE_PLANS], "priceId">
>;

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "OWNER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId, deletedAt: null },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
  }

  // Enrich with real-time Stripe subscription data
  let currentPlanKey: string | null = null;
  let currentPeriodEnd: string | null = null;
  let cancelAtPeriodEnd = false;

  if (restaurant.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(restaurant.stripeSubscriptionId);
      // During trial, current_period_end is undefined — use trial_end instead
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subAny = sub as any;
      const periodEnd = subAny.current_period_end ?? subAny.trial_end ?? null;
      currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
      cancelAtPeriodEnd = subAny.cancel_at_period_end;

      const priceId = subAny.items.data[0]?.price.id;
      if (priceId) {
        for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
          if (plan.priceId === priceId) {
            currentPlanKey = key;
            break;
          }
        }
      }

      // Sync status in case it drifted
      const stripeStatus = subAny.status.toUpperCase() as
        | "ACTIVE"
        | "TRIALING"
        | "PAST_DUE"
        | "CANCELED"
        | "UNPAID";
      if (stripeStatus !== restaurant.subscriptionStatus) {
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { subscriptionStatus: stripeStatus },
        });
        restaurant.subscriptionStatus = stripeStatus;
      }
    } catch {
      // Stripe unavailable — return DB data only
    }
  }

  return NextResponse.json({
    data: {
      stripeCustomerId: restaurant.stripeCustomerId,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
      subscriptionStatus: restaurant.subscriptionStatus,
      trialEndsAt: restaurant.trialEndsAt,
      currentPlanKey,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      plans: PUBLIC_PLANS,
    },
  });
}
