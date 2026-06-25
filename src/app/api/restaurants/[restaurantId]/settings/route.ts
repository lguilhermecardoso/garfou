import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ restaurantId: string }> };

const operatingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean().default(false),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  logo: z.string().url().optional().nullable(),
  banner: z.string().url().optional().nullable(),
  isOpen: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  operatingHours: z.array(operatingHourSchema).optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

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

  if (!restaurant)
    return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
  return NextResponse.json({ data: restaurant });
}

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "OWNER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const restaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
      ...(parsed.data.address !== undefined && { address: parsed.data.address }),
      ...(parsed.data.city !== undefined && { city: parsed.data.city }),
      ...(parsed.data.state !== undefined && { state: parsed.data.state }),
      ...(parsed.data.logo !== undefined && { logo: parsed.data.logo }),
      ...(parsed.data.banner !== undefined && { banner: parsed.data.banner }),
      ...(parsed.data.isOpen !== undefined && { isOpen: parsed.data.isOpen }),
      ...(parsed.data.settings !== undefined && {
        settings: parsed.data.settings as Prisma.InputJsonValue,
      }),
    },
  });

  if (parsed.data.operatingHours) {
    await prisma.$transaction(
      parsed.data.operatingHours.map((rule) =>
        prisma.operatingHours.upsert({
          where: { restaurantId_dayOfWeek: { restaurantId, dayOfWeek: rule.dayOfWeek } },
          create: { restaurantId, ...rule },
          update: rule,
        })
      )
    );
  }

  return NextResponse.json({ data: restaurant });
}
