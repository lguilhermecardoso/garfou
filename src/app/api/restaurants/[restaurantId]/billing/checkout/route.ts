import { NextResponse } from "next/server";
import { stripe, STRIPE_PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string }> };

const bodySchema = z.object({
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
});

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "OWNER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Plano inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { plan } = parsed.data;
  const selectedPlan = STRIPE_PLANS[plan];

  if (!selectedPlan.priceId) {
    return NextResponse.json({ error: "Preço do plano não configurado" }, { status: 500 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId, deletedAt: null },
    select: { name: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
  }

  // If already subscribed, redirect to portal instead
  if (restaurant.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Restaurante já possui assinatura ativa. Use o portal para gerenciar." },
      { status: 409 }
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const successUrl = `${origin}/dashboard/${restaurantId}/settings/billing?success=true`;
  const cancelUrl = `${origin}/dashboard/${restaurantId}/settings/billing?canceled=true`;

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "subscription",
    line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
    metadata: { restaurantId, plan },
    subscription_data: {
      trial_period_days: 7,
      metadata: { restaurantId, plan },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  };

  // Reuse existing Stripe customer if available
  if (restaurant.stripeCustomerId) {
    sessionParams.customer = restaurant.stripeCustomerId;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({ url: session.url });
}
