import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { createOrderSchema } from "@/lib/validations";
import { orderService } from "@/features/orders/order.service";
import Stripe from "stripe";

interface Params {
  params: Promise<{ restaurantId: string }>;
}

/**
 * POST /api/restaurants/[restaurantId]/checkout-session
 *
 * Creates an order in the DB with PENDING payment status, then generates a
 * Stripe Checkout Session for card payment. Returns the Stripe hosted URL
 * so the customer can pay and gets redirected back on success/cancel.
 *
 * On successful payment, the Stripe webhook (checkout.session.completed with
 * mode=payment) updates paymentStatus → PAID.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Pagamento online não configurado neste restaurante." },
        { status: 503 }
      );
    }

    const { restaurantId } = await params;

    const ip = getRequestIp(req);
    const rate = checkRateLimit({
      key: `checkout-session:${restaurantId}:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco." }, { status: 429 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, deletedAt: null },
      select: { id: true, name: true, slug: true, isOpen: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante não encontrado." }, { status: 404 });
    }

    if (!restaurant.isOpen) {
      return NextResponse.json({ error: "Restaurante fechado no momento." }, { status: 400 });
    }

    const body = await req.json();
    const { origin, ...orderBody } = body as { origin?: string } & Record<string, unknown>;

    const parsed = createOrderSchema.safeParse(orderBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    // Create the order first (PENDING, CREDIT_CARD)
    const order = await orderService.createOrder(
      restaurantId,
      {
        ...parsed.data,
        paymentMethod: "CREDIT_CARD",
      },
      undefined
    );

    const amountInCents = Math.round(Number(order.total) * 100);

    if (amountInCents < 100) {
      await prisma.order.delete({ where: { id: order.id } });
      return NextResponse.json(
        { error: "Valor mínimo para pagamento online é R$ 1,00." },
        { status: 400 }
      );
    }

    const baseUrl = origin ?? process.env.AUTH_URL ?? "http://localhost:3000";
    const successUrl = `${baseUrl}/menu/${restaurant.slug}?payment=success&orderId=${order.id}`;
    const cancelUrl = `${baseUrl}/menu/${restaurant.slug}?payment=cancelled&orderId=${order.id}`;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Pedido #${order.orderNumber}`,
              description: `${restaurant.name} — ${order.items?.length ?? 1} ${order.items?.length === 1 ? "item" : "itens"}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: order.id,
        restaurantId,
        orderNumber: String(order.orderNumber),
      },
      customer_email: parsed.data.customerEmail || undefined,
    });

    // Save stripePaymentIntentId on the order so the webhook can match it
    if (session.payment_intent) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id,
        },
      });
    }

    return NextResponse.json(
      {
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          sessionUrl: session.url,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CHECKOUT SESSION POST]", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
