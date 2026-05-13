import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/devices/validate?sessionId=xxx
 *
 * Valida se uma sessão de dispositivo ainda está ativa.
 * Usado pelos apps de Garçom e Cozinha para verificar auth.
 *
 * Rota PÚBLICA - validação baseada apenas no sessionId.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });
    }

    // Busca e valida sessão
    const session = await prisma.deviceSession.findFirst({
      where: {
        id: sessionId,
        isActive: true,
      },
      include: {
        token: {
          select: {
            type: true,
            isActive: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            isOpen: true,
          },
        },
      },
    });

    if (!session || !session.token.isActive) {
      return NextResponse.json(
        {
          valid: false,
          error: "Sessão inválida ou expirada. Ative o dispositivo novamente.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      data: {
        sessionId: session.id,
        type: session.token.type,
        restaurant: session.restaurant,
      },
    });
  } catch (error) {
    console.error("Error validating device session:", error);
    return NextResponse.json({ error: "Erro ao validar sessão" }, { status: 500 });
  }
}

/**
 * DELETE /api/devices/validate?sessionId=xxx
 *
 * Desativa uma sessão de dispositivo (logout).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });
    }

    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Dispositivo desconectado com sucesso",
    });
  } catch (error) {
    console.error("Error deactivating device session:", error);
    return NextResponse.json({ error: "Erro ao desconectar dispositivo" }, { status: 500 });
  }
}
