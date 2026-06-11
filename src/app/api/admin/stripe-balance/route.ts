import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });

  const balance = await stripe.balance.retrieve();

  // Filter BRL amounts (platform operates in BRL)
  const brlAvailable = balance.available.find((b) => b.currency === "brl");
  const brlPending = balance.pending.find((b) => b.currency === "brl");

  return NextResponse.json({
    data: {
      available: (brlAvailable?.amount ?? 0) / 100, // convert cents → reais
      pending: (brlPending?.amount ?? 0) / 100,
      total: ((brlAvailable?.amount ?? 0) + (brlPending?.amount ?? 0)) / 100,
      currency: "BRL",
      livemode: balance.livemode,
    },
  });
}
