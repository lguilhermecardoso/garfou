/**
 * GET /api/restaurants/:restaurantId/orders/by-phone?phone=xxx
 *
 * Get orders by customer phone number (for delivery tracking).
 * Public endpoint - no authentication required.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Telefone é obrigatório" }, { status: 400 });
  }

  // Normalize phone (remove non-digits)
  const normalizedPhone = phone.replace(/\D/g, "");

  if (normalizedPhone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  try {
    // Find customer by phone
    const customer = await prisma.customer.findFirst({
      where: {
        restaurantId,
        phone: {
          contains: normalizedPhone,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({
        data: { customer: null, orders: [] },
        message: "Nenhum pedido encontrado para este telefone",
      });
    }

    // Get orders for this customer
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        customerId: customer.id,
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, image: true } },
            selectedOptions: true,
            splits: true,
            addons: {
              include: {
                addon: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Last 20 orders
    });

    return NextResponse.json({
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
        orders: orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          type: order.type,
          status: order.status,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
          notes: order.notes,
          deliveryAddress: order.deliveryAddress,
          items: order.items.map((item) => ({
            quantity: item.quantity,
            product: item.product,
            unitPrice: item.unitPrice,
            notes: item.notes,
            selectedOptions: item.selectedOptions,
            splits: item.splits,
            addons: item.addons.map((a) => ({
              name: a.addon.name,
              quantity: a.quantity,
              unitPrice: a.unitPrice,
            })),
          })),
        })),
      },
    });
  } catch (error) {
    console.error("[Orders by phone API] Error:", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
  }
}
