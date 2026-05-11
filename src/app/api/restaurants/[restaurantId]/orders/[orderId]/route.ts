import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/order.service";
import { updateOrderStatusSchema } from "@/lib/validations";
import { requireRole } from "@/lib/rbac";

interface Params {
  params: Promise<{ restaurantId: string; orderId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { restaurantId, orderId } = await params;
    const access = await requireRole(restaurantId, "KITCHEN");
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const order = await orderService.getOrder(restaurantId, orderId);
    return NextResponse.json({ data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    const status = message === "Pedido não encontrado" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { restaurantId, orderId } = await params;
    const access = await requireRole(restaurantId, "KITCHEN");
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();

    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const order = await orderService.updateStatus(restaurantId, orderId, parsed.data);
    return NextResponse.json({ data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    const status = message.includes("não encontrado") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
