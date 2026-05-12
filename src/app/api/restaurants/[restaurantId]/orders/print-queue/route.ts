import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/order.service";

interface Params {
  params: Promise<{ restaurantId: string }>;
}

// Print Agent polling endpoint — auth via API key
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "API key obrigatória" }, { status: 401 });
    }

    // TODO: validate API key against restaurant settings
    const { restaurantId } = await params;

    const queue = await orderService.getPrintQueue(restaurantId);

    const jobs = queue.map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: "NEW_ORDER",
      tableNumber: order.tableNumber,
      notes: order.notes,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.unitPrice),
        notes: item.notes,
        splits: item.splits.map((split) => ({
          splitIndex: split.splitIndex,
          productName: split.productName,
        })),
        selectedOptions: item.selectedOptions.map((selection) => ({
          optionName: selection.optionName,
          quantity: selection.quantity,
          isRemoval: selection.isRemoval,
        })),
        addons: item.addons.map((a) => ({
          name: a.addon.name,
          quantity: a.quantity,
        })),
      })),
    }));

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("[PRINT QUEUE GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
