/**
 * GET /api/restaurants/:restaurantId/tables
 * POST /api/restaurants/:restaurantId/tables
 *
 * List and create tables for a restaurant.
 */

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TableRepository } from "@/repositories/table.repository";
import { createTableSchema } from "@/lib/validations";
import { z } from "zod";

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
  const status = searchParams.get("status") as "AVAILABLE" | "OCCUPIED" | "RESERVED" | null;
  const isActive = searchParams.get("isActive");

  const repository = new TableRepository();
  const tables = await repository.findMany(restaurantId, {
    status: status || undefined,
    isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
  });

  return NextResponse.json(tables);
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
    const validatedData = createTableSchema.parse(body);

    const repository = new TableRepository();

    // Check for duplicate identifier
    const existing = await repository.findByIdentifier(restaurantId, validatedData.identifier);
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma mesa com este identificador" },
        { status: 400 }
      );
    }

    const table = await repository.create(restaurantId, validatedData);
    return NextResponse.json(table, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[Tables API] POST error:", error);
    return NextResponse.json({ error: "Erro ao criar mesa" }, { status: 500 });
  }
}
