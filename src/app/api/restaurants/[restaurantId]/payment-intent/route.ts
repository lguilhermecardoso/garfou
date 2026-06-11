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
 * POST /api/restaurants/[restaurantId]/payment-intent
 *
 * Creates an order in the DB with PENDING payment status, then generates a
 * Stripe PIX PaymentIntent. Returns the PIX QR code so the customer can pay
 * before the kitchen starts preparing.
 *
 * On successful PIX payment, the Stripe webhook updates paymentStatus → PAID.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Graceful degradation: Stripe not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Pagamento online não configurado neste restaurante." },
        { status: 503 }
      );
    }

    const { restaurantId } = await params;

    // Rate limiting for public route
    const ip = getRequestIp(req);
    const rate = checkRateLimit({
      key: `payment-intent:${restaurantId}:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco." }, { status: 429 });
    }

    // Validate restaurant exists and is open
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, deletedAt: null },
      select: { id: true, name: true, isOpen: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante não encontrado." }, { status: 404 });
    }

    if (!restaurant.isOpen) {
      return NextResponse.json({ error: "Restaurante fechado no momento." }, { status: 400 });
    }

    const body = await req.json();

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    // Create the order with PENDING payment status
    const order = await orderService.createOrder(restaurantId, parsed.data, undefined);

    // Calculate amount in centavos — add R$1 platform service fee
    const PLATFORM_FEE_CENTS = 100; // R$ 1,00
    const orderAmountCents = Math.round(Number(order.total) * 100);
    const amountInCents = orderAmountCents + PLATFORM_FEE_CENTS;

    if (orderAmountCents < 100) {
      await prisma.order.delete({ where: { id: order.id } });
      return NextResponse.json(
        { error: "Valor mínimo para pagamento online é R$ 1,00." },
        { status: 400 }
      );
    }

    // Create Stripe PIX PaymentIntent
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "brl",
      payment_method_types: ["pix"],
      payment_method_data: { type: "pix" },
      confirm: true,
      // PIX expires in 1 hour
      payment_method_options: {
        pix: { expires_after_seconds: 3600 },
      },
      description: `Pedido #${order.orderNumber} — ${restaurant.name}`,
      metadata: {
        orderId: order.id,
        restaurantId,
        orderNumber: String(order.orderNumber),
      },
    });

    // Save the paymentIntentId on the order + create platform fee record
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: paymentIntent.id },
      }),
      prisma.platformFee.create({
        data: {
          orderId: order.id,
          restaurantId,
          amount: 1.0,
          paymentMethod: "PIX",
          stripePaymentIntentId: paymentIntent.id,
        },
      }),
    ]);

    const pixAction = paymentIntent.next_action?.pix_display_qr_code;

    return NextResponse.json(
      {
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          platformFee: 1.0,
          paymentIntentId: paymentIntent.id,
          pixQrCodeUrl: pixAction?.image_url_svg ?? pixAction?.image_url_png ?? null,
          pixCopyPaste: pixAction?.data ?? null,
          expiresAt: paymentIntent.payment_method_options?.pix?.expires_after_seconds
            ? new Date(Date.now() + 3600 * 1000).toISOString()
            : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[PAYMENT INTENT POST]", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
