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
    district?: string;
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
    if (addr.district) {
      add(`BAIRRO: ${addr.district}`);
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
export function printOrder(order: PrintOrder): void {
  const lines = buildReceiptLines(order);
  const escaped = lines.map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("\n");

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
    font-size: 9.5pt;
    font-weight: 500;
    line-height: 1.4;
    color: #000;
    background: #fff;
    white-space: pre;
    width: 54mm;
    -webkit-font-smoothing: none;
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
  const lines = buildReceiptLines(order);

  return (
    <div
      className={`rounded border border-neutral-200 bg-white p-4 shadow-inner ${className}`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "13px",
        fontWeight: 500,
        lineHeight: "1.5",
        whiteSpace: "pre",
        overflowX: "auto",
        maxHeight: "60vh",
        overflowY: "auto",
      }}
      aria-label={`Cupom do pedido #${order.orderNumber}`}
    >
      {lines.join("\n")}
    </div>
  );
}
