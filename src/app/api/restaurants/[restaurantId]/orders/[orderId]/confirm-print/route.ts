import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/order.service";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";

interface Params {
  params: Promise<{ restaurantId: string; orderId: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    // This endpoint is also accessible by the Print Agent via API key
    const { restaurantId, orderId } = await params;

    const apiKey = _req.headers.get("x-api-key");
    const session = await auth();

    if (!session?.user && !apiKey) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session?.user) {
      const access = await requireRole(restaurantId, "KITCHEN");
      if ("error" in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
    }

    // TODO: validate apiKey against restaurant's configured print agent key

    const order = await orderService.confirmPrint(restaurantId, orderId);
    return NextResponse.json({ data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
