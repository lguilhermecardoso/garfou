import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { createCouponSchema } from "@/lib/validations";

type Params = { params: Promise<{ restaurantId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const coupons = await prisma.coupon.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return NextResponse.json({ data: coupons });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = createCouponSchema.safeParse({ ...body, restaurantId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  // Duplicate code guard
  const existing = await prisma.coupon.findFirst({
    where: { restaurantId, code: parsed.data.code.toUpperCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "Cupom com este código já existe" }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
    data: { ...parsed.data, code: parsed.data.code.toUpperCase(), restaurantId },
  });

  return NextResponse.json({ data: coupon }, { status: 201 });
}
