import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

type Params = { params: Promise<{ restaurantId: string }> };

const generatePinSchema = z.object({
  type: z.enum(["WAITER", "KITCHEN"]),
});

/**
 * Gera um token de 6 dígitos único para autenticação de dispositivo.
 */
async function generateUniqueToken(restaurantId: string, type: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    const existing = await prisma.deviceToken.findFirst({
      where: { token, isActive: true },
    });

    if (!existing) {
      return token;
    }
    attempts++;
  }
  throw new Error("Não foi possível gerar token único. Tente novamente.");
}

/**
 * POST /api/restaurants/[restaurantId]/devices/generate
 *
 * Gera um token de 6 dígitos para ativar tablet/TV no App Garçom ou Cozinha.
 * Revoga token anterior do mesmo tipo (se existir) e gera um novo.
 *
 * Requer: Role MANAGER ou superior
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { restaurantId } = await params;

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

    // Revoga token existente do mesmo tipo (se houver)
    await prisma.deviceToken.updateMany({
      where: { restaurantId, type, isActive: true },
      data: { isActive: false },
    });

    // Gera token único
    const token = await generateUniqueToken(restaurantId, type);

    // Cria novo DeviceToken
    const deviceToken = await prisma.deviceToken.create({
      data: {
        restaurantId,
        token,
        type,
        createdBy: access.userId,
        isActive: true,
      },
      include: {
        creator: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tokenId: deviceToken.id,
        pin: token,
        type,
        createdBy: deviceToken.creator,
      },
    });
  } catch (error) {
    console.error("Error generating device token:", error);
    return NextResponse.json({ error: "Erro ao gerar token do dispositivo" }, { status: 500 });
  }
}

/**
 * GET /api/restaurants/[restaurantId]/devices/generate
 *
 * Lista tokens ativos de dispositivos do restaurante.
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
    const tokens = await prisma.deviceToken.findMany({
      where: { restaurantId, isActive: true },
      include: {
        creator: { select: { name: true, email: true } },
        sessions: {
          where: { isActive: true },
          select: {
            id: true,
            isActive: true,
            deviceInfo: true,
            activatedAt: true,
            lastSeenAt: true,
          },
          orderBy: { activatedAt: "desc" },
        },
      },
      orderBy: { type: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error("Error listing device tokens:", error);
    return NextResponse.json({ error: "Erro ao listar tokens de dispositivos" }, { status: 500 });
  }
}
