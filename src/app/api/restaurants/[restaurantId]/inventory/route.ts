import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string }> };

const schema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  currentStock: z.number().min(0).default(0),
  minimumStock: z.number().min(0).default(0),
  averageCost: z.number().min(0).default(0),
});

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const items = await prisma.inventoryItem.findMany({
    where: { restaurantId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: items });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.inventoryItem.create({
    data: { ...parsed.data, restaurantId },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
