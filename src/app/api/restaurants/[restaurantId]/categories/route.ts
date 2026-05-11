import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { createCategorySchema } from "@/lib/validations";

type Params = { params: Promise<{ restaurantId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "WAITER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const categories = await prisma.category.findMany({
    where: { restaurantId, deletedAt: null },
    include: {
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ data: categories });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = createCategorySchema.safeParse({ ...body, restaurantId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const last = await prisma.category.findFirst({
    where: { restaurantId, deletedAt: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      restaurantId,
      ...parsed.data,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json({ data: category }, { status: 201 });
}
