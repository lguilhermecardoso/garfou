import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string; customerId: string }> };

const updateCustomerSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request, { params }: Params) {
  const { restaurantId, customerId } = await params;
  const access = await requireRole(restaurantId, "WAITER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId, deletedAt: null },
    include: {
      orders: {
        select: { id: true, total: true, createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { orders: true } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId, customerId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId, deletedAt: null },
  });

  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const { restaurantId, customerId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId, deletedAt: null },
  });

  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  // Soft delete
  await prisma.customer.update({
    where: { id: customerId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
