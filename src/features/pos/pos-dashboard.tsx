/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Receipt,
  Store,
  UserRound,
  Plus,
  Minus,
  Search,
  X,
  Truck,
  UtensilsCrossed,
  ShoppingCart,
  Trash2,
} from "lucide-react";
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
    type: string;
    total: number | string;
    deliveryFee: number | string;
    notes?: string | null;
    createdAt: string;
    deliveryAddress?: {
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    } | null;
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

interface MenuProduct {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
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

  // ── Tab close state ──
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [discount, setDiscount] = useState("0");
  const [applyServiceCharge, setApplyServiceCharge] = useState(false);
  const [applyCoverCharge, setApplyCoverCharge] = useState(false);
  const [coverChargeValue, setCoverChargeValue] = useState("10");
  const [applyDeliveryFee, setApplyDeliveryFee] = useState(false);
  const [deliveryFeeValue, setDeliveryFeeValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [trocoParaValue, setTrocoParaValue] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [confirmingCancelOrderId, setConfirmingCancelOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const printConfirmation = usePrintConfirmation();

  // ── New order modal state ──
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrderSearch, setNewOrderSearch] = useState("");
  const [newOrderCart, setNewOrderCart] = useState<
    {
      productId: string;
      name: string;
      price: number;
      quantity: number;
      customAddons: { name: string; unitPrice: number }[];
    }[]
  >([]);
  const [addonInputs, setAddonInputs] = useState<Record<string, { name: string; price: string }>>(
    {}
  );
  const [newOrderCustomer, setNewOrderCustomer] = useState("");
  const [newOrderType, setNewOrderType] = useState<"TAKEOUT" | "DELIVERY">("TAKEOUT");
  const [newOrderDeliveryFee, setNewOrderDeliveryFee] = useState("");
  const [newOrderDeliveryStreet, setNewOrderDeliveryStreet] = useState("");
  const [newOrderDeliveryNumber, setNewOrderDeliveryNumber] = useState("");
  const [newOrderDeliveryNeighborhood, setNewOrderDeliveryNeighborhood] = useState("");
  const [newOrderDeliveryCity, setNewOrderDeliveryCity] = useState("");
  const [newOrderDeliveryState, setNewOrderDeliveryState] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState<PaymentMethod>("PIX");
  const [newOrderTrocoParaValue, setNewOrderTrocoParaValue] = useState("");
  const [isSubmittingNewOrder, setIsSubmittingNewOrder] = useState(false);

  // ── Queries ──
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

  const { data: menuCategories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["pos-menu", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu?includeInactive=false`);
      const json = await res.json();
      return (json.data ?? []) as MenuCategory[];
    },
    enabled: isNewOrderOpen,
    staleTime: 60_000,
  });

  // Auto-select first tab
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

  // ── Tab close calculations ──
  const total = Number(selectedTab?.total ?? 0);
  // Delivery fee already baked into order.total (and thus tab.total) — extract to show separately
  const ordersDeliveryFee = (selectedTab?.orders ?? []).reduce(
    (sum, o) => sum + Number(o.deliveryFee ?? 0),
    0
  );
  const itemsSubtotal = total - ordersDeliveryFee;
  const discountValue = Number(discount || 0);
  const serviceChargeValue = applyServiceCharge ? total * 0.1 : 0;
  const coverChargeAmount = applyCoverCharge ? Number(coverChargeValue || 0) : 0;
  const deliveryFeeAmount = applyDeliveryFee ? Number(deliveryFeeValue || 0) : 0;
  const finalTotal = Math.max(
    total - discountValue + serviceChargeValue + coverChargeAmount + deliveryFeeAmount,
    0
  );
  const trocoParaNum = paymentMethod === "CASH" ? parseFloat(trocoParaValue) || 0 : 0;
  const trocoAmount = trocoParaNum > 0 ? Math.max(0, trocoParaNum - finalTotal) : 0;
  const selectedLabel = selectedTab?.table
    ? `Mesa ${selectedTab.table.identifier}`
    : (selectedTab?.customer?.name ?? selectedTab?.guestCustomerName ?? "Sem comanda");

  // ── New order helpers ──
  const allMenuProducts = useMemo(
    () => menuCategories.flatMap((cat) => cat.products),
    [menuCategories]
  );

  const filteredMenuProducts = newOrderSearch
    ? allMenuProducts.filter((p) => p.name.toLowerCase().includes(newOrderSearch.toLowerCase()))
    : allMenuProducts;

  const newOrderCartCount = newOrderCart.reduce((acc, i) => acc + i.quantity, 0);
  const newOrderSubtotal = newOrderCart.reduce((acc, i) => {
    const addonTotal = i.customAddons.reduce((s, a) => s + a.unitPrice, 0);
    return acc + (i.price + addonTotal) * i.quantity;
  }, 0);
  const newOrderDeliveryFeeNum =
    newOrderType === "DELIVERY" ? parseFloat(newOrderDeliveryFee) || 0 : 0;
  const newOrderGrandTotal = newOrderSubtotal + newOrderDeliveryFeeNum;
  const newOrderTrocoParaNum =
    newOrderPaymentMethod === "CASH" ? parseFloat(newOrderTrocoParaValue) || 0 : 0;
  const newOrderTrocoAmount =
    newOrderTrocoParaNum > 0 ? Math.max(0, newOrderTrocoParaNum - newOrderGrandTotal) : 0;

  function addToNewCart(product: MenuProduct) {
    setNewOrderCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing)
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          customAddons: [],
        },
      ];
    });
  }

  function removeFromNewCart(productId: string) {
    setNewOrderCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function resetNewOrder() {
    setNewOrderCart([]);
    setAddonInputs({});
    setNewOrderCustomer("");
    setNewOrderType("TAKEOUT");
    setNewOrderDeliveryFee("");
    setNewOrderDeliveryStreet("");
    setNewOrderDeliveryNumber("");
    setNewOrderDeliveryNeighborhood("");
    setNewOrderDeliveryCity("");
    setNewOrderDeliveryState("");
    setNewOrderNotes("");
    setNewOrderPaymentMethod("PIX");
    setNewOrderTrocoParaValue("");
    setNewOrderSearch("");
  }

  async function submitNewOrder() {
    if (newOrderCart.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }
    setIsSubmittingNewOrder(true);
    try {
      // 1. Create tab (avulso)
      const tabRes = await fetch(`/api/restaurants/${restaurantId}/tabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestCustomerName: newOrderCustomer.trim() || "Balcão",
        }),
      });
      const tabJson = await tabRes.json();
      if (!tabRes.ok) throw new Error(tabJson.error ?? "Erro ao criar comanda");
      const tabId: string = tabJson.id;

      // 2. Create order under tab
      const orderRes = await fetch(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newOrderType,
          tabId,
          paymentMethod: newOrderPaymentMethod,
          ...(() => {
            const parts = [newOrderNotes.trim()];
            if (newOrderTrocoParaNum > 0) {
              parts.push(`Troco para: R$${newOrderTrocoParaNum.toFixed(2).replace(".", ",")}`);
              if (newOrderTrocoAmount > 0)
                parts.push(`Troco: R$${newOrderTrocoAmount.toFixed(2).replace(".", ",")}`);
            }
            const combined = parts.filter(Boolean).join(" | ");
            return combined ? { notes: combined } : {};
          })(),
          ...(newOrderDeliveryFeeNum > 0 && { deliveryFee: newOrderDeliveryFeeNum }),
          ...(newOrderType === "DELIVERY" && {
            deliveryAddress: {
              street: newOrderDeliveryStreet.trim() || undefined,
              number: newOrderDeliveryNumber.trim() || undefined,
              neighborhood: newOrderDeliveryNeighborhood.trim() || undefined,
              city: newOrderDeliveryCity.trim() || undefined,
              state: newOrderDeliveryState.trim().toUpperCase() || undefined,
            },
          }),
          items: newOrderCart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            selectedOptions: [],
            splits: [],
            addons: [],
            customAddons: i.customAddons.map((a) => ({
              name: a.name,
              unitPrice: a.unitPrice,
              quantity: 1,
            })),
          })),
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderJson.error ?? "Erro ao criar pedido");

      toast.success(`Pedido #${orderJson.data?.orderNumber ?? ""} criado com sucesso!`);
      setIsNewOrderOpen(false);
      resetNewOrder();
      await queryClient.invalidateQueries({ queryKey: ["pos-tabs", restaurantId] });
      setSelectedTabId(tabId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
    } finally {
      setIsSubmittingNewOrder(false);
    }
  }

  // ── Cancel order ──
  async function cancelOrder(orderId: string) {
    setCancellingOrderId(orderId);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELADO" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao cancelar pedido");
      toast.success("Pedido cancelado", {
        description: "Não será considerado no financeiro.",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pos-tab-detail", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["pos-tabs", restaurantId] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar pedido");
    } finally {
      setCancellingOrderId(null);
      setConfirmingCancelOrderId(null);
    }
  }

  // ── Close tab ──
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
          deliveryFee: deliveryFeeAmount,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Erro ao fechar comanda");

      if (restaurant) {
        const printTab: PrintTab = {
          createdAt: selectedTab.createdAt,
          closedAt: json.closedAt || new Date().toISOString(),
          total: Number(selectedTab.total),
          discount: discountValue,
          serviceCharge: serviceChargeValue,
          coverCharge: coverChargeAmount,
          deliveryFee: ordersDeliveryFee || undefined,
          finalTotal,
          paymentMethod,
          notes: notes.trim() || null,
          changeFor: trocoParaNum > 0 ? trocoParaNum : undefined,
          change: trocoAmount > 0 ? trocoAmount : undefined,
          table: selectedTab.table ? { identifier: selectedTab.table.identifier } : null,
          customer: selectedTab.customer || null,
          guestCustomerName: selectedTab.guestCustomerName ?? null,
          orders: selectedTab.orders.map((order) => ({
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            status: order.status,
            type: order.type,
            total: Number(order.total),
            notes: order.notes ?? null,
            deliveryAddress: order.deliveryAddress ?? null,
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
      setApplyDeliveryFee(false);
      setDeliveryFeeValue("0");
      setNotes("");
      setTrocoParaValue("");
      toast.success("Comanda fechada com sucesso!", {
        description: `Total pago: ${formatCurrency(finalTotal)}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fechar comanda.");
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      <CashRegisterPanel restaurantId={restaurantId} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">PDV / Frente de Caixa</h1>
          <p className="text-sm text-neutral-500">
            Acompanhe comandas abertas e finalize pagamentos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {tabs.length} comanda(s) aberta(s)
          </Badge>
          <Button onClick={() => setIsNewOrderOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Novo pedido
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* ── Tab list ── */}
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
                  Nenhuma comanda aberta. Use o botão Novo pedido para criar uma.
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

        {/* ── Tab detail + payment ── */}
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
                    {selectedTab.orders.map((order) => {
                      const isCancellable =
                        order.status !== "FINALIZADO" && order.status !== "CANCELADO";
                      const isConfirmingCancel = confirmingCancelOrderId === order.id;
                      return (
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
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{order.status}</Badge>
                              {isCancellable &&
                                (isConfirmingCancel ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => cancelOrder(order.id)}
                                      disabled={cancellingOrderId === order.id}
                                      className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                    >
                                      Cancelar?
                                    </button>
                                    <button
                                      onClick={() => setConfirmingCancelOrderId(null)}
                                      className="rounded-lg bg-neutral-200 p-1 text-neutral-600 transition-colors hover:bg-neutral-300"
                                      aria-label="Não cancelar"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmingCancelOrderId(order.id)}
                                    title="Cancelar pedido"
                                    className="rounded-lg bg-red-100 p-1.5 text-red-600 transition-colors hover:bg-red-200"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ))}
                            </div>
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
                      );
                    })}
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
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
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
                        Desconto adicional (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  {paymentMethod === "CASH" && (
                    <div className="mt-3 flex items-end gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-amber-800">
                          Troco para (R$)
                        </label>
                        <input
                          type="number"
                          min={finalTotal}
                          step="0.50"
                          value={trocoParaValue}
                          onChange={(e) => setTrocoParaValue(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-amber-400 focus:outline-none"
                          placeholder={`Ex: ${Math.ceil(finalTotal / 10) * 10},00`}
                        />
                      </div>
                      {trocoParaNum > 0 && (
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-amber-700">Troco</p>
                          <p
                            className={`text-xl font-bold ${trocoAmount > 0 ? "text-green-700" : "text-red-600"}`}
                          >
                            {trocoAmount > 0 ? formatCurrency(trocoAmount) : "Valor insuficiente"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 grid gap-4 md:grid-cols-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="serviceCharge"
                        checked={applyServiceCharge}
                        onChange={(e) => setApplyServiceCharge(e.target.checked)}
                        className="text-primary-600 focus:ring-primary-500 mt-0.5 h-4 w-4 rounded border-neutral-300"
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

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="coverCharge"
                        checked={applyCoverCharge}
                        onChange={(e) => setApplyCoverCharge(e.target.checked)}
                        className="text-primary-600 focus:ring-primary-500 mt-0.5 h-4 w-4 rounded border-neutral-300"
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
                            onChange={(e) => setCoverChargeValue(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-sm"
                            placeholder="10.00"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="deliveryFeeClose"
                        checked={applyDeliveryFee}
                        onChange={(e) => setApplyDeliveryFee(e.target.checked)}
                        className="text-primary-600 focus:ring-primary-500 mt-0.5 h-4 w-4 rounded border-neutral-300"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="deliveryFeeClose"
                          className="text-sm font-medium text-neutral-700"
                        >
                          Taxa de entrega
                        </label>
                        {applyDeliveryFee && (
                          <input
                            type="number"
                            min="0"
                            step="0.50"
                            value={deliveryFeeValue}
                            onChange={(e) => setDeliveryFeeValue(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-sm"
                            placeholder="0.00"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-neutral-700">Observações</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 min-h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                      placeholder="Troco, conferência, obs do fechamento..."
                    />
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-neutral-200 pt-4">
                    <div className="flex-1 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Subtotal (itens)</span>
                        <span>{formatCurrency(itemsSubtotal)}</span>
                      </div>
                      {ordersDeliveryFee > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Taxa de entrega (pedido)</span>
                          <span>+{formatCurrency(ordersDeliveryFee)}</span>
                        </div>
                      )}
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
                      {deliveryFeeAmount > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Taxa de entrega</span>
                          <span>+{formatCurrency(deliveryFeeAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-neutral-200 pt-1.5 font-semibold">
                        <span className="text-neutral-900">Total final</span>
                        <span className="text-xl text-neutral-900">
                          {formatCurrency(finalTotal)}
                        </span>
                      </div>
                      {trocoAmount > 0 && (
                        <div className="flex justify-between rounded-lg bg-green-50 px-2 py-1 font-semibold text-green-700">
                          <span>Troco</span>
                          <span>{formatCurrency(trocoAmount)}</span>
                        </div>
                      )}
                    </div>
                    <Button onClick={closeTab} loading={isClosing} className="ml-6 shrink-0">
                      Confirmar pagamento
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── New order modal ── */}
      {isNewOrderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-stretch bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Novo pedido"
        >
          <div className="flex w-full flex-col bg-white md:flex-row">
            {/* Left: product picker */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                <h2 className="text-lg font-bold text-neutral-900">Novo pedido avulso</h2>
                <button
                  onClick={() => {
                    setIsNewOrderOpen(false);
                    resetNewOrder();
                  }}
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
                </button>
              </div>

              <div className="border-b border-neutral-100 px-5 py-3">
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    placeholder="Buscar produto..."
                    value={newOrderSearch}
                    onChange={(e) => setNewOrderSearch(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:ring-neutral-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {menuCategories.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-neutral-400">
                    Carregando cardápio...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredMenuProducts.map((product) => {
                      const inCart = newOrderCart.find((i) => i.productId === product.id);
                      return (
                        <div
                          key={product.id}
                          className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
                        >
                          <p className="flex-1 text-sm leading-tight font-semibold text-neutral-900">
                            {product.name}
                          </p>
                          <p className="text-primary-600 mt-1 text-sm font-bold">
                            {formatCurrency(product.price)}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {inCart ? (
                              <>
                                <button
                                  onClick={() => removeFromNewCart(product.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-700"
                                  aria-label={`Remover ${product.name}`}
                                >
                                  <Minus className="h-3 w-3" aria-hidden="true" />
                                </button>
                                <span className="min-w-[1.5rem] text-center text-sm font-bold">
                                  {inCart.quantity}
                                </span>
                                <button
                                  onClick={() => addToNewCart(product)}
                                  className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                                  aria-label={`Adicionar ${product.name}`}
                                >
                                  <Plus className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => addToNewCart(product)}
                                className="bg-primary-500 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-semibold text-white"
                                aria-label={`Adicionar ${product.name}`}
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                Adicionar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: cart + order details */}
            <div className="flex w-full flex-col border-l border-neutral-100 bg-neutral-50 md:w-96">
              <div className="flex items-center gap-2 border-b border-neutral-100 bg-white px-5 py-4">
                <ShoppingCart className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                <h3 className="font-semibold text-neutral-900">
                  Carrinho ({newOrderCartCount} {newOrderCartCount === 1 ? "item" : "itens"})
                </h3>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {newOrderCart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-400">
                    Adicione produtos ao pedido
                  </p>
                ) : (
                  newOrderCart.map((item) => {
                    const addonTotal = item.customAddons.reduce((s, a) => s + a.unitPrice, 0);
                    const input = addonInputs[item.productId] ?? { name: "", price: "" };
                    return (
                      <div
                        key={item.productId}
                        className="space-y-2 rounded-xl bg-white p-3 shadow-sm"
                      >
                        {/* Item row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-neutral-900">
                              {item.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatCurrency(item.price + addonTotal)} × {item.quantity}
                              {addonTotal > 0 && (
                                <span className="ml-1 text-amber-600">
                                  (+{formatCurrency(addonTotal)} extras)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => removeFromNewCart(item.productId)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200"
                              aria-label={`Remover ${item.name}`}
                            >
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                addToNewCart({
                                  id: item.productId,
                                  name: item.name,
                                  price: item.price,
                                  isActive: true,
                                })
                              }
                              className="bg-primary-500 flex h-6 w-6 items-center justify-center rounded-full text-white"
                              aria-label={`Adicionar ${item.name}`}
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {/* Custom addons list */}
                        {item.customAddons.length > 0 && (
                          <ul className="space-y-1 pl-1">
                            {item.customAddons.map((a, idx) => (
                              <li
                                key={idx}
                                className="flex items-center justify-between text-xs text-neutral-600"
                              >
                                <span>+ {a.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-amber-700">
                                    {formatCurrency(a.unitPrice)}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setNewOrderCart((prev) =>
                                        prev.map((i) =>
                                          i.productId === item.productId
                                            ? {
                                                ...i,
                                                customAddons: i.customAddons.filter(
                                                  (_, j) => j !== idx
                                                ),
                                              }
                                            : i
                                        )
                                      )
                                    }
                                    className="text-red-400 hover:text-red-600"
                                    aria-label="Remover adicional"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Add addon inline */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Ex: Bacon, Queijo..."
                            value={input.name}
                            onChange={(e) =>
                              setAddonInputs((prev) => ({
                                ...prev,
                                [item.productId]: { ...input, name: e.target.value },
                              }))
                            }
                            className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                          />
                          <input
                            type="number"
                            placeholder="R$"
                            value={input.price}
                            min="0"
                            step="0.50"
                            onChange={(e) =>
                              setAddonInputs((prev) => ({
                                ...prev,
                                [item.productId]: { ...input, price: e.target.value },
                              }))
                            }
                            className="w-16 rounded-lg border border-neutral-200 px-2 py-1 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const price = parseFloat(input.price) || 0;
                              if (!input.name.trim() || price < 0) return;
                              setNewOrderCart((prev) =>
                                prev.map((i) =>
                                  i.productId === item.productId
                                    ? {
                                        ...i,
                                        customAddons: [
                                          ...i.customAddons,
                                          { name: input.name.trim(), unitPrice: price },
                                        ],
                                      }
                                    : i
                                )
                              );
                              setAddonInputs((prev) => ({
                                ...prev,
                                [item.productId]: { name: "", price: "" },
                              }));
                            }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white disabled:opacity-40"
                            disabled={!input.name.trim()}
                            aria-label="Adicionar extra"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Order details */}
              <div className="space-y-4 border-t border-neutral-100 bg-white px-5 py-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-500">
                    Nome do cliente (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex.: João Silva"
                    value={newOrderCustomer}
                    onChange={(e) => setNewOrderCustomer(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-300 focus:outline-none"
                  />
                </div>

                {/* Order type */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-neutral-500">Tipo do pedido</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewOrderType("TAKEOUT")}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                        newOrderType === "TAKEOUT"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-neutral-200 text-neutral-600"
                      }`}
                    >
                      <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
                      Balcão
                    </button>
                    <button
                      onClick={() => setNewOrderType("DELIVERY")}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                        newOrderType === "DELIVERY"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-neutral-200 text-neutral-600"
                      }`}
                    >
                      <Truck className="h-4 w-4" aria-hidden="true" />
                      Entrega
                    </button>
                  </div>
                </div>

                {/* Delivery fields */}
                {newOrderType === "DELIVERY" && (
                  <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-700">Endereço de entrega</p>
                    <input
                      type="text"
                      placeholder="Rua *"
                      value={newOrderDeliveryStreet}
                      onChange={(e) => setNewOrderDeliveryStreet(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Número *"
                        value={newOrderDeliveryNumber}
                        onChange={(e) => setNewOrderDeliveryNumber(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Cidade *"
                        value={newOrderDeliveryCity}
                        onChange={(e) => setNewOrderDeliveryCity(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Bairro *"
                      value={newOrderDeliveryNeighborhood}
                      onChange={(e) => setNewOrderDeliveryNeighborhood(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                      <input
                        type="number"
                        placeholder="Taxa de entrega (R$)"
                        value={newOrderDeliveryFee}
                        onChange={(e) => setNewOrderDeliveryFee(e.target.value)}
                        min="0"
                        step="0.50"
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Payment method */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-neutral-500">Forma de pagamento</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["PIX", "PIX"],
                        ["CASH", "Dinheiro"],
                        ["CREDIT_CARD", "Crédito"],
                        ["DEBIT_CARD", "Débito"],
                        ["VOUCHER", "Voucher"],
                      ] as [PaymentMethod, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => {
                          setNewOrderPaymentMethod(value);
                          if (value !== "CASH") setNewOrderTrocoParaValue("");
                        }}
                        className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                          newOrderPaymentMethod === value
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Troco (only for CASH) */}
                {newOrderPaymentMethod === "CASH" && (
                  <div className="flex items-end gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-amber-800">
                        Troco para (R$)
                      </label>
                      <input
                        type="number"
                        min={newOrderGrandTotal}
                        step="0.50"
                        value={newOrderTrocoParaValue}
                        onChange={(e) => setNewOrderTrocoParaValue(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-amber-400 focus:outline-none"
                        placeholder={`Ex: ${Math.ceil(newOrderGrandTotal / 10) * 10 || 50},00`}
                      />
                    </div>
                    {newOrderTrocoParaNum > 0 && (
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-amber-700">Troco</p>
                        <p
                          className={`text-xl font-bold ${newOrderTrocoAmount > 0 ? "text-green-700" : "text-red-600"}`}
                        >
                          {newOrderTrocoAmount > 0
                            ? formatCurrency(newOrderTrocoAmount)
                            : "Insuficiente"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-neutral-500">
                    Observações (opcional)
                  </label>
                  <textarea
                    placeholder="Ex.: sem cebola, campainha não funciona..."
                    value={newOrderNotes}
                    onChange={(e) => setNewOrderNotes(e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-300 focus:outline-none"
                  />
                </div>

                {/* Total + submit */}
                <div className="space-y-2">
                  {newOrderDeliveryFeeNum > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Taxa de entrega</span>
                      <span>+{formatCurrency(newOrderDeliveryFeeNum)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-700">Total</span>
                    <span className="text-xl font-bold text-neutral-900">
                      {formatCurrency(newOrderGrandTotal)}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={submitNewOrder}
                    loading={isSubmittingNewOrder}
                    disabled={newOrderCart.length === 0}
                  >
                    {newOrderType === "DELIVERY"
                      ? "Criar pedido de entrega"
                      : "Criar pedido balcão"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrintConfirmationModal
        open={printConfirmation.isOpen}
        onOpenChange={printConfirmation.handleCancel}
        onConfirm={printConfirmation.handleConfirm}
        onRetry={printConfirmation.handleRetry}
      />
    </div>
  );
}
