import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { updateProductSchema } from "@/lib/validations";
import {
  assertSplitFlavorProducts,
  productCustomizationInclude,
  serializeProductWithCustomization,
  syncProductCustomization,
} from "@/features/menu/product-customization.server";

type Params = { params: Promise<{ restaurantId: string; productId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { restaurantId, productId } = await params;
  const access = await requireRole(restaurantId, "WAITER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const product = await prisma.product.findFirst({
    where: { id: productId, restaurantId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true } },
      ...productCustomizationInclude,
    },
  });

  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json({ data: serializeProductWithCustomization(product) });
}

export async function PATCH(req: Request, { params }: Params) {
  const { restaurantId, productId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await assertSplitFlavorProducts(
      restaurantId,
      (parsed.data.splitFlavors ?? []).map((splitFlavor) => splitFlavor.flavorProductId)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dados inválidos";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const product = await syncProductCustomization(restaurantId, productId, parsed.data);

  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: serializeProductWithCustomization(product) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { restaurantId, productId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.product.updateMany({
    where: { id: productId, restaurantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
