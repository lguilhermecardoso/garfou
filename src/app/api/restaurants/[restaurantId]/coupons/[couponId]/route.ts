import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

type Params = { params: Promise<{ restaurantId: string; couponId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId, couponId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const coupon = await prisma.coupon.updateMany({
    where: { id: couponId, restaurantId },
    data: body,
  });
  if (coupon.count === 0) return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });

  const updated = await prisma.coupon.findUnique({ where: { id: couponId } });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { restaurantId, couponId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.coupon.updateMany({
    where: { id: couponId, restaurantId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
