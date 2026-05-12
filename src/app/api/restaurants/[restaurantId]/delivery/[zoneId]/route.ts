import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string; zoneId: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fee: z.number().min(0).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId, zoneId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const zone = await prisma.deliveryZone.findFirst({ where: { id: zoneId, restaurantId } });
  if (!zone) return NextResponse.json({ error: "Zona não encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.deliveryZone.update({
    where: { id: zoneId },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { restaurantId, zoneId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const zone = await prisma.deliveryZone.findFirst({ where: { id: zoneId, restaurantId } });
  if (!zone) return NextResponse.json({ error: "Zona não encontrada" }, { status: 404 });

  await prisma.deliveryZone.delete({ where: { id: zoneId } });

  return new NextResponse(null, { status: 204 });
}
