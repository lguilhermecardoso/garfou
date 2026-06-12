"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, getOrderStatusLabel } from "@/lib/utils";

interface DailyOrder {
  orderNumber: number;
  status: string;
  type: string;
  paymentMethod: string | null;
  total: number;
  deliveryFee: number;
  createdAt: string;
  customerName: string | null;
  customerPhone: string | null;
  tableNumber: string | null;
  items: { name: string; quantity: number; unitPrice: number }[];
}

interface DailySummary {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  orders: DailyOrder[];
}

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Mesa",
  TAKEOUT: "Balcão",
  DELIVERY: "Entrega",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  PIX_ONLINE: "PIX Online",
  CREDIT_CARD: "Crédito",
  CREDIT_CARD_ONLINE: "Crédito Online",
  DEBIT_CARD: "Débito",
  VOUCHER: "Voucher",
};

function buildPrintHtml(summary: DailySummary): string {
  const date = new Date(summary.date);
  const dateStr = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const now = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  // Count by payment method
  const byPayment: Record<string, number> = {};
  for (const o of summary.orders) {
    const key = o.paymentMethod ?? "N/A";
    byPayment[key] = (byPayment[key] ?? 0) + o.total;
  }

  const col = (s: string, w: number, align: "l" | "r" = "l") => {
    const str = String(s ?? "");
    if (align === "r") return str.padStart(w).slice(-w);
    return str.padEnd(w).slice(0, w);
  };

  const divider = "─".repeat(48);
  const thin = "·".repeat(48);

  let body = `<pre style="font-family:monospace;font-size:12px;line-height:1.5;width:72mm">`;
  body += `${col("FECHAMENTO DO DIA", 48, "r")}\n`;
  body += `${col(dateStr, 48, "r")}\n`;
  body += `${divider}\n`;
  body += `${col(`PEDIDOS`, 24)}${col(String(summary.totalOrders), 24, "r")}\n`;
  body += `${col(`RECEITA TOTAL`, 24)}${col(formatCurrency(summary.totalRevenue), 24, "r")}\n`;
  body += `${divider}\n`;
  body += `FORMA DE PAGAMENTO\n`;
  body += `${thin}\n`;
  for (const [method, amount] of Object.entries(byPayment)) {
    const label = PAYMENT_LABEL[method] ?? method;
    body += `${col(label, 30)}${col(formatCurrency(amount), 18, "r")}\n`;
  }
  body += `${divider}\n`;
  body += `PEDIDOS\n`;
  body += `${thin}\n`;

  for (const o of summary.orders) {
    const who = o.customerName ?? (o.tableNumber ? `Mesa ${o.tableNumber}` : "Balcão");
    const typeLabel = TYPE_LABEL[o.type] ?? o.type;
    const time = new Date(o.createdAt).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    body += `#${col(String(o.orderNumber), 5)} ${col(time, 5)} ${col(typeLabel, 7)} ${col(who, 20)}\n`;
    for (const item of o.items) {
      body += `  ${col(`${item.quantity}x ${item.name}`, 35)}${col(formatCurrency(item.quantity * item.unitPrice), 12, "r")}\n`;
    }
    if (o.deliveryFee > 0) {
      body += `  ${col("Taxa de entrega", 35)}${col(formatCurrency(o.deliveryFee), 12, "r")}\n`;
    }
    body += `  ${col(getOrderStatusLabel(o.status), 30)}${col(formatCurrency(o.total), 18, "r")}\n`;
    body += `${thin}\n`;
  }

  body += `${divider}\n`;
  body += `${col(`Impresso: ${now}`, 48, "r")}\n`;
  body += `</pre>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fechamento do Dia</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}
@page{size:80mm auto;margin:4mm}</style></head><body>${body}</body></html>`;
}

export function DailyClosureButton({ restaurantId }: { restaurantId: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePrint() {
    setLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders/daily-summary`);
      if (!res.ok) throw new Error("Erro ao carregar resumo do dia");
      const json = await res.json();
      const summary: DailySummary = json.data;

      if (summary.totalOrders === 0) {
        toast.info("Nenhum pedido registrado hoje.");
        return;
      }

      const html = buildPrintHtml(summary);
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:80mm;height:0";
      document.body.appendChild(iframe);
      iframe.contentDocument!.open();
      iframe.contentDocument!.write(html);
      iframe.contentDocument!.close();
      iframe.contentWindow!.onafterprint = () => document.body.removeChild(iframe);
      setTimeout(() => iframe.contentWindow!.print(), 300);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao imprimir fechamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="font-semibold text-neutral-900">Fechamento do Dia</p>
        <p className="text-sm text-neutral-500">
          Imprime todos os pedidos de hoje com clientes, itens e receita total.
        </p>
      </div>
      <Button variant="outline" onClick={handlePrint} loading={loading}>
        <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
        Imprimir fechamento
      </Button>
    </div>
  );
}
