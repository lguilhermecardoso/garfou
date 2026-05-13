import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBearerToken } from "@/lib/device-auth";

/**
 * POST /api/bff/devices/activate
 *
 * Ativa um dispositivo usando TOKEN (6 dígitos) e retorna bearer token.
 * Rota PÚBLICA - não requer NextAuth.
 *
 * Body:
 * {
 *   "token": "123456",
 *   "deviceInfo": "Mozilla/5.0..." (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "bearerToken": "abc123...",
 *     "sessionId": "cmp...",
 *     "deviceType": "WAITER" | "KITCHEN",
 *     "restaurant": { ... }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, deviceInfo } = body;

    // Valida input
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token é obrigatório" }, { status: 400 });
    }

    // Remove espaços e valida formato
    const cleanToken = token.replace(/\s/g, "");
    if (!/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { error: "Token inválido. Deve conter 6 dígitos." },
        { status: 400 }
      );
    }

    // Busca token ativo no banco
    const deviceToken = await prisma.deviceToken.findFirst({
      where: {
        token: cleanToken,
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
      },
    });

    if (!deviceToken) {
      return NextResponse.json(
        { error: "Token não encontrado ou inativo. Peça um novo token ao gerente." },
        { status: 404 }
      );
    }

    // Gera bearer token único
    const bearerToken = generateBearerToken();

    // Cria sessão de dispositivo
    const session = await prisma.deviceSession.create({
      data: {
        restaurantId: deviceToken.restaurantId,
        tokenId: deviceToken.id,
        bearerToken,
        deviceInfo: deviceInfo || req.headers.get("user-agent") || undefined,
        activatedAt: new Date(),
        lastSeenAt: new Date(),
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        bearerToken,
        sessionId: session.id,
        deviceType: deviceToken.type,
        restaurant: deviceToken.restaurant,
      },
    });
  } catch (error) {
    console.error("Error activating device:", error);
    return NextResponse.json({ error: "Erro ao ativar dispositivo" }, { status: 500 });
  }
}
