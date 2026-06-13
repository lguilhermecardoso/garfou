/**
 * TabPrintReceipt
 *
 * Renders a tab (comanda) receipt formatted for a 58mm non-fiscal thermal printer,
 * similar to a supermarket receipt (cupom não-fiscal).
 *
 * Prints when a tab is closed at the POS (PDV).
 *
 * Usage:
 *   printTabReceipt(tabDetail, restaurantInfo)
 */

"use client";

import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintTabOrder {
  orderNumber: number;
  createdAt: string | Date;
  status: string;
  total: number;
  notes?: string | null;
  items: Array<{
    quantity: number;
    product: { name: string };
    unitPrice: number;
  }>;
}

export interface PrintTab {
  createdAt: string | Date;
  closedAt?: string | Date | null;
  total: number;
  discount: number;
  serviceCharge?: number;
  coverCharge?: number;
  finalTotal: number;
  paymentMethod: string;
  notes?: string | null;
  table?: { identifier: string } | null;
  customer?: { name: string; phone?: string | null } | null;
  orders: PrintTabOrder[];
}

export interface PrintRestaurant {
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLS = 48;

function line(char = "─"): string {
  return char.repeat(COLS);
}

function center(text: string): string {
  const pad = Math.max(0, Math.floor((COLS - text.length) / 2));
  return " ".repeat(pad) + text;
}

function leftRight(left: string, right: string): string {
  const gap = COLS - left.length - right.length;
  if (gap <= 0) return left + " " + right;
  return left + " ".repeat(gap) + right;
}

function wrap(text: string, indent = 0): string[] {
  const maxWidth = COLS - indent;
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + (current ? " " : "") + word).length <= maxWidth) {
      current += (current ? " " : "") + word;
    } else {
      if (current) lines.push(" ".repeat(indent) + current);
      current = word;
    }
  }
  if (current) lines.push(" ".repeat(indent) + current);
  return lines;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao Credito",
  DEBIT_CARD: "Cartao Debito",
  PIX: "PIX",
  VOUCHER: "Vale",
};

// ─── Receipt builder ──────────────────────────────────────────────────────────

export function buildTabReceiptLines(tab: PrintTab, restaurant: PrintRestaurant): string[] {
  const rows: string[] = [];
  const add = (...lines: string[]) => rows.push(...lines);

  const openedAt = new Date(tab.createdAt);
  const closedAt = tab.closedAt ? new Date(tab.closedAt) : new Date();

  const dateStr = closedAt.toLocaleDateString("pt-BR");
  const timeStr = closedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  add(
    line("═"),
    center((restaurant.name || "RESTAURANTE").toUpperCase()),
    ...(restaurant.phone ? [center(`Tel: ${restaurant.phone}`)] : []),
    ...(restaurant.address ? wrap(restaurant.address).map(center) : []),
    ...(restaurant.city && restaurant.state
      ? [center(`${restaurant.city} - ${restaurant.state}`)]
      : []),
    line("─"),
    center("CUPOM NAO-FISCAL"),
    line("─"),
    leftRight(`Data: ${dateStr}`, `Hora: ${timeStr}`)
  );

  // Comanda info
  if (tab.table) {
    add(`Mesa: ${tab.table.identifier}`);
  } else if (tab.customer) {
    add(
      `Cliente: ${tab.customer.name}`,
      ...(tab.customer.phone ? [`Tel: ${tab.customer.phone}`] : [])
    );
  }

  const openedTimeStr = openedAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  add(`Aberta em: ${openedAt.toLocaleDateString("pt-BR")} ${openedTimeStr}`);

  add(line("─"), center("ITENS"), line("─"));

  // Group all items from all orders
  const itemMap = new Map<
    string,
    { name: string; quantity: number; unitPrice: number; total: number }
  >();

  for (const order of tab.orders) {
    for (const item of order.items) {
      const key = `${item.product.name}|${item.unitPrice}`;
      const existing = itemMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.unitPrice * item.quantity;
      } else {
        itemMap.set(key, {
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        });
      }
    }
  }

  // Print items
  for (const item of itemMap.values()) {
    const qtyName = `${item.quantity}x ${item.name}`;
    if (qtyName.length + formatCurrency(item.total).length + 1 <= COLS) {
      add(leftRight(qtyName, formatCurrency(item.total)));
    } else {
      add(
        ...wrap(qtyName),
        " ".repeat(COLS - formatCurrency(item.total).length) + formatCurrency(item.total)
      );
    }
    add(`   Un: ${formatCurrency(item.unitPrice)}`);
  }

  add(line("─"));

  // Totals
  add(leftRight("Subtotal:", formatCurrency(tab.total)));

  if (tab.discount > 0) {
    add(leftRight("Desconto:", `-${formatCurrency(tab.discount)}`));
  }

  if (tab.serviceCharge && tab.serviceCharge > 0) {
    add(leftRight("Taxa de servico (10%):", `+${formatCurrency(tab.serviceCharge)}`));
  }

  if (tab.coverCharge && tab.coverCharge > 0) {
    add(leftRight("Couvert artistico:", `+${formatCurrency(tab.coverCharge)}`));
  }

  add(
    line("─"),
    leftRight("TOTAL:", formatCurrency(tab.finalTotal)),
    leftRight("Pagamento:", PAYMENT_LABELS[tab.paymentMethod] ?? tab.paymentMethod),
    line("─")
  );

  // Notes
  if (tab.notes) {
    add(center("OBSERVACOES"), ...wrap(tab.notes), line("─"));
  }

  // Orders summary
  add(center("RESUMO DE PEDIDOS"), line("─"));
  for (const order of tab.orders) {
    add(leftRight(`Pedido #${order.orderNumber}`, formatCurrency(order.total)));
    if (order.notes) add(...wrap(`  Obs: ${order.notes}`, 2));
  }

  add(line("─"), center("Obrigado pela preferencia!"), center("www.chamou.delivery"), line("═"));

  return rows;
}

// ─── Standalone print helper ──────────────────────────────────────────────────

/**
 * Opens the browser print dialog with a page sized for 58mm thermal paper.
 * The receipt content is injected into a hidden <iframe> so it doesn't
 * affect the current page layout.
 */
export function printTabReceipt(tab: PrintTab, restaurant: PrintRestaurant): void {
  const lines = buildTabReceiptLines(tab, restaurant);
  const escaped = lines.map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Cupom - ${tab.table?.identifier ?? tab.customer?.name ?? "Comanda"}</title>
<style>
  @page { size: 58mm auto; margin: 2mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8.5pt;
    line-height: 1.3;
    color: #000;
    background: #fff;
    white-space: pre;
    width: 54mm;
  }
</style>
</head>
<body>${escaped}</body>
</html>`;

  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  // Remove iframe after print dialog closes
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 2000);
}

// ─── Screen preview component ─────────────────────────────────────────────────

interface Props {
  /** The tab to render */
  tab: PrintTab;
  /** Restaurant information */
  restaurant: PrintRestaurant;
  /** Additional CSS class on the wrapper */
  className?: string;
}

/**
 * Renders a monospaced receipt preview styled to look like thermal paper.
 */
export function TabPrintReceipt({ tab, restaurant, className = "" }: Props) {
  const lines = buildTabReceiptLines(tab, restaurant);

  return (
    <div
      className={`mx-auto max-w-md overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4 font-mono text-xs shadow-sm ${className}`}
      style={{ width: "58mm" }}
    >
      <pre className="leading-tight whitespace-pre text-neutral-900">{lines.join("\n")}</pre>
    </div>
  );
}
