import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * GET /api/restaurants/[restaurantId]/team
 * Lista todos os membros da equipe do restaurante (apenas OWNER pode ver)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { restaurantId } = await params;

    // Verifica se usuário é OWNER do restaurante
    const membership = await prisma.userRestaurant.findFirst({
      where: {
        userId: session.user.id,
        restaurantId,
        role: UserRole.OWNER,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Apenas OWNER pode gerenciar equipe" }, { status: 403 });
    }

    // Busca todos os membros
    const members = await prisma.userRestaurant.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: "desc" }, // OWNER primeiro
        { user: { name: "asc" } },
      ],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.user.createdAt,
      })),
    });
  } catch (error) {
    console.error("[team:get]", error);
    return NextResponse.json({ error: "Erro ao buscar equipe" }, { status: 500 });
  }
}

/**
 * POST /api/restaurants/[restaurantId]/team
 * Adiciona novo membro à equipe (apenas OWNER pode adicionar)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { restaurantId } = await params;

    // Verifica se usuário é OWNER do restaurante
    const membership = await prisma.userRestaurant.findFirst({
      where: {
        userId: session.user.id,
        restaurantId,
        role: UserRole.OWNER,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Apenas OWNER pode adicionar membros" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role } = body;

    // Validações
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
    }

    // Não pode criar OWNER por essa rota
    if (role === UserRole.OWNER) {
      return NextResponse.json({ error: "Não é possível criar outro OWNER" }, { status: 400 });
    }

    // Valida role
    const validRoles = [UserRole.MANAGER, UserRole.WAITER, UserRole.KITCHEN, UserRole.CASHIER];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Role inválido" }, { status: 400 });
    }

    // Verifica se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    let userId: string;

    if (existingUser) {
      // Usuário existe, apenas adiciona ao restaurante
      userId = existingUser.id;

      // Verifica se já é membro
      const existingMembership = await prisma.userRestaurant.findFirst({
        where: {
          userId: existingUser.id,
          restaurantId,
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "Usuário já é membro deste restaurante" },
          { status: 400 }
        );
      }
    } else {
      // Cria novo usuário
      const passwordHash = await hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
        },
      });
      userId = newUser.id;
    }

    // Adiciona membro ao restaurante
    const newMember = await prisma.userRestaurant.create({
      data: {
        userId,
        restaurantId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Membro adicionado com sucesso",
        member: {
          id: newMember.id,
          userId: newMember.user.id,
          name: newMember.user.name,
          email: newMember.user.email,
          role: newMember.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[team:post]", error);
    return NextResponse.json({ error: "Erro ao adicionar membro" }, { status: 500 });
  }
}

/**
 * DELETE /api/restaurants/[restaurantId]/team/[membershipId]
 * Remove membro da equipe (apenas OWNER pode remover)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { restaurantId } = await params;
    const { searchParams } = new URL(req.url);
    const membershipId = searchParams.get("membershipId");

    if (!membershipId) {
      return NextResponse.json({ error: "membershipId é obrigatório" }, { status: 400 });
    }

    // Verifica se usuário é OWNER do restaurante
    const ownerMembership = await prisma.userRestaurant.findFirst({
      where: {
        userId: session.user.id,
        restaurantId,
        role: UserRole.OWNER,
      },
    });

    if (!ownerMembership) {
      return NextResponse.json({ error: "Apenas OWNER pode remover membros" }, { status: 403 });
    }

    // Busca membro a ser removido
    const memberToRemove = await prisma.userRestaurant.findUnique({
      where: { id: membershipId },
    });

    if (!memberToRemove || memberToRemove.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    // Não pode remover OWNER
    if (memberToRemove.role === UserRole.OWNER) {
      return NextResponse.json({ error: "Não é possível remover OWNER" }, { status: 400 });
    }

    // Remove membro
    await prisma.userRestaurant.delete({
      where: { id: membershipId },
    });

    return NextResponse.json({ message: "Membro removido com sucesso" });
  } catch (error) {
    console.error("[team:delete]", error);
    return NextResponse.json({ error: "Erro ao remover membro" }, { status: 500 });
  }
}
