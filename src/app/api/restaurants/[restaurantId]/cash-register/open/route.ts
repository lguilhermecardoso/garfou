/**
 * POST /api/restaurants/:restaurantId/cash-register/open
 *
 * Abre um novo caixa
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { cashRegisterRepository } from "@/repositories/cash-register.repository";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const openRegisterSchema = z.object({
  initialAmount: z.number().min(0, "Valor inicial não pode ser negativo"),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "CASHIER");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const validation = openRegisterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { initialAmount, notes } = validation.data;

    const register = await cashRegisterRepository.openRegister({
      restaurantId,
      userId: session.user.id,
      initialAmount,
      notes,
    });

    return NextResponse.json({ register }, { status: 201 });
  } catch (error) {
    console.error("[cash-register/open POST] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao abrir caixa" },
      { status: 500 }
    );
  }
}
