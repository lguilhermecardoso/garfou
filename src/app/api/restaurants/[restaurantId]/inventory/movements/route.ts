/**
 * GET /api/restaurants/[restaurantId]/inventory/movements
 *
 * Returns paginated inventory movements for the restaurant.
 * Optionally filtered by itemId.
 *
 * Query params:
 *  - itemId?: Filter by specific inventory item
 *  - page?: Page number (default: 1)
 *  - limit?: Items per page (default: 50, max: 200)
 *
 * Access: MANAGER or above
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

interface Params {
  params: Promise<{ restaurantId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { restaurantId } = await params;

    const access = await requireRole(restaurantId, "MANAGER");
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = itemId ? { restaurantId, itemId } : { restaurantId };

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          item: { select: { id: true, name: true, unit: true } },
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    // Fetch user names separately (avoid joining user table broadly)
    const userIds = [...new Set(movements.map((m) => m.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const data = movements.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      itemName: m.item.name,
      itemUnit: m.item.unit,
      type: m.type,
      quantity: Number(m.quantity),
      unitCost: Number(m.unitCost),
      reason: m.reason,
      userName: userMap.get(m.userId) ?? "—",
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
