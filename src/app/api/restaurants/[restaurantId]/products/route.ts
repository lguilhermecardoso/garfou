import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { createProductSchema } from "@/lib/validations";

type Params = { params: Promise<{ restaurantId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "WAITER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const products = await prisma.product.findMany({
    where: {
      restaurantId,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      addons: { orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: products });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = createProductSchema.safeParse({ ...body, restaurantId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      restaurantId,
      ...parsed.data,
    },
  });
  return NextResponse.json({ data: product }, { status: 201 });
}
