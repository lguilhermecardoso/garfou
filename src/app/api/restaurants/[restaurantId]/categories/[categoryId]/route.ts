import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

type Params = { params: Promise<{ restaurantId: string; categoryId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId, categoryId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const category = await prisma.category.updateMany({
    where: { id: categoryId, restaurantId, deletedAt: null },
    data: {
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    },
  });

  if (category.count === 0) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { restaurantId, categoryId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.category.updateMany({
    where: { id: categoryId, restaurantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
