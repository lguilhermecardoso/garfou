import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ restaurantId: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { isOpen: true },
  });
  if (!restaurant)
    return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { isOpen: !restaurant.isOpen },
    select: { isOpen: true },
  });

  return NextResponse.json({ data: { isOpen: updated.isOpen } });
}
