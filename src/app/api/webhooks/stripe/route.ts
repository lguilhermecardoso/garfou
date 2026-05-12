import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const restaurantId = session.metadata?.restaurantId;
      if (restaurantId && session.mode === "subscription") {
        // Fetch subscription to get accurate status (may be TRIALING if trial was set)
        const subId = session.subscription as string;
        const sub = await stripe.subscriptions.retrieve(subId);
        const status = sub.status.toUpperCase() as "ACTIVE" | "TRIALING";

        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subId,
            subscriptionStatus: status,
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.restaurant.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          subscriptionStatus: subscription.status.toUpperCase() as
            | "ACTIVE"
            | "PAST_DUE"
            | "CANCELED"
            | "TRIALING",
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.restaurant.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { subscriptionStatus: "CANCELED" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string };
      };
      const subId =
        typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        await prisma.restaurant.updateMany({
          where: { stripeSubscriptionId: subId },
          data: { subscriptionStatus: "PAST_DUE" },
        });
      }
      break;
    }

    case "customer.subscription.trial_will_end": {
      // 3 days before trial ends — could trigger a notification (no-op for now)
      break;
    }
  }

  return NextResponse.json({ received: true });
}
