import { NextRequest, NextResponse } from "next/server";
import { validateBearerToken, extractBearerToken } from "@/lib/device-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/bff/orders
 *
 * Lista pedidos do restaurante do dispositivo.
 * Autenticação via Bearer token no header Authorization.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Query params:
 * - status: filtro de status (comma-separated)
 * - page: número da página (default: 1)
 * - pageSize: itens por página (default: 50)
 */
export async function GET(req: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // Build where clause
    const where: {
      restaurantId: string;
      status?: { in: string[] };
    } = {
      restaurantId: deviceAuth.restaurantId,
    };

    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim());
      where.status = { in: statuses };
    }

    // Fetch orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      device: {
        type: deviceAuth.deviceType,
        restaurant: deviceAuth.restaurant,
      },
    });
  } catch (error) {
    console.error("Error fetching orders (BFF):", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
  }
}

/**
 * POST /api/bff/orders
 *
 * Cria um novo pedido via BFF.
 * Autenticação via Bearer token no header Authorization.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * - type: DINE_IN | TAKEOUT | DELIVERY
 * - tabId?: string
 * - tableNumber?: string
 * - customerId?: string
 * - items: array de itens do pedido
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { type, tabId, tableNumber, customerId, items } = body;

    // Validações básicas
    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Dados inválidos. Tipo e itens são obrigatórios." },
        { status: 422 }
      );
    }

    // Criar pedido
    const order = await prisma.order.create({
      data: {
        restaurantId: deviceAuth.restaurantId,
        type,
        status: "NOVO_PEDIDO",
        tabId: tabId || null,
        tableNumber: tableNumber || null,
        customerId: customerId || null,
        subtotal: 0,
        discount: 0,
        deliveryFee: 0,
        total: 0,
        items: {
          create: items.map(
            (item: {
              productId: string;
              quantity: number;
              notes?: string;
              selectedOptions?: Array<{ optionId: string; quantity: number; isRemoval?: boolean }>;
              splits?: Array<{ splitIndex: number; flavorProductId: string }>;
            }) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: 0, // Will be calculated
              notes: item.notes || null,
              selectedOptions:
                item.selectedOptions?.length > 0
                  ? {
                      create: item.selectedOptions.map(
                        (opt: { optionId: string; quantity: number; isRemoval?: boolean }) => ({
                          optionId: opt.optionId,
                          quantity: opt.quantity,
                          unitPrice: 0, // Will be calculated
                          optionName: "",
                          isRemoval: opt.isRemoval || false,
                        })
                      ),
                    }
                  : undefined,
              splits:
                item.splits?.length > 0
                  ? {
                      create: item.splits.map(
                        (split: { splitIndex: number; flavorProductId: string }) => ({
                          splitIndex: split.splitIndex,
                          productId: split.flavorProductId,
                          unitPrice: 0, // Will be calculated
                          productName: "",
                        })
                      ),
                    }
                  : undefined,
            })
          ),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            selectedOptions: true,
            splits: true,
          },
        },
      },
    });

    // Calcular preços dos itens
    let subtotal = 0;
    for (const item of order.items) {
      const product = item.product;
      let itemTotal = product.price * item.quantity;

      // Calcular preço das opções
      if (item.selectedOptions.length > 0) {
        for (const opt of item.selectedOptions) {
          const modifier = await prisma.modifier.findUnique({
            where: { id: opt.optionId },
          });
          if (modifier) {
            await prisma.orderItemOption.update({
              where: { id: opt.id },
              data: {
                unitPrice: modifier.price,
                optionName: modifier.name,
              },
            });
            itemTotal += modifier.price * opt.quantity * item.quantity;
          }
        }
      }

      // Calcular preço dos splits
      if (item.splits.length > 0) {
        const flavorPrices = await Promise.all(
          item.splits.map(async (split) => {
            const flavor = await prisma.product.findUnique({
              where: { id: split.productId },
            });
            return flavor ? flavor.price : 0;
          })
        );
        const maxPrice = Math.max(...flavorPrices);
        itemTotal = maxPrice * item.quantity;

        for (let i = 0; i < item.splits.length; i++) {
          const split = item.splits[i];
          const flavor = await prisma.product.findUnique({
            where: { id: split.productId },
          });
          if (flavor) {
            await prisma.orderItemSplit.update({
              where: { id: split.id },
              data: {
                unitPrice: flavor.price,
                productName: flavor.name,
              },
            });
          }
        }
      }

      await prisma.orderItem.update({
        where: { id: item.id },
        data: { unitPrice: product.price },
      });

      subtotal += itemTotal;
    }

    // Atualizar totais do pedido
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        total: subtotal,
      },
      include: {
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

    // Atualizar total da comanda se houver
    if (tabId) {
      const tab = await prisma.tab.findUnique({
        where: { id: tabId },
        include: {
          orders: true,
        },
      });

      if (tab) {
        const tabSubtotal = tab.orders.reduce((sum, order) => sum + order.subtotal, 0);
        await prisma.tab.update({
          where: { id: tabId },
          data: {
            subtotal: tabSubtotal,
            total: tabSubtotal - tab.discount,
            finalTotal: tabSubtotal - tab.discount,
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order (BFF):", error);
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
  }
}
