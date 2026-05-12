/**
 * POST /api/restaurants/:restaurantId/cash-register/close
 *
 * Fecha o caixa aberto atual
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { cashRegisterRepository } from "@/repositories/cash-register.repository";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const closeRegisterSchema = z.object({
  declaredCash: z.number().min(0, "Valor de dinheiro não pode ser negativo"),
  declaredDebit: z.number().min(0, "Valor de débito não pode ser negativo"),
  declaredCredit: z.number().min(0, "Valor de crédito não pode ser negativo"),
  declaredPix: z.number().min(0, "Valor de PIX não pode ser negativo"),
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
    const validation = closeRegisterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Busca o caixa aberto
    const currentRegister = await cashRegisterRepository.findOpenRegister(restaurantId);
    if (!currentRegister) {
      return NextResponse.json({ error: "Nenhum caixa aberto para fechar" }, { status: 400 });
    }

    const { declaredCash, declaredDebit, declaredCredit, declaredPix, notes } = validation.data;

    const closedRegister = await cashRegisterRepository.closeRegister({
      registerId: currentRegister.id,
      userId: session.user.id,
      declaredCash,
      declaredDebit,
      declaredCredit,
      declaredPix,
      notes,
    });

    // Retorna o caixa fechado com diferenças calculadas
    return NextResponse.json({ register: closedRegister });
  } catch (error) {
    console.error("[cash-register/close POST] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fechar caixa" },
      { status: 500 }
    );
  }
}
