/**
 * Device Authentication Helper
 *
 * Autenticação BFF independente para apps Garçom e Cozinha.
 * Usa bearer tokens gerados na ativação, sem depender de NextAuth/cookies.
 */
import { prisma } from "@/lib/db";
import crypto from "crypto";

export interface DeviceAuth {
  sessionId: string;
  restaurantId: string;
  deviceType: "WAITER" | "KITCHEN";
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    isOpen: boolean;
  };
}

/**
 * Gera um bearer token único e seguro para BFF.
 */
export function generateBearerToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Valida um bearer token e retorna os dados de autenticação.
 * Usado por todas as rotas BFF que requerem autenticação.
 *
 * @param bearerToken - Token bearer do header Authorization
 * @returns DeviceAuth se válido, null se inválido
 */
export async function validateBearerToken(
  bearerToken: string | null | undefined
): Promise<DeviceAuth | null> {
  if (!bearerToken) return null;

  try {
    const session = await prisma.deviceSession.findFirst({
      where: {
        bearerToken,
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

    // Valida sessão e token ativos
    if (!session || !session.token.isActive) {
      return null;
    }

    // Atualiza lastSeenAt (fire-and-forget)
    prisma.deviceSession
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      })
      .catch((err) => console.error("Error updating lastSeenAt:", err));

    return {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      deviceType: session.token.type as "WAITER" | "KITCHEN",
      restaurant: session.restaurant,
    };
  } catch (error) {
    console.error("Error validating bearer token:", error);
    return null;
  }
}

/**
 * Extrai o bearer token do header Authorization.
 *
 * @param authHeader - Valor do header Authorization (ex: "Bearer abc123")
 * @returns Token sem o prefixo "Bearer ", ou null se inválido
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
}
