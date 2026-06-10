import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

type Params = { params: Promise<{ restaurantId: string }> };

const manualOrderSchema = z.object({
  date: z.string().min(1, "Data obrigatória"),
  total: z.number().positive("Valor deve ser positivo"),
  type: z.enum(["DINE_IN", "TAKEOUT", "DELIVERY"]),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "VOUCHER"]).optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  createFinanceEntry: z.boolean().optional().default(true),
});

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = manualOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const {
    date,
    total,
    type,
    paymentMethod,
    notes,
    customerName,
    customerPhone,
    createFinanceEntry,
  } = parsed.data;

  const createdAt = new Date(date);
  if (isNaN(createdAt.getTime())) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  // Prevent future dates
  if (createdAt > new Date()) {
    return NextResponse.json(
      { error: "Data não pode ser no futuro. Use o fluxo normal de pedidos." },
      { status: 400 }
    );
  }

  // Get next orderNumber for this restaurant
  const lastOrder = await prisma.order.findFirst({
    where: { restaurantId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

  // Find or create customer if phone or name provided
  let customerId: string | undefined;
  if (customerPhone?.trim() || customerName?.trim()) {
    const phone = customerPhone?.replace(/\D/g, "") || null;
    const name = customerName?.trim() || "Cliente";

    if (phone) {
      const existing = await prisma.customer.findFirst({
        where: { restaurantId, phone },
        select: { id: true },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const created = await prisma.customer.create({
          data: { restaurantId, name, phone },
          select: { id: true },
        });
        customerId = created.id;
      }
    } else {
      const created = await prisma.customer.create({
        data: { restaurantId, name },
        select: { id: true },
      });
      customerId = created.id;
    }
  }

  // Create order with past date
  const order = await prisma.order.create({
    data: {
      restaurantId,
      orderNumber,
      type,
      status: "FINALIZADO",
      subtotal: total,
      discount: 0,
      deliveryFee: 0,
      total,
      paymentMethod: paymentMethod ?? null,
      paymentStatus: "PAID",
      notes: notes || null,
      customerId: customerId ?? null,
      createdAt,
      updatedAt: createdAt,
    },
    select: { id: true, orderNumber: true },
  });

  // Create finance entry if requested
  if (createFinanceEntry) {
    const typeLabel = type === "DINE_IN" ? "Mesa" : type === "TAKEOUT" ? "Balcão" : "Delivery";
    await prisma.financeEntry.create({
      data: {
        restaurantId,
        type: "REVENUE",
        category: "Vendas",
        description: `Pedido #${orderNumber} — ${typeLabel}${customerName ? ` (${customerName})` : ""}`,
        amount: total,
        date: createdAt,
        paymentMethod: paymentMethod ?? null,
        orderId: order.id,
        userId: access.userId,
      },
    });
  }

  return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber }, { status: 201 });
}
