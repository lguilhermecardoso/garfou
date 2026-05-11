import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

type Params = { params: Promise<{ restaurantId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "OWNER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId, deletedAt: null },
    select: { stripeCustomerId: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
  }

  if (!restaurant.stripeCustomerId) {
    return NextResponse.json(
      { error: "Nenhuma assinatura encontrada para este restaurante" },
      { status: 400 }
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const returnUrl = `${origin}/dashboard/${restaurantId}/settings/billing`;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: restaurant.stripeCustomerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portalSession.url });
}
