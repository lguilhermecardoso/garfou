import { NextRequest, NextResponse } from "next/server";
import { validateBearerToken, extractBearerToken } from "@/lib/device-auth";
import { prisma } from "@/lib/db";

type Params = Promise<{ orderId: string }>;

/**
 * GET /api/bff/orders/[orderId]
 *
 * Busca detalhes de um pedido específico.
 * Autenticação via Bearer token no header Authorization.
 */
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    // Valida bearer token
    const authHeader = req.headers.get("authorization");
    const bearerToken = extractBearerToken(authHeader);
    const deviceAuth = await validateBearerToken(bearerToken);

    if (!deviceAuth) {
      return NextResponse.json(
        { error: "Não autorizado. Token inválido ou expirado." },
        { status: 401 }
      );
    }

    const { orderId } = await params;

    // Busca pedido (validando que pertence ao restaurante do device)
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: deviceAuth.restaurantId,
      },
      include: {
        tab: {
          select: {
            id: true,
            tableId: true,
            guestCustomerName: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        waiter: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            addons: {
              include: {
                addon: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            selectedOptions: {
              select: {
                id: true,
                optionId: true,
                quantity: true,
                unitPrice: true,
                optionName: true,
                isRemoval: true,
              },
            },
            splits: {
              select: {
                id: true,
                splitIndex: true,
                productId: true,
                productName: true,
                unitPrice: true,
              },
              orderBy: {
                splitIndex: "asc",
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order (BFF):", error);
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 });
  }
}

/**
 * PATCH /api/bff/orders/[orderId]
 *
 * Atualiza status de um pedido.
 * Autenticação via Bearer token no header Authorization.
 *
 * Body:
 * {
 *   "status": "EM_PREPARO" | "PRONTO" | "SAIU_PARA_ENTREGA" | "FINALIZADO" | "CANCELADO"
 * }
 */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    // Valida bearer token
    const authHeader = req.headers.get("authorization");
    const bearerToken = extractBearerToken(authHeader);
    const deviceAuth = await validateBearerToken(bearerToken);

    if (!deviceAuth) {
      return NextResponse.json(
        { error: "Não autorizado. Token inválido ou expirado." },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    const body = await req.json();
    const { status } = body;

    // Valida status
    const validStatuses = [
      "CONFIRMADO",
      "EM_PREPARO",
      "PRONTO",
      "SAIU_PARA_ENTREGA",
      "FINALIZADO",
      "CANCELADO",
    ];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Busca pedido para validar
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: deviceAuth.restaurantId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // Atualiza status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        tab: {
          select: {
            id: true,
            tableId: true,
            guestCustomerName: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        waiter: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Status atualizado com sucesso",
    });
  } catch (error) {
    console.error("Error updating order status (BFF):", error);
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 });
  }
}
