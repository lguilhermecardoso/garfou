import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { createFinanceEntrySchema } from "@/lib/validations";

type Params = { params: Promise<{ restaurantId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "CASHIER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  const entries = await prisma.financeEntry.findMany({
    where: {
      restaurantId,
      ...(type ? { type: type as "REVENUE" | "EXPENSE" } : {}),
      ...(from || to
        ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  const toNum = (v: unknown) => typeof v === "number" ? v : Number(v);
  const income = entries.filter((e) => e.type === "REVENUE").reduce((a, e) => a + toNum(e.amount), 0);
  const expense = entries.filter((e) => e.type === "EXPENSE").reduce((a, e) => a + toNum(e.amount), 0);

  return NextResponse.json({ data: entries, summary: { income, expense, balance: income - expense } });
}

export async function POST(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "CASHIER");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const parsed = createFinanceEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await prisma.financeEntry.create({
    data: { ...parsed.data, restaurantId, userId: access.userId },
  });
  return NextResponse.json({ data: entry }, { status: 201 });
}
