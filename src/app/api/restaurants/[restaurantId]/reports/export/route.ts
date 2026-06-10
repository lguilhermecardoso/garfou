/**
 * GET /api/restaurants/[restaurantId]/reports/export
 *
 * Exports report data as a CSV file for download.
 *
 * Query params:
 *  - type:   "orders" | "finance" (default: "orders")
 *  - from:   ISO date string (default: 30 days ago)
 *  - to:     ISO date string (default: now)
 *
 * Auth: session required, MANAGER role minimum.
 *
 * Returns:
 *  - Content-Type: text/csv
 *  - Content-Disposition: attachment; filename="export-{type}-{from}.csv"
 *
 * Security:
 *  - restaurantId always included in all queries (multi-tenancy)
 *  - Role checked via requireRole
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Quote fields containing commas, quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { restaurantId } = await params;

  const roleCheck = await requireRole(restaurantId, "MANAGER");
  if ("error" in roleCheck) {
    return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });
  }

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") === "finance" ? "finance" : "orders";

  const defaultTo = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to = toParam ? new Date(toParam) : defaultTo;

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date params" }, { status: 400 });
  }

  // Ensure ≤ 1 year range to prevent abuse
  const diffMs = to.getTime() - from.getTime();
  if (diffMs > 365 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Date range too large (max 1 year)" }, { status: 400 });
  }

  let csv: string;
  let filename: string;

  if (type === "orders") {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: from, lte: to },
      },
      select: {
        orderNumber: true,
        status: true,
        type: true,
        tableNumber: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
        customer: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Nº Pedido",
      "Data",
      "Status",
      "Tipo",
      "Mesa",
      "Cliente",
      "Telefone",
      "E-mail",
      "Pagamento",
      "Total (R$)",
    ];

    type OrderRow = (typeof orders)[number];
    const rows = orders.map((o: OrderRow) => [
      o.orderNumber,
      o.createdAt.toISOString().replace("T", " ").substring(0, 19),
      o.status,
      o.type,
      o.tableNumber ?? "",
      o.customer?.name ?? "",
      o.customer?.phone ?? "",
      o.customer?.email ?? "",
      o.paymentMethod ?? "",
      Number(o.total).toFixed(2),
    ]);

    csv = buildCSV(headers, rows);
    filename = `pedidos-${from.toISOString().substring(0, 10)}.csv`;
  } else {
    // finance entries
    const entries = await prisma.financeEntry.findMany({
      where: {
        restaurantId,
        date: { gte: from, lte: to },
      },
      select: {
        date: true,
        type: true,
        category: true,
        description: true,
        amount: true,
        paymentMethod: true,
      },
      orderBy: { date: "desc" },
    });

    const headers = ["Data", "Tipo", "Categoria", "Descrição", "Método de Pagamento", "Valor (R$)"];

    type EntryRow = (typeof entries)[number];
    const rows = entries.map((e: EntryRow) => [
      e.date.toISOString().substring(0, 10),
      e.type,
      e.category ?? "",
      e.description ?? "",
      e.paymentMethod ?? "",
      Number(e.amount).toFixed(2),
    ]);

    csv = buildCSV(headers, rows);
    filename = `financeiro-${from.toISOString().substring(0, 10)}.csv`;
  }

  // BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";

  return new NextResponse(BOM + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
