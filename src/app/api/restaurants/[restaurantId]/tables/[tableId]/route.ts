/**
 * GET /api/restaurants/:restaurantId/tables/:tableId
 * PATCH /api/restaurants/:restaurantId/tables/:tableId
 * DELETE /api/restaurants/:restaurantId/tables/:tableId
 *
 * Get, update, or delete a specific table.
 */

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TableRepository } from "@/repositories/table.repository";
import { updateTableSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; tableId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId, tableId } = await params;

  const repository = new TableRepository();
  const table = await repository.findById(restaurantId, tableId);

  if (!table) {
    return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  }

  return NextResponse.json(table);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; tableId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId, tableId } = await params;

  try {
    const body = await req.json();
    const validatedData = updateTableSchema.parse(body);

    const repository = new TableRepository();

    // Check for duplicate identifier (if changing)
    if (validatedData.identifier) {
      const existing = await repository.findByIdentifier(restaurantId, validatedData.identifier);
      if (existing && existing.id !== tableId) {
        return NextResponse.json(
          { error: "Já existe uma mesa com este identificador" },
          { status: 400 }
        );
      }
    }

    const result = await repository.update(restaurantId, tableId, validatedData);

    if (result.count === 0) {
      return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
    }

    const updated = await repository.findById(restaurantId, tableId);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[Tables API] PATCH error:", error);
    return NextResponse.json({ error: "Erro ao atualizar mesa" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; tableId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId, tableId } = await params;

  const repository = new TableRepository();
  const result = await repository.softDelete(restaurantId, tableId);

  if (result.count === 0) {
    return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
