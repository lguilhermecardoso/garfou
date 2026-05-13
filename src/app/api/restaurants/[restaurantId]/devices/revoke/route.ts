import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string }> };

const revokeSchema = z.object({
  sessionId: z.string().cuid(),
});

/**
 * DELETE /api/restaurants/[restaurantId]/devices/revoke
 *
 * Revoga uma sessão ativa de dispositivo.
 * Útil para desconectar tablets/TVs remotamente.
 *
 * Requer: Role MANAGER ou superior
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { restaurantId } = await params;

  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const parsed = revokeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId } = parsed.data;

    // Verifica se a sessão pertence ao restaurante
    const session = await prisma.deviceSession.findFirst({
      where: {
        id: sessionId,
        restaurantId,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    // Desativa a sessão
    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Sessão revogada com sucesso",
    });
  } catch (error) {
    console.error("Error revoking device session:", error);
    return NextResponse.json({ error: "Erro ao revogar sessão" }, { status: 500 });
  }
}
