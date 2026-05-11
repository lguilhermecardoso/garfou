import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { STRIPE_PLANS } from "@/lib/stripe";

type Params = { params: Promise<{ restaurantId: string }> };

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

  return NextResponse.json({
    data: {
      ...restaurant,
      plans: STRIPE_PLANS,
    },
  });
}
