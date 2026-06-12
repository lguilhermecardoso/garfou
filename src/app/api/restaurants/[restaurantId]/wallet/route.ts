import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

type Params = { params: Promise<{ restaurantId: string }> };

// Stripe fee estimates for Brazil
// Cards: 3.49% + R$ 0.39 per transaction
// PIX:   0.99% per transaction
const CARD_FEE_PERCENT = 0.0349;
const CARD_FEE_FIXED = 0.39;
const PIX_FEE_PERCENT = 0.0099;

function calcFee(total: number, paymentMethod: string): number {
  if (paymentMethod === "PIX") {
    return total * PIX_FEE_PERCENT;
  }
  return total * CARD_FEE_PERCENT + CARD_FEE_FIXED;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  // Treat date strings (YYYY-MM-DD) as BRT midnight; ISO strings pass through as-is
  const from = fromStr
    ? /^\d{4}-\d{2}-\d{2}$/.test(fromStr)
      ? new Date(fromStr + "T00:00:00-03:00")
      : new Date(fromStr)
    : undefined;
  const to = toStr
    ? /^\d{4}-\d{2}-\d{2}$/.test(toStr)
      ? new Date(toStr + "T23:59:59-03:00")
      : new Date(toStr)
    : undefined;

  // All Stripe-confirmed orders (paymentStatus = PAID and stripePaymentIntentId set)
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      paymentStatus: "PAID",
      stripePaymentIntentId: { not: null },
      ...(from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      total: true,
      discount: true,
      paymentMethod: true,
      type: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let grossTotal = 0;
  let totalFees = 0;

  const transactions = orders.map((order) => {
    const gross = Number(order.total);
    const fee = calcFee(gross, order.paymentMethod ?? "");
    grossTotal += gross;
    totalFees += fee;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      gross,
      fee: parseFloat(fee.toFixed(2)),
      net: parseFloat((gross - fee).toFixed(2)),
      discount: Number(order.discount ?? 0),
      paymentMethod: order.paymentMethod,
      type: order.type,
      customer: order.customer,
    };
  });

  return NextResponse.json({
    data: {
      grossTotal: parseFloat(grossTotal.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      netTotal: parseFloat((grossTotal - totalFees).toFixed(2)),
      transactionCount: orders.length,
      transactions,
    },
  });
}
