import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | { toString(): string }): string {
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOVO_PEDIDO: "Novo Pedido",
    AGUARDANDO_CONFIRMACAO: "Aguardando Confirmação",
    CONFIRMADO: "Confirmado",
    EM_PREPARO: "Em Preparo",
    PRONTO: "Pronto",
    SAIU_PARA_ENTREGA: "Saiu para Entrega",
    FINALIZADO: "Finalizado",
    CANCELADO: "Cancelado",
  };
  return labels[status] ?? status;
}

/**
 * Returns the start of the current day in BRT (UTC-3).
 * Vercel/servers run on UTC; without this, "today" on the server
 * drifts 3 hours behind the restaurant's local time.
 */
export function startOfDayBRT(date: Date = new Date()): Date {
  // Shift date to BRT perspective, floor to midnight, shift back to UTC
  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3
  const brtMs = date.getTime() + BRT_OFFSET_MS;
  const brtDate = new Date(brtMs);
  // Midnight BRT = start of that UTC date minus the offset → + 3h in UTC
  return new Date(
    Date.UTC(brtDate.getUTCFullYear(), brtDate.getUTCMonth(), brtDate.getUTCDate()) - BRT_OFFSET_MS
  );
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NOVO_PEDIDO: "bg-blue-100 text-blue-800",
    AGUARDANDO_CONFIRMACAO: "bg-yellow-100 text-yellow-800",
    CONFIRMADO: "bg-green-100 text-green-800",
    EM_PREPARO: "bg-orange-100 text-orange-800",
    PRONTO: "bg-emerald-100 text-emerald-800",
    SAIU_PARA_ENTREGA: "bg-purple-100 text-purple-800",
    FINALIZADO: "bg-gray-100 text-gray-800",
    CANCELADO: "bg-red-100 text-red-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
