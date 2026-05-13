import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string }> };

const generatePinSchema = z.object({
  type: z.enum(["WAITER", "KITCHEN"]),
});

/**
 * Gera um PIN de 6 dígitos único para autenticação de dispositivo
 */
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/restaurants/[restaurantId]/devices/generate
 *
 * Gera um PIN temporário para autenticar tablet/TV no App Garçom ou Cozinha.
 * PIN expira em 24 horas e só pode ser usado uma vez.
 * Sessão permanece ativa por 24h após ativação.
 *
 * Requer: Role MANAGER ou superior
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { restaurantId } = await params;

  // Verifica permissão (MANAGER pode gerar PINs para dispositivos)
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const parsed = generatePinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type } = parsed.data;

    // Gera PIN único (tenta até 5x se houver colisão)
    let pin: string = "";
    let attempts = 0;
    let isUnique = false;

    while (!isUnique && attempts < 5) {
      pin = generatePin();

      // Verifica se PIN já existe e está ativo
      const existing = await prisma.deviceSession.findFirst({
        where: {
          restaurantId,
          pin,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: "Não foi possível gerar PIN único. Tente novamente." },
        { status: 500 }
      );
    }

    // Cria sessão de dispositivo
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira em 24 horas

    const session = await prisma.deviceSession.create({
      data: {
        restaurantId,
        pin,
        type,
        expiresAt,
        createdBy: access.userId,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        pin,
        type,
        expiresAt: session.expiresAt.toISOString(),
        expiresInHours: 24,
      },
    });
  } catch (error) {
    console.error("Error generating device PIN:", error);
    return NextResponse.json({ error: "Erro ao gerar PIN do dispositivo" }, { status: 500 });
  }
}

/**
 * GET /api/restaurants/[restaurantId]/devices/generate
 *
 * Lista todas as sessões ativas de dispositivos do restaurante.
 * Útil para ver quais tablets/TVs estão conectados.
 *
 * Requer: Role MANAGER ou superior
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { restaurantId } = await params;

  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const sessions = await prisma.deviceSession.findMany({
      where: {
        restaurantId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Error listing device sessions:", error);
    return NextResponse.json({ error: "Erro ao listar sessões de dispositivos" }, { status: 500 });
  }
}
