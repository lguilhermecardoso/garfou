import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string }> };

const schema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.product.updateMany({
        where: { id, restaurantId, deletedAt: null },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
