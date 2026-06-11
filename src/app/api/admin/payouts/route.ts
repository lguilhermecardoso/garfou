import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

// GET — list recent Stripe payouts
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });

  const payouts = await stripe.payouts.list({ limit: 50 });

  return NextResponse.json({
    data: payouts.data.map((p) => ({
      id: p.id,
      amount: p.amount / 100, // cents → reais
      currency: p.currency.toUpperCase(),
      status: p.status, // paid | pending | in_transit | canceled | failed
      method: p.method, // standard | instant
      arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
      description: p.description,
      createdAt: new Date(p.created * 1000).toISOString(),
    })),
  });
}

// POST — create a manual Stripe payout
const payoutSchema = z.object({
  amountCents: z.number().int().min(100), // minimum R$ 1,00 in cents
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });

  const body = await req.json();
  const parsed = payoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  try {
    const payout = await stripe.payouts.create({
      amount: parsed.data.amountCents,
      currency: "brl",
      description: parsed.data.description ?? "Saque plataforma chamou.delivery",
    });

    return NextResponse.json(
      {
        data: {
          id: payout.id,
          amount: payout.amount / 100,
          status: payout.status,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar saque";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
