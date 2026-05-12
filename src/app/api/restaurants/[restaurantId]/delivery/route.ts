import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string }> };

const deliveryZoneSchema = z.object({
  name: z.string().min(1).max(100),
  fee: z.number().min(0),
  estimatedMinutes: z.number().int().min(1).default(30),
  isActive: z.boolean().default(true),
});

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const zones = await prisma.deliveryZone.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: zones });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = deliveryZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const zone = await prisma.deliveryZone.create({
    data: { ...parsed.data, restaurantId },
  });

  return NextResponse.json({ data: zone }, { status: 201 });
}
