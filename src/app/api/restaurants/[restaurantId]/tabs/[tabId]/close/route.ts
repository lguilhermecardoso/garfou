/**
 * PATCH /api/restaurants/:restaurantId/tabs/:tabId/close
 *
 * Close and pay a tab (comanda).
 * Automatically creates a cash register transaction when paid.
 */

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TabService } from "@/features/tabs/tab.service";
import { closeTabSchema } from "@/lib/validations";
import { requireRole } from "@/lib/rbac";
import { cashRegisterRepository } from "@/repositories/cash-register.repository";
import { CashTransactionType } from "@prisma/client";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; tabId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId, tabId } = await params;
  const access = await requireRole(restaurantId, "CASHIER");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const validatedData = closeTabSchema.parse(body);

    const service = new TabService();
    const closedTab = await service.closeTab(restaurantId, tabId, validatedData, session.user.id);

    // ─── Integração com Caixa ────────────────────────────────────────
    // Registra a venda no caixa aberto (se houver)
    try {
      const currentRegister = await cashRegisterRepository.findOpenRegister(restaurantId);

      if (currentRegister) {
        await cashRegisterRepository.createTransaction({
          registerId: currentRegister.id,
          type: CashTransactionType.SALE,
          amount: Number(closedTab.finalTotal),
          paymentMethod: closedTab.paymentMethod!,
          description: `Comanda #${closedTab.id.slice(-8)} - Mesa ${closedTab.tableId || "N/A"}`,
          userId: session.user.id,
        });
      }
    } catch (cashError) {
      // Log mas não falha a operação se houver erro no caixa
      console.error("[Tabs API] Erro ao registrar venda no caixa:", cashError);
    }
    // ──────────────────────────────────────────────────────────────────

    return NextResponse.json(closedTab);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Tabs API] PATCH /close error:", error);
    return NextResponse.json({ error: "Erro ao fechar comanda" }, { status: 500 });
  }
}
