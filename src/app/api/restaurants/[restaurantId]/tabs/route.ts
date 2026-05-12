/**
 * GET /api/restaurants/:restaurantId/tabs
 * POST /api/restaurants/:restaurantId/tabs
 *
 * List and create tabs (comandas) for a restaurant.
 */

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TabService } from "@/features/tabs/tab.service";
import { createTabSchema } from "@/lib/validations";
import { z } from "zod";
import type { TabStatus } from "@prisma/client";
import { TabRepository } from "@/repositories/tab.repository";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId } = await params;

  // Optional filters
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") as TabStatus | null;
  const tableId = searchParams.get("tableId");
  const customerId = searchParams.get("customerId");

  const repository = new TabRepository();
  const tabs = await repository.findMany(restaurantId, {
    status: status || undefined,
    tableId: tableId || undefined,
    customerId: customerId || undefined,
  });

  return NextResponse.json(tabs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId } = await params;

  try {
    const body = await req.json();
    const validatedData = createTabSchema.parse(body);

    const service = new TabService();
    const tab = await service.openTab(restaurantId, validatedData, session.user.id);

    return NextResponse.json(tab, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Tabs API] POST error:", error);
    return NextResponse.json({ error: "Erro ao abrir comanda" }, { status: 500 });
  }
}
