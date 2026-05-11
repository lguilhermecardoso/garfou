import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { createCustomerSchema } from "@/lib/validations";

type Params = { params: Promise<{ restaurantId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const take = 20;

  const where = {
    restaurantId,
    deletedAt: null as null,
    ...(q
      ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip: (page - 1) * take,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ data: customers, meta: { total, page, take } });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "WAITER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = createCustomerSchema.safeParse({ ...body, restaurantId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  // Upsert by phone within same restaurant
  let customer;
  if (parsed.data.phone) {
    const existing = await prisma.customer.findFirst({
      where: { restaurantId, phone: parsed.data.phone, deletedAt: null },
    });
    if (existing) {
      customer = await prisma.customer.update({
        where: { id: existing.id },
        data: { name: parsed.data.name, email: parsed.data.email },
      });
    } else {
      customer = await prisma.customer.create({ data: { ...parsed.data, restaurantId } });
    }
  } else {
    customer = await prisma.customer.create({ data: { ...parsed.data, restaurantId } });
  }

  return NextResponse.json({ data: customer }, { status: 201 });
}
