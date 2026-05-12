/**
 * POST /api/restaurants/:restaurantId/cash-register/withdrawal
 *
 * Registra uma sangria (retirada de dinheiro do caixa)
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { cashRegisterRepository } from "@/repositories/cash-register.repository";
import { CashTransactionType, PaymentMethod } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const withdrawalSchema = z.object({
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição é obrigatória"),
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
    const validation = withdrawalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Busca o caixa aberto
    const currentRegister = await cashRegisterRepository.findOpenRegister(restaurantId);
    if (!currentRegister) {
      return NextResponse.json({ error: "Nenhum caixa aberto" }, { status: 400 });
    }

    const { amount, description } = validation.data;

    // Cria a transação de sangria (sempre em dinheiro)
    const transaction = await cashRegisterRepository.createTransaction({
      registerId: currentRegister.id,
      type: CashTransactionType.WITHDRAWAL,
      amount,
      paymentMethod: PaymentMethod.CASH,
      description,
      userId: session.user.id,
    });

    // Retorna totais atualizados
    const expectedTotals = await cashRegisterRepository.calculateExpectedTotals(currentRegister.id);

    return NextResponse.json({
      transaction,
      expectedTotals,
    });
  } catch (error) {
    console.error("[cash-register/withdrawal POST] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao registrar sangria" },
      { status: 500 }
    );
  }
}
