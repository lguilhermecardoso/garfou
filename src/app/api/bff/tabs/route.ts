import { NextRequest, NextResponse } from "next/server";
import { validateBearerToken, extractBearerToken } from "@/lib/device-auth";
import { prisma } from "@/lib/db";
import type { TabStatus } from "@prisma/client";

/**
 * GET /api/bff/tabs - Lista comandas para dispositivos BFF
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Query:
 *   status: string (opcional, ex: OPEN, CLOSED, PAID)
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
    const statusParam = url.searchParams.get("status");

    // Busca comandas
    const tabs = await prisma.tab.findMany({
      where: {
        restaurantId,
        ...(statusParam && { status: statusParam as TabStatus }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        table: {
          select: {
            id: true,
            identifier: true,
            capacity: true,
            status: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(tabs);
  } catch (error) {
    console.error("Error fetching tabs (BFF):", error);
    return NextResponse.json({ error: "Erro ao buscar comandas" }, { status: 500 });
  }
}

/**
 * POST /api/bff/tabs - Cria nova comanda via BFF
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Body:
 *   tableId?: string
 *   guestCustomerName?: string
 */
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { tableId, guestCustomerName } = body;

    // Validações
    if (!tableId && !guestCustomerName) {
      return NextResponse.json({ error: "Informe uma mesa ou nome do cliente" }, { status: 400 });
    }

    // Se mesa informada, valida se está disponível
    if (tableId) {
      const table = await prisma.table.findFirst({
        where: {
          id: tableId,
          restaurantId,
          isActive: true,
        },
      });

      if (!table) {
        return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
      }

      if (table.status === "OCCUPIED") {
        return NextResponse.json({ error: "Mesa já está ocupada" }, { status: 400 });
      }

      // Verifica se já existe comanda aberta para essa mesa
      const existingTab = await prisma.tab.findFirst({
        where: {
          restaurantId,
          tableId,
          status: "OPEN",
        },
      });

      if (existingTab) {
        return NextResponse.json(
          { error: "Já existe uma comanda aberta para esta mesa" },
          { status: 400 }
        );
      }
    }

    // Cria comanda
    const tab = await prisma.tab.create({
      data: {
        restaurantId,
        tableId: tableId || null,
        guestCustomerName: guestCustomerName?.trim() || null,
        openedBy: auth.createdBy,
        status: "OPEN",
        discount: 0,
        total: 0,
        finalTotal: 0,
      },
      include: {
        table: {
          select: {
            id: true,
            identifier: true,
            capacity: true,
            status: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Atualiza status da mesa se informada
    if (tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });
    }

    return NextResponse.json(tab);
  } catch (error) {
    console.error("Error creating tab (BFF):", error);
    return NextResponse.json({ error: "Erro ao criar comanda" }, { status: 500 });
  }
}
