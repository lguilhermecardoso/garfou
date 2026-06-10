import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

// Params type
type Params = Promise<{
  restaurantId: string;
}>;

// ─────────────────────────────────────────────
// GET - List all device tokens
// ─────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { restaurantId } = await params;

    // Require MANAGER or OWNER role
    const access = await requireRole(restaurantId, "MANAGER");

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Fetch active tokens with session counts
    const tokens = await prisma.deviceToken.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sessions: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            isActive: true,
            deviceInfo: true,
            activatedAt: true,
            lastSeenAt: true,
          },
          orderBy: {
            activatedAt: "desc",
          },
        },
      },
      orderBy: {
        type: "asc", // KITCHEN first, then WAITER
      },
    });

    return NextResponse.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json({ error: "Erro ao buscar tokens" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST - Generate new device token
// ─────────────────────────────────────────────

const generateTokenSchema = z.object({
  type: z.enum(["WAITER", "KITCHEN"]),
});

// Helper function to generate unique 6-digit token
async function generateUniqueToken(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate random 6-digit number
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if token already exists
    const existing = await prisma.deviceToken.findFirst({
      where: { token, isActive: true },
    });

    if (!existing) {
      return token;
    }

    attempts++;
  }

  throw new Error("Não foi possível gerar um token único");
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { restaurantId } = await params;

    // Require MANAGER or OWNER role
    const access = await requireRole(restaurantId, "MANAGER");
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const parsed = generateTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { type } = parsed.data;

    // Check if token already exists for this type
    const existingToken = await prisma.deviceToken.findFirst({
      where: {
        restaurantId,
        type,
        isActive: true,
      },
    });

    if (existingToken) {
      return NextResponse.json(
        {
          error: `Token para ${type} já existe. Use a opção "Revogar e Regenerar" para criar um novo.`,
        },
        { status: 409 }
      );
    }

    // Generate unique 6-digit token
    const token = await generateUniqueToken();

    // Create new token
    const newToken = await prisma.deviceToken.create({
      data: {
        restaurantId,
        token,
        type,
        createdBy: access.userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: newToken,
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json({ error: "Erro ao gerar token" }, { status: 500 });
  }
}
