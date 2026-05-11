import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ restaurantId: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  logo: z.string().url().optional().nullable(),
  isOpen: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId, deletedAt: null },
    include: {
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
      deliveryZones: true,
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
  return NextResponse.json({ data: restaurant });
}

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "OWNER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: (() => {
      const { settings, ...rest } = parsed.data;
      return {
        ...rest,
        ...(settings !== undefined ? { settings: settings as Prisma.InputJsonValue } : {}),
      };
    })(),
  });

  return NextResponse.json({ data: restaurant });
}
