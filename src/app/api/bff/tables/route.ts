import { NextRequest, NextResponse } from "next/server";
import { validateBearerToken, extractBearerToken } from "@/lib/device-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/bff/tables - Lista mesas para dispositivos BFF
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Query:
 *   isActive: boolean (opcional, filtra por ativas)
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
    const isActiveParam = url.searchParams.get("isActive");

    // Busca mesas
    const tables = await prisma.diningTable.findMany({
      where: {
        restaurantId,
        ...(isActiveParam !== null && { isActive: isActiveParam === "true" }),
      },
      orderBy: [{ section: "asc" }, { identifier: "asc" }],
      select: {
        id: true,
        identifier: true,
        capacity: true,
        status: true,
        section: true,
        isActive: true,
      },
    });

    return NextResponse.json(tables);
  } catch (error) {
    console.error("Error fetching tables (BFF):", error);
    return NextResponse.json({ error: "Erro ao buscar mesas" }, { status: 500 });
  }
}
