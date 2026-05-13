import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const activateTokenSchema = z.object({
  token: z.string().length(6, "Token deve ter 6 dígitos"),
});

/**
 * POST /api/devices/activate
 *
 * Valida TOKEN e cria sessão de dispositivo (tablet/TV).
 * Rota PÚBLICA - não requer autenticação prévia.
 *
 * Fluxo:
 * 1. Usuário digita TOKEN de 6 dígitos no tablet/TV
 * 2. Sistema valida se token existe e está ativo
 * 3. Cria nova sessão de dispositivo (múltiplos dispositivos podem usar mesmo token)
 * 4. Retorna sessionId + tipo + dados do restaurante
 * 5. Frontend armazena sessionId em localStorage
 * 6. Subsequentes requests usam sessionId para auth
 *
 * NOTA: Token é permanente e reutilizável.
 *       Múltiplos dispositivos podem usar o mesmo token simultaneamente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = activateTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Token inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Busca token de dispositivo ativo
    const deviceToken = await prisma.deviceToken.findFirst({
      where: {
        token,
        isActive: true,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            isOpen: true,
          },
        },
        creator: {
          select: { name: true },
        },
      },
    });

    if (!deviceToken) {
      return NextResponse.json(
        { error: "Token inválido ou desativado. Solicite um novo token no dashboard." },
        { status: 404 }
      );
    }

    // Coleta informações do dispositivo
    const userAgent = req.headers.get("user-agent") || "unknown";
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const deviceInfo = JSON.stringify({
      userAgent,
      ip,
      activatedAt: new Date(),
      browser: userAgent.includes("Chrome")
        ? "Chrome"
        : userAgent.includes("Firefox")
          ? "Firefox"
          : "Other",
    });

    // Cria nova sessão de dispositivo
    const session = await prisma.deviceSession.create({
      data: {
        restaurantId: deviceToken.restaurantId,
        tokenId: deviceToken.id,
        deviceInfo,
        isActive: true,
      },
    });

    // Retorna dados da sessão ativa
    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        type: deviceToken.type,
        restaurant: deviceToken.restaurant,
        createdBy: deviceToken.creator.name,
        message: "Dispositivo conectado com sucesso!",
      },
    });
  } catch (error) {
    console.error("Error activating device token:", error);
    return NextResponse.json({ error: "Erro ao ativar dispositivo" }, { status: 500 });
  }
}
