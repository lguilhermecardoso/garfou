import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/order.service";
import { createOrderSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import type { OrderStatus } from "@prisma/client";

interface Params {
  params: Promise<{ restaurantId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { restaurantId } = await params;
    const access = await requireRole(restaurantId, "KITCHEN");
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
    const statuses = status ? (status.split(",") as OrderStatus[]) : undefined;

    const result = await orderService.getOrders(restaurantId, {
      status: statuses,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ORDERS GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const { restaurantId } = await params;

    if (session?.user) {
      const access = await requireRole(restaurantId, "WAITER");
      if ("error" in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
    } else {
      const ip = getRequestIp(req);
      const rate = checkRateLimit({
        key: `orders:public:${restaurantId}:${ip}`,
        limit: 30,
        windowMs: 60_000,
      });

      if (!rate.allowed) {
        return NextResponse.json(
          { error: "Muitas tentativas de pedido. Aguarde um pouco." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rate.retryAfterSeconds),
              "X-RateLimit-Remaining": String(rate.remaining),
            },
          }
        );
      }
    }

    const body = await req.json();

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const order = await orderService.createOrder(
      restaurantId,
      parsed.data,
      session?.user?.id
    );

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error("[ORDERS POST]", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
