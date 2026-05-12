/**
 * GET /api/restaurants/:restaurantId/tabs/:tabId
 * DELETE /api/restaurants/:restaurantId/tabs/:tabId
 *
 * Get tab details or cancel a tab.
 */

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TabService } from "@/features/tabs/tab.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; tabId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId, tabId } = await params;

  const service = new TabService();
  const tab = await service.getTabById(restaurantId, tabId);

  if (!tab) {
    return NextResponse.json({ error: "Comanda não encontrada" }, { status: 404 });
  }

  return NextResponse.json(tab);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; tabId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { restaurantId, tabId } = await params;

  try {
    const service = new TabService();
    await service.cancelTab(restaurantId, tabId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[Tabs API] DELETE error:", error);
    return NextResponse.json({ error: "Erro ao cancelar comanda" }, { status: 500 });
  }
}
