/**
 * OrderPrintReceipt
 *
 * Renders an order receipt formatted for a 58mm non-fiscal thermal printer
 * (Bematech MP-4200 TH FI, 48 characters per line at default font).
 *
 * Supports two modes:
 *  - `screen`  — rendered in the browser as a styled preview inside the modal
 *  - `print`   — injected into a hidden <iframe> and sent to the OS print dialog
 *                using window.print(); the iframe uses a @page CSS rule with the
 *                exact 58mm width so the browser sends the correct page size to
 *                the printer driver.
 *
 * Usage:
 *   <OrderPrintReceipt order={order} />
 *
 *   // trigger the browser print dialog:
 *   printOrder(order)   // standalone helper
 */

"use client";

import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintAddon {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PrintSelectedOption {
  optionName: string;
  quantity: number;
  unitPrice: number;
  isRemoval: boolean;
}

export interface PrintSplit {
  splitIndex: number;
  productName: string;
}

export interface PrintItem {
  quantity: number;
  product: { name: string };
  unitPrice: number;
  notes?: string | null;
  addons?: PrintAddon[];
  selectedOptions?: PrintSelectedOption[];
  splits?: PrintSplit[];
}

export interface PrintOrder {
  orderNumber: number;
  createdAt: string | Date;
  type: string;
  tableNumber?: string | null;
  status: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  notes?: string | null;
  customer?: { name: string; phone?: string | null } | null;
  tab?: { guestCustomerName?: string | null } | null;
  deliveryAddress?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  items: PrintItem[];
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

const TYPE_LABELS: Record<string, string> = {
  DINE_IN: "MESA",
  DELIVERY: "DELIVERY",
  TAKEOUT: "RETIRADA",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao Credito",
  DEBIT_CARD: "Cartao Debito",
  PIX: "PIX",
  VOUCHER: "Vale",
};

// ─── Receipt builder ──────────────────────────────────────────────────────────

export function buildReceiptLines(order: PrintOrder): string[] {
  const rows: string[] = [];
  const add = (...lines: string[]) => rows.push(...lines);

  const createdAt = new Date(order.createdAt);
  const dateStr = createdAt.toLocaleDateString("pt-BR");
  const timeStr = createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // Determine customer/table label
  let customerLabel = "";
  if (order.tableNumber) {
    customerLabel = `MESA ${order.tableNumber}`;
  } else if (order.customer?.name) {
    customerLabel = order.customer.name;
  } else if (order.tab?.guestCustomerName) {
    customerLabel = order.tab.guestCustomerName;
  }

  add(
    line("═"),
    center("chamou.delivery"),
    center("Sistema de Gestao de Pedidos"),
    line("─"),
    center(`PEDIDO #${order.orderNumber}`),
    center(`*** ${TYPE_LABELS[order.type] ?? order.type} ***`),
    ...(customerLabel ? [center(customerLabel)] : []),
    line("─"),
    leftRight(`Data: ${dateStr}`, `Hora: ${timeStr}`)
  );

  // Customer information (always show if available)
  if (order.customer) {
    add(
      line("─"),
      `CLIENTE: ${order.customer.name}`,
      ...(order.customer.phone ? [`TELEFONE: ${order.customer.phone}`] : [])
    );
  }

  // Delivery address (only for delivery orders)
  if (order.type === "DELIVERY" && order.deliveryAddress) {
    const addr = order.deliveryAddress;
    add(line("─"));
    if (addr.street && addr.number) {
      add(...wrap(`ENDERECO: ${addr.street}, ${addr.number}`, 0));
    }
    if (addr.neighborhood) {
      add(`BAIRRO: ${addr.neighborhood}`);
    }
    if (addr.city && addr.state) {
      add(`CIDADE: ${addr.city}/${addr.state}`);
    } else if (addr.city) {
      add(`CIDADE: ${addr.city}`);
    }
  }

  add(line("─"), center("ITENS"), line("─"));

  for (const item of order.items) {
    const itemTotal = item.unitPrice * item.quantity;
    const qtyName = `${item.quantity}x ${item.product.name}`;
    if (qtyName.length + formatCurrency(itemTotal).length + 1 <= COLS) {
      add(leftRight(qtyName, formatCurrency(itemTotal)));
    } else {
      add(
        ...wrap(qtyName),
        " ".repeat(COLS - formatCurrency(itemTotal).length) + formatCurrency(itemTotal)
      );
    }
    add(`   Un: ${formatCurrency(item.unitPrice)}`);
    if (item.splits?.length) {
      const denominator = item.splits.length;
      for (const split of item.splits) {
        add(...wrap(`  ${1}/${denominator} ${split.productName}`, 2));
      }
    }
    if (item.selectedOptions?.length) {
      for (const selection of item.selectedOptions) {
        const prefix = selection.isRemoval ? "  - " : "  + ";
        const priceLabel = selection.isRemoval
          ? ""
          : `  ${formatCurrency(selection.unitPrice * selection.quantity)}`;
        add(...wrap(`${prefix}${selection.quantity}x ${selection.optionName}${priceLabel}`, 2));
      }
    }
    if (item.notes) add(...wrap(`* ${item.notes}`, 3));
    if (item.addons?.length) {
      for (const addon of item.addons) {
        add(
          ...wrap(
            `  + ${addon.quantity}x ${addon.name}  ${formatCurrency(addon.unitPrice * addon.quantity)}`,
            4
          )
        );
      }
    }
  }

  add(line("─"));

  if (order.discount > 0) {
    add(
      leftRight("Subtotal:", formatCurrency(order.subtotal)),
      leftRight("Desconto:", `-${formatCurrency(order.discount)}`)
    );
  }
  if (order.deliveryFee > 0) {
    add(leftRight("Taxa de entrega:", formatCurrency(order.deliveryFee)));
  }

  add(
    line("─"),
    leftRight("TOTAL:", formatCurrency(order.total)),
    leftRight(
      "Pagamento:",
      PAYMENT_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "—"
    ),
    line("─")
  );

  if (order.notes) {
    add(center("OBSERVACOES"), ...wrap(order.notes), line("─"));
  }

  add(center("Obrigado pela preferencia!"), center("www.chamou.delivery"), line("═"));

  return rows;
}

// ─── Standalone print helper ──────────────────────────────────────────────────

/**
 * Opens the browser print dialog with a page sized for 58mm thermal paper.
 * The receipt content is injected into a hidden <iframe> so it doesn't
 * affect the current page layout.
 */
function buildReceiptHTML(order: PrintOrder): string {
  const e = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const createdAt = new Date(order.createdAt);
  const dateStr = createdAt.toLocaleDateString("pt-BR");
  const timeStr = createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const divider = (char = "─") =>
    char === "═" ? `<div class="div div-double"></div>` : `<div class="div div-single"></div>`;
  const normal = (text: string) => `<div>${e(text)}</div>`;
  const bold = (text: string) => `<div class="b">${e(text)}</div>`;
  const ctr = (text: string) => `<div class="ctr">${e(text)}</div>`;
  const ctrBold = (text: string) => `<div class="ctr b">${e(text)}</div>`;
  const row = (left: string, right: string, isBold = false) =>
    `<div class="row${isBold ? " b" : ""}"><span>${e(left)}</span><span>${e(right)}</span></div>`;

  let html = "";

  html += divider("═");
  html += ctr("chamou.delivery");
  html += ctr("Sistema de Gestao de Pedidos");
  html += divider();
  html += ctrBold(`PEDIDO #${order.orderNumber}`);
  html += ctrBold(`*** ${TYPE_LABELS[order.type] ?? order.type} ***`);

  let customerLabel = "";
  if (order.tableNumber) customerLabel = `MESA ${order.tableNumber}`;
  else if (order.customer?.name) customerLabel = order.customer.name;
  else if (order.tab?.guestCustomerName) customerLabel = order.tab.guestCustomerName;
  if (customerLabel) html += ctrBold(customerLabel);

  html += divider();
  html += row(`Data: ${dateStr}`, `Hora: ${timeStr}`);

  // Customer info
  if (order.customer) {
    html += divider();
    html += bold(`CLIENTE: ${order.customer.name}`);
    if (order.customer.phone) html += normal(`TELEFONE: ${order.customer.phone}`);
  }

  // Delivery address
  if (order.type === "DELIVERY" && order.deliveryAddress) {
    const addr = order.deliveryAddress;
    html += divider();
    if (addr.street && addr.number) html += bold(`ENDERECO: ${addr.street}, ${addr.number}`);
    if (addr.neighborhood) html += bold(`BAIRRO: ${addr.neighborhood}`);
    if (addr.city) html += bold(`CIDADE: ${addr.city}${addr.state ? "/" + addr.state : ""}`);
  }

  html += divider();
  html += ctr("ITENS");
  html += divider();

  for (const item of order.items) {
    const itemTotal = item.unitPrice * item.quantity;
    html += row(`${item.quantity}x ${item.product.name}`, formatCurrency(itemTotal), true);
    html += normal(`   Un: ${formatCurrency(item.unitPrice)}`);
    if (item.splits?.length) {
      const den = item.splits.length;
      for (const split of item.splits) {
        html += normal(`  1/${den} ${split.productName}`);
      }
    }
    if (item.selectedOptions?.length) {
      for (const sel of item.selectedOptions) {
        const prefix = sel.isRemoval ? "  - " : "  + ";
        const price = sel.isRemoval ? "" : `  ${formatCurrency(sel.unitPrice * sel.quantity)}`;
        html += normal(`${prefix}${sel.quantity}x ${sel.optionName}${price}`);
      }
    }
    if (item.notes) html += normal(`* ${item.notes}`);
    if (item.addons?.length) {
      for (const addon of item.addons) {
        html += normal(
          `  + ${addon.quantity}x ${addon.name}  ${formatCurrency(addon.unitPrice * addon.quantity)}`
        );
      }
    }
  }

  html += divider();

  if (order.discount > 0) {
    html += row("Subtotal:", formatCurrency(order.subtotal));
    html += row("Desconto:", `-${formatCurrency(order.discount)}`);
  }
  if (order.deliveryFee > 0) {
    html += row("Taxa de entrega:", formatCurrency(order.deliveryFee));
  }

  html += divider();
  html += row("TOTAL:", formatCurrency(order.total), true);
  html += row(
    "Pagamento:",
    PAYMENT_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "—"
  );
  html += divider();

  if (order.notes) {
    html += ctr("OBSERVACOES");
    html += bold(order.notes);
    html += divider();
  }

  html += ctr("Obrigado pela preferencia!");
  html += ctr("www.chamou.delivery");
  html += divider("═");

  return html;
}

export function printOrder(order: PrintOrder): void {
  const body = buildReceiptHTML(order);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pedido #${order.orderNumber}</title>
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

  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  // Print
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  // Remove iframe after print dialog closes
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 2000);
}

// ─── Screen preview component ─────────────────────────────────────────────────

interface Props {
  /** The order to render */
  order: PrintOrder;
  /** Additional CSS class on the wrapper */
  className?: string;
}

/**
 * Renders a monospaced receipt preview styled to look like thermal paper.
 * Suitable for display inside a modal.
 */
export function OrderPrintReceipt({ order, className = "" }: Props) {
  const body = buildReceiptHTML(order);

  return (
    <div
      className={`rounded border border-neutral-200 bg-white p-4 shadow-inner ${className}`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "13px",
        lineHeight: "1.5",
        overflowX: "auto",
        maxHeight: "60vh",
        overflowY: "auto",
      }}
      aria-label={`Cupom do pedido #${order.orderNumber}`}
    >
      <style>{`
        .receipt-preview div { white-space: pre-wrap; word-break: break-word; }
        .receipt-preview .b { font-weight: 700; }
        .receipt-preview .ctr { text-align: center; }
        .receipt-preview .div { width: 100%; margin: 1px 0; }
        .receipt-preview .div-single { border-bottom: 1px solid #000; }
        .receipt-preview .div-double { border-bottom: 3px double #000; }
        .receipt-preview .row { display: flex; justify-content: space-between; }
        .receipt-preview .row span:first-child { flex: 1; margin-right: 4px; }
        .receipt-preview .row span:last-child { flex-shrink: 0; }
      `}</style>
      <div className="receipt-preview" dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}
