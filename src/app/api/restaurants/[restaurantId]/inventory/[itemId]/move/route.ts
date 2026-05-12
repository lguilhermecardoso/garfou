import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string; itemId: string }> };

const moveSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number(),
  reason: z.string().optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { restaurantId, itemId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { type, quantity } = parsed.data;
  const { reason } = parsed.data;

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, restaurantId, deletedAt: null as null },
  });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  // Calcular novo estoque baseado no tipo de movimento
  let newStock: number;
  if (type === "ADJUSTMENT") {
    // ADJUSTMENT substitui o valor (não soma)
    newStock = Math.abs(quantity);
  } else {
    // IN adiciona, OUT subtrai
    const delta = type === "OUT" ? -Math.abs(quantity) : Math.abs(quantity);
    newStock = Number(item.currentStock) + delta;
  }

  if (newStock < 0) {
    return NextResponse.json({ error: "Estoque insuficiente" }, { status: 422 });
  }

  const [movement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: { restaurantId, itemId, type, quantity, reason, userId: access.userId },
    }),
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: newStock },
    }),
  ]);

  return NextResponse.json({ data: movement }, { status: 201 });
}
