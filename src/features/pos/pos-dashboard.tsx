/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, Store, UserRound } from "lucide-react";
import { printTabReceipt, type PrintTab, type PrintRestaurant } from "./tab-print-receipt";
import { CashRegisterPanel } from "@/features/cash-register/cash-register-panel";
import { PrintConfirmationModal } from "@/components/shared/print-confirmation-modal";
import { usePrintConfirmation } from "@/hooks/use-print-confirmation";

type PaymentMethod = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "VOUCHER";

interface TabListItem {
  id: string;
  status: "OPEN" | "CLOSED" | "PAID" | "CANCELLED";
  total: number | string;
  finalTotal: number | string;
  table: { id: string; identifier: string } | null;
  customer: { id: string; name: string; phone?: string | null } | null;
  guestCustomerName: string | null;
  createdAt: string;
}

interface TabDetail extends TabListItem {
  discount: number | string;
  notes?: string | null;
  closedAt?: string | null;
  orders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    total: number | string;
    createdAt: string;
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      product: { name: string };
    }>;
  }>;
}

interface Restaurant {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

interface Props {
  restaurantId: string;
}

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  VOUCHER: "Voucher",
};

export function PosDashboard({ restaurantId }: Props) {
  const queryClient = useQueryClient();
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [discount, setDiscount] = useState("0");
  const [applyServiceCharge, setApplyServiceCharge] = useState(false);
  const [applyCoverCharge, setApplyCoverCharge] = useState(false);
  const [coverChargeValue, setCoverChargeValue] = useState("10");
  const [notes, setNotes] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const printConfirmation = usePrintConfirmation();

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["restaurant", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/settings`);
      if (!response.ok) throw new Error("Falha ao carregar dados do restaurante");
      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
      };
    },
  });

  const { data: tabs = [], isLoading } = useQuery<TabListItem[]>({
    queryKey: ["pos-tabs", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/tabs?status=OPEN`);
      if (!response.ok) throw new Error("Falha ao carregar comandas");
      return response.json() as Promise<TabListItem[]>;
    },
    refetchInterval: 10_000,
  });

  // Update selected tab when tabs list changes
  const tabIds = tabs.map((t) => t.id).join(",");
  useEffect(() => {
    setSelectedTabId((current) =>
      current && tabs.some((tab) => tab.id === current) ? current : (tabs[0]?.id ?? null)
    );
  }, [tabIds, tabs]);

  const { data: selectedTab, isLoading: isLoadingDetail } = useQuery<TabDetail | null>({
    queryKey: ["pos-tab-detail", restaurantId, selectedTabId],
    queryFn: async () => {
      if (!selectedTabId) return null;
      const response = await fetch(`/api/restaurants/${restaurantId}/tabs/${selectedTabId}`);
      if (!response.ok) throw new Error("Falha ao carregar detalhes da comanda");
      return response.json() as Promise<TabDetail>;
    },
    enabled: Boolean(selectedTabId),
  });

  const total = Number(selectedTab?.total ?? 0);
  const discountValue = Number(discount || 0);
  const serviceChargeValue = applyServiceCharge ? total * 0.1 : 0; // 10% do total
  const coverChargeAmount = applyCoverCharge ? Number(coverChargeValue || 0) : 0;
  const finalTotal = Math.max(total - discountValue + serviceChargeValue + coverChargeAmount, 0);
  const selectedLabel = selectedTab?.table
    ? `Mesa ${selectedTab.table.identifier}`
    : (selectedTab?.customer?.name ?? selectedTab?.guestCustomerName ?? "Sem comanda");

  async function closeTab() {
    if (!selectedTabId || !selectedTab || isClosing) return;

    try {
      setIsClosing(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/tabs/${selectedTabId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          discount: discountValue,
          serviceCharge: serviceChargeValue,
          coverCharge: coverChargeAmount,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Erro ao fechar comanda");
      }

      // Prepare print data
      if (restaurant) {
        const printTab: PrintTab = {
          createdAt: selectedTab.createdAt,
          closedAt: json.closedAt || new Date().toISOString(),
          total: Number(selectedTab.total),
          discount: discountValue,
          serviceCharge: serviceChargeValue,
          coverCharge: coverChargeAmount,
          finalTotal: finalTotal,
          paymentMethod: paymentMethod,
          notes: notes.trim() || null,
          table: selectedTab.table ? { identifier: selectedTab.table.identifier } : null,
          customer: selectedTab.customer || null,
          orders: selectedTab.orders.map((order) => ({
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            status: order.status,
            total: Number(order.total),
            items: order.items.map((item) => ({
              quantity: item.quantity,
              product: { name: item.product.name },
              unitPrice: item.unitPrice,
            })),
          })),
        };

        const printRestaurant: PrintRestaurant = {
          name: restaurant.name,
          phone: restaurant.phone || undefined,
          address: restaurant.address || undefined,
          city: restaurant.city || undefined,
          state: restaurant.state || undefined,
        };

        // Print receipt with confirmation modal
        printConfirmation.startPrint(() => printTabReceipt(printTab, printRestaurant));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pos-tabs", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["pos-tab-detail", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["tables", restaurantId] }),
      ]);

      setDiscount("0");
      setApplyServiceCharge(false);
      setApplyCoverCharge(false);
      setCoverChargeValue("10");
      setNotes("");
      toast.success("Comanda fechada com sucesso!", {
        description: `Total pago: ${formatCurrency(finalTotal)} • Cupom enviado para impressão`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fechar comanda.");
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Painel de Caixa */}
      <CashRegisterPanel restaurantId={restaurantId} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">PDV / Frente de Caixa</h1>
          <p className="text-sm text-neutral-500">
            Acompanhe comandas abertas e finalize pagamentos.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          {tabs.length} comanda(s) aberta(s)
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Receipt className="text-primary-500 h-4 w-4" aria-hidden="true" />
              <h2 className="font-semibold text-neutral-900">Comandas abertas</h2>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-neutral-500">Carregando comandas...</p>
              ) : tabs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
                  Nenhuma comanda aberta no momento.
                </p>
              ) : (
                tabs.map((tab) => {
                  const isActive = tab.id === selectedTabId;
                  const label = tab.table
                    ? `Mesa ${tab.table.identifier}`
                    : (tab.customer?.name ?? tab.guestCustomerName ?? "Cliente avulso");
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTabId(tab.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                        isActive
                          ? "border-primary-500 bg-primary-50"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-900">{label}</p>
                          <p className="text-xs text-neutral-500">
                            Aberta em {formatDate(tab.createdAt)}
                          </p>
                        </div>
                        {tab.table ? (
                          <Store className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <UserRound className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                      <p className="text-primary-600 mt-2 text-base font-bold">
                        {formatCurrency(tab.total)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {!selectedTabId || !selectedTab ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                Selecione uma comanda para ver detalhes e fechar o pagamento.
              </div>
            ) : isLoadingDetail ? (
              <p className="text-sm text-neutral-500">Carregando detalhes da comanda...</p>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">{selectedLabel}</h2>
                    <p className="text-sm text-neutral-500">
                      Aberta em {formatDate(selectedTab.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-500">Total acumulado</p>
                    <p className="text-primary-600 text-2xl font-bold">{formatCurrency(total)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
                    Pedidos da comanda
                  </h3>
                  <div className="space-y-3">
                    {selectedTab.orders.map((order) => (
                      <div key={order.id} className="rounded-2xl border border-neutral-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-900">
                              Pedido #{order.orderNumber}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-neutral-600">
                          {order.items.map((item) => (
                            <p key={item.id}>
                              {item.quantity}x {item.product.name}
                            </p>
                          ))}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-neutral-900">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <CreditCard className="text-primary-500 h-4 w-4" aria-hidden="true" />
                    <h3 className="font-semibold text-neutral-900">Pagamento</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Forma de pagamento
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                      >
                        {Object.entries(paymentLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Desconto adicional
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="serviceCharge"
                        checked={applyServiceCharge}
                        onChange={(event) => setApplyServiceCharge(event.target.checked)}
                        className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-neutral-300"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="serviceCharge"
                          className="text-sm font-medium text-neutral-700"
                        >
                          Taxa de serviço (10%)
                        </label>
                        {applyServiceCharge && (
                          <p className="text-xs text-neutral-500">
                            {formatCurrency(serviceChargeValue)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="coverCharge"
                        checked={applyCoverCharge}
                        onChange={(event) => setApplyCoverCharge(event.target.checked)}
                        className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-neutral-300"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="coverCharge"
                          className="text-sm font-medium text-neutral-700"
                        >
                          Couvert artístico
                        </label>
                        {applyCoverCharge && (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={coverChargeValue}
                            onChange={(event) => setCoverChargeValue(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-sm"
                            placeholder="10.00"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-neutral-700">Observações</label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="mt-1 min-h-24 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                      placeholder="Observações do fechamento, conferência, troco, etc."
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
                    <div className="flex-1">
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Subtotal</span>
                          <span className="text-neutral-900">{formatCurrency(total)}</span>
                        </div>
                        {discountValue > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Desconto</span>
                            <span>-{formatCurrency(discountValue)}</span>
                          </div>
                        )}
                        {serviceChargeValue > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Taxa de serviço (10%)</span>
                            <span>+{formatCurrency(serviceChargeValue)}</span>
                          </div>
                        )}
                        {coverChargeAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Couvert artístico</span>
                            <span>+{formatCurrency(coverChargeAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-neutral-200 pt-1.5 font-semibold">
                          <span className="text-neutral-900">Total final</span>
                          <span className="text-xl text-neutral-900">
                            {formatCurrency(finalTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button onClick={closeTab} loading={isClosing} className="ml-4">
                      Confirmar pagamento
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Confirmation Modal */}
      <PrintConfirmationModal
        open={printConfirmation.isOpen}
        onOpenChange={printConfirmation.handleCancel}
        onConfirm={printConfirmation.handleConfirm}
        onRetry={printConfirmation.handleRetry}
      />
    </div>
  );
}
