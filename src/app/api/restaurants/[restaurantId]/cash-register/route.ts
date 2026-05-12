/**
 * GET /api/restaurants/:restaurantId/cash-register
 *
 * Busca o caixa aberto atual ou histórico de caixas
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { cashRegisterRepository } from "@/repositories/cash-register.repository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "current"; // current ou history

    if (mode === "history") {
      const limit = parseInt(searchParams.get("limit") || "30");
      const offset = parseInt(searchParams.get("offset") || "0");
      const startDate = searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined;
      const endDate = searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined;

      const result = await cashRegisterRepository.findHistory(restaurantId, {
        limit,
        offset,
        startDate,
        endDate,
      });

      return NextResponse.json(result);
    }

    // Mode: current (padrão)
    const currentRegister = await cashRegisterRepository.findOpenRegister(restaurantId);

    if (!currentRegister) {
      return NextResponse.json({ register: null, message: "Nenhum caixa aberto" });
    }

    // Calcula totais atuais
    const expectedTotals = await cashRegisterRepository.calculateExpectedTotals(currentRegister.id);
    const summary = await cashRegisterRepository.getSalesSummary(currentRegister.id);

    return NextResponse.json({
      register: currentRegister,
      expectedTotals,
      summary,
    });
  } catch (error) {
    console.error("[cash-register GET] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar caixa" },
      { status: 500 }
    );
  }
}
