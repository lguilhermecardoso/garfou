import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

// Params type
type Params = Promise<{
  restaurantId: string;
  tokenId: string;
}>;

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

// ─────────────────────────────────────────────
// PUT - Revoke token and regenerate new one
// ─────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const { restaurantId, tokenId } = await params;

    // Require MANAGER or OWNER role
    const access = await requireRole(restaurantId, "MANAGER");
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Check if token exists and belongs to restaurant
    const existingToken = await prisma.deviceToken.findFirst({
      where: {
        id: tokenId,
        restaurantId,
      },
    });

    if (!existingToken) {
      return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });
    }

    // Transaction: deactivate all sessions + regenerate token
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deactivate all active sessions for this token
      await tx.deviceSession.updateMany({
        where: {
          tokenId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // 2. Generate new unique token
      const newToken = await generateUniqueToken();

      // 3. Update the token record
      const updatedToken = await tx.deviceToken.update({
        where: { id: tokenId },
        data: {
          token: newToken,
          updatedAt: new Date(),
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
          },
        },
      });

      return updatedToken;
    });

    return NextResponse.json({
      success: true,
      message:
        "Token revogado e regenerado com sucesso. Todos os dispositivos foram desconectados.",
      data: result,
    });
  } catch (error) {
    console.error("Error revoking token:", error);
    return NextResponse.json({ error: "Erro ao revogar token" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE - Delete token permanently
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { restaurantId, tokenId } = await params;

    // Require MANAGER or OWNER role
    const access = await requireRole(restaurantId, "MANAGER");
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Check if token exists and belongs to restaurant
    const existingToken = await prisma.deviceToken.findFirst({
      where: {
        id: tokenId,
        restaurantId,
      },
    });

    if (!existingToken) {
      return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });
    }

    // Delete token (cascade will delete all sessions)
    await prisma.deviceToken.delete({
      where: { id: tokenId },
    });

    return NextResponse.json({
      success: true,
      message: "Token deletado permanentemente",
    });
  } catch (error) {
    console.error("Error deleting token:", error);
    return NextResponse.json({ error: "Erro ao deletar token" }, { status: 500 });
  }
}
