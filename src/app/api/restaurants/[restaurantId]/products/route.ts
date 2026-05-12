import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { createProductSchema } from "@/lib/validations";
import {
  assertSplitFlavorProducts,
  buildProductCreateInput,
  productCustomizationInclude,
  serializeProductWithCustomization,
} from "@/features/menu/product-customization.server";

type Params = { params: Promise<{ restaurantId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "WAITER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

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
      ...productCustomizationInclude,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: products.map(serializeProductWithCustomization) });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = createProductSchema.safeParse({ ...body, restaurantId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await assertSplitFlavorProducts(
      restaurantId,
      parsed.data.splitFlavors.map((splitFlavor) => splitFlavor.flavorProductId)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dados inválidos";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: buildProductCreateInput(restaurantId, parsed.data),
    include: {
      category: { select: { id: true, name: true } },
      ...productCustomizationInclude,
    },
  });
  return NextResponse.json({ data: serializeProductWithCustomization(product) }, { status: 201 });
}
