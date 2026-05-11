import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

type Params = { params: Promise<{ restaurantId: string; productId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId, productId } = await params;
  const access = await requireRole(restaurantId, "WAITER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const product = await prisma.product.findFirst({
    where: { id: productId, restaurantId, deletedAt: null },
    include: { addons: true },
  });

  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json({ data: product });
}

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId, productId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();

  const result = await prisma.product.updateMany({
    where: { id: productId, restaurantId, deletedAt: null },
    data: {
      name: body.name,
      description: body.description,
      price: body.price !== undefined ? Number(body.price) : undefined,
      categoryId: body.categoryId,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
      isInternalOnly: body.isInternalOnly,
      image: body.image,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { restaurantId, productId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.product.updateMany({
    where: { id: productId, restaurantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
