/**
 * TabPrintReceipt
 *
 * Renders a tab (comanda) receipt formatted for a 58mm non-fiscal thermal printer.
 * Uses the same HTML+CSS bold formatting as order-print-receipt.tsx.
 *
 * Prints when a tab is closed at the POS (PDV).
 */

"use client";

import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintTabOrder {
  orderNumber: number;
  createdAt: string | Date;
  status: string;
  type?: string;
  total: number;
  notes?: string | null;
  deliveryAddress?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
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
  deliveryFee?: number;
  finalTotal: number;
  paymentMethod: string;
  changeFor?: number;
  change?: number;
  notes?: string | null;
  table?: { identifier: string } | null;
  customer?: { name: string; phone?: string | null } | null;
  guestCustomerName?: string | null;
  orders: PrintTabOrder[];
}

export interface PrintRestaurant {
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

// ─── HTML receipt builder ─────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao Credito",
  DEBIT_CARD: "Cartao Debito",
  PIX: "PIX",
  VOUCHER: "Vale",
};

function buildTabReceiptHTML(tab: PrintTab, restaurant: PrintRestaurant): string {
  const e = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const closedAt = tab.closedAt ? new Date(tab.closedAt) : new Date();
  const dateStr = closedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const timeStr = closedAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const divider = (char = "─") =>
    char === "═" ? `<div class="div div-double"></div>` : `<div class="div div-single"></div>`;
  const normal = (text: string) => `<div>${e(text)}</div>`;
  const bold = (text: string) => `<div class="b">${e(text)}</div>`;
  const ctr = (text: string) => `<div class="ctr">${e(text)}</div>`;
  const ctrBold = (text: string) => `<div class="ctr b">${e(text)}</div>`;
  const row = (left: string, right: string, isBold = false) =>
    `<div class="row${isBold ? " b" : ""}"><span>${e(left)}</span><span>${e(right)}</span></div>`;

  let html = "";

  // Header
  html += divider("═");
  html += ctr(restaurant.name ? restaurant.name.toUpperCase() : "RESTAURANTE");
  if (restaurant.phone) html += ctr(`Tel: ${restaurant.phone}`);
  if (restaurant.address) html += ctr(restaurant.address);
  if (restaurant.city && restaurant.state) html += ctr(`${restaurant.city} - ${restaurant.state}`);
  html += divider();
  html += ctrBold("CUPOM NAO-FISCAL");
  html += divider();
  html += row(`Data: ${dateStr}`, `Hora: ${timeStr}`);
  html += divider();

  // Comanda info
  if (tab.table) {
    html += ctrBold(`MESA ${tab.table.identifier}`);
  } else if (tab.customer) {
    html += bold(`CLIENTE: ${tab.customer.name}`);
    if (tab.customer.phone) html += normal(`Tel: ${tab.customer.phone}`);
  } else if (tab.guestCustomerName) {
    html += bold(`CLIENTE: ${tab.guestCustomerName}`);
  }

  // Delivery address (from first delivery order found)
  const deliveryOrder = tab.orders.find((o) => o.type === "DELIVERY" && o.deliveryAddress);
  if (deliveryOrder?.deliveryAddress) {
    const addr = deliveryOrder.deliveryAddress;
    html += divider();
    html += ctrBold("*** ENTREGA ***");
    if (addr.street || addr.number)
      html += bold(`ENDERECO: ${[addr.street, addr.number].filter(Boolean).join(", ")}`);
    if (addr.neighborhood) html += bold(`BAIRRO: ${addr.neighborhood}`);
    if (addr.city) html += bold(`CIDADE: ${addr.city}${addr.state ? "/" + addr.state : ""}`);
  }

  html += divider();
  html += ctr("ITENS");
  html += divider();

  // Group items from all orders (consolidate same product+price)
  const itemMap = new Map<
    string,
    { name: string; quantity: number; unitPrice: number; notes?: string | null }
  >();
  for (const order of tab.orders) {
    for (const item of order.items) {
      const key = `${item.product.name}|${item.unitPrice}`;
      const existing = itemMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        itemMap.set(key, {
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }
    }
  }

  for (const item of itemMap.values()) {
    const itemTotal = item.unitPrice * item.quantity;
    html += row(`${item.quantity}x ${item.name}`, formatCurrency(itemTotal), true);
    html += normal(`   Un: ${formatCurrency(item.unitPrice)}`);
    if (item.notes) html += normal(`* ${item.notes}`);
  }

  html += divider();

  // Totals
  const itemsSubtotal = tab.total - (tab.deliveryFee ?? 0);
  if ((tab.deliveryFee ?? 0) > 0) {
    html += row("Subtotal (itens):", formatCurrency(itemsSubtotal));
    html += row("Taxa de entrega:", `+${formatCurrency(tab.deliveryFee!)}`);
  } else {
    html += row("Subtotal:", formatCurrency(tab.total));
  }

  if (tab.discount > 0) html += row("Desconto:", `-${formatCurrency(tab.discount)}`);
  if ((tab.serviceCharge ?? 0) > 0)
    html += row("Taxa de servico (10%):", `+${formatCurrency(tab.serviceCharge!)}`);
  if ((tab.coverCharge ?? 0) > 0)
    html += row("Couvert artistico:", `+${formatCurrency(tab.coverCharge!)}`);

  html += divider();
  html += row("TOTAL:", formatCurrency(tab.finalTotal), true);
  html += row("Pagamento:", PAYMENT_LABELS[tab.paymentMethod] ?? tab.paymentMethod);
  if (tab.changeFor && tab.changeFor > 0) {
    html += row("Troco para:", formatCurrency(tab.changeFor));
    html += row("TROCO:", formatCurrency(tab.change ?? 0), true);
  }
  html += divider();

  // Tab notes
  if (tab.notes) {
    html += ctr("OBSERVACOES");
    html += bold(tab.notes);
    html += divider();
  }

  // Orders summary with per-order notes
  html += ctr("RESUMO DE PEDIDOS");
  html += divider();
  for (const order of tab.orders) {
    html += row(`Pedido #${order.orderNumber}`, formatCurrency(order.total));
    if (order.notes) html += normal(`  Obs: ${order.notes}`);
  }

  html += divider();
  html += ctr("Obrigado pela preferencia!");
  html += ctr("www.chamou.delivery");
  html += divider("═");

  return html;
}

// ─── Print helper ─────────────────────────────────────────────────────────────

export function printTabReceipt(tab: PrintTab, restaurant: PrintRestaurant): void {
  const body = buildTabReceiptHTML(tab, restaurant);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Cupom - ${tab.table?.identifier ?? tab.customer?.name ?? tab.guestCustomerName ?? "Comanda"}</title>
<style>
  @page { size: 58mm auto; margin: 2mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8.5pt;
    font-weight: 400;
    line-height: 1.4;
    color: #000;
    background: #fff;
    width: 54mm;
    word-break: break-word;
  }
  div { white-space: pre-wrap; }
  .b { font-weight: 700; }
  .ctr { text-align: center; }
  .div { width: 100%; margin: 1px 0; }
  .div-single { border-bottom: 1px solid #000; }
  .div-double { border-bottom: 3px double #000; }
  .row { display: flex; justify-content: space-between; }
  .row span:first-child { flex: 1; margin-right: 4px; }
  .row span:last-child { flex-shrink: 0; }
</style>
</head>
<body>${body}</body>
</html>`;

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

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 2000);
}

// ─── Screen preview component ─────────────────────────────────────────────────

interface Props {
  tab: PrintTab;
  restaurant: PrintRestaurant;
  className?: string;
}

export function TabPrintReceipt({ tab, restaurant, className = "" }: Props) {
  const body = buildTabReceiptHTML(tab, restaurant);
  return (
    <div
      className={`mx-auto max-w-md overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4 font-mono text-xs shadow-sm ${className}`}
      style={{ width: "58mm" }}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
