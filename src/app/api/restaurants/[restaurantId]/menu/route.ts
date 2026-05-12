import { NextRequest, NextResponse } from "next/server";
import { menuRepository } from "@/repositories/menu.repository";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { serializeProductWithCustomization } from "@/features/menu/product-customization.server";

interface Params {
  params: Promise<{ restaurantId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { restaurantId } = await params;
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Public menu requests don't need auth (for digital menu)
    const session = await auth();
    const isPublic = !session?.user;

    if (!isPublic) {
      const access = await requireRole(restaurantId, "WAITER");
      if ("error" in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
    }

    // Internal-only products are hidden from public menu
    const categories = await menuRepository.getCategories(
      restaurantId,
      !isPublic && includeInactive
    );
    const serializedCategories = categories.map((category) => ({
      ...category,
      products: category.products.map(serializeProductWithCustomization),
    }));

    if (isPublic) {
      // Filter internal-only products for public menu
      const publicCategories = serializedCategories.map((cat) => ({
        ...cat,
        products: cat.products.filter((p) => !p.isInternalOnly),
      }));
      return NextResponse.json({ data: publicCategories });
    }

    return NextResponse.json({ data: serializedCategories });
  } catch (error) {
    console.error("[MENU GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
