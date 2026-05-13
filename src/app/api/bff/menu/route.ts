import { NextRequest, NextResponse } from "next/server";
import { validateBearerToken, extractBearerToken } from "@/lib/device-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/bff/menu - Lista cardápio para dispositivos BFF
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Query:
 *   includeInactive: boolean (opcional, default false)
 */
export async function GET(req: NextRequest) {
  try {
    // Valida bearer token
    const authHeader = req.headers.get("authorization");
    const bearerToken = extractBearerToken(authHeader);

    if (!bearerToken) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    const auth = await validateBearerToken(bearerToken);
    if (!auth) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const { restaurantId } = auth;
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    // Busca categorias com produtos
    const categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId,
        isActive: includeInactive ? undefined : true,
      },
      orderBy: { order: "asc" },
      include: {
        products: {
          where: {
            isActive: includeInactive ? undefined : true,
          },
          orderBy: { order: "asc" },
          include: {
            modifierGroups: {
              where: { isActive: true },
              orderBy: { order: "asc" },
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { order: "asc" },
                },
              },
            },
            splitFlavors: {
              where: { isActive: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
      device: {
        type: auth.deviceType,
        restaurant: {
          id: auth.restaurantId,
          name: auth.restaurantName,
          slug: auth.restaurantSlug,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching menu (BFF):", error);
    return NextResponse.json({ error: "Erro ao buscar cardápio" }, { status: 500 });
  }
}
