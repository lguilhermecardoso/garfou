/**
 * OrderTrackingFAB
 *
 * Floating Action Button que permite ao cliente acompanhar seus pedidos
 * diretamente do cardápio digital através do número de telefone.
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import {
  Package,
  X,
  Phone,
  Clock,
  MapPin,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

interface Props {
  restaurantId: string;
}

interface OrderItem {
  quantity: number;
  product: { name: string; image?: string | null };
  unitPrice: number;
  notes?: string | null;
}

interface Order {
  id: string;
  orderNumber: number;
  type: string;
  status: string;
  total: number;
  paymentMethod?: string | null;
  paymentStatus: string;
  createdAt: string;
  notes?: string | null;
  deliveryAddress?: Record<string, unknown>;
  items: OrderItem[];
}

interface CustomerData {
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  orders: Order[];
}

export function OrderTrackingFAB({ restaurantId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<CustomerData>({
    queryKey: ["track-orders-fab", restaurantId, searchedPhone],
    queryFn: async () => {
      if (!restaurantId || !searchedPhone) return { customer: null, orders: [] };
      const response = await fetch(
        `/api/restaurants/${restaurantId}/orders/by-phone?phone=${encodeURIComponent(searchedPhone)}`
      );
      if (!response.ok) throw new Error("Erro ao buscar pedidos");
      const json = await response.json();
      return json.data;
    },
    enabled: Boolean(restaurantId && searchedPhone),
    refetchInterval: 10_000, // Atualiza a cada 10 segundos
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (phone.trim()) {
      setSearchedPhone(phone.trim());
    }
  }

  function toggleOrder(orderId: string) {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }

  function getStatusProgress(status: string): number {
    const statusSteps = [
      "NOVO_PEDIDO",
      "AGUARDANDO_CONFIRMACAO",
      "CONFIRMADO",
      "EM_PREPARO",
      "PRONTO",
      "SAIU_PARA_ENTREGA",
      "FINALIZADO",
    ];
    const index = statusSteps.indexOf(status);
    if (status === "CANCELADO") return 0;
    if (status === "FINALIZADO") return 100;
    if (index === -1) return 0;
    return ((index + 1) / statusSteps.length) * 100;
  }

  function formatPhoneDisplay(phone: string) {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="from-primary-500 to-primary-600 fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95"
        aria-label="Acompanhar pedidos"
      >
        <Package className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="bg-accent-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span className="bg-accent-500 relative inline-flex h-3 w-3 rounded-full"></span>
        </span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-[101] max-h-[90vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:max-h-[600px] sm:w-[420px] sm:rounded-3xl"
          >
            {/* Header */}
            <div className="from-primary-50 to-primary-100/50 sticky top-0 z-10 border-b border-neutral-200 bg-gradient-to-br px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Meus Pedidos</h2>
                  <p className="text-sm text-neutral-600">Acompanhe seus pedidos em tempo real</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto sm:max-h-[calc(600px-80px)]">
              {/* Search Form */}
              {!searchedPhone && (
                <div className="p-6">
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        <Phone className="mr-2 inline-block h-4 w-4" />
                        Digite seu telefone
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="focus:border-primary-500 focus:ring-primary-100 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base focus:ring-2 focus:outline-none"
                        autoFocus
                      />
                      <p className="mt-2 text-xs text-neutral-500">
                        Usamos seu telefone para identificar seus pedidos
                      </p>
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                      <Search className="mr-2 h-4 w-4" />
                      Buscar meus pedidos
                    </Button>
                  </form>

                  {/* Ilustração decorativa */}
                  <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
                    <div className="bg-primary-100 rounded-full p-6">
                      <Package className="text-primary-500 h-12 w-12" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-neutral-600">
                      Acompanhe o status dos seus pedidos
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Digite seu telefone e veja o histórico completo
                    </p>
                  </div>
                </div>
              )}

              {/* Results */}
              {searchedPhone && (
                <div className="p-6">
                  {/* Change Phone */}
                  <button
                    onClick={() => {
                      setSearchedPhone("");
                      setPhone("");
                      setExpandedOrders(new Set());
                    }}
                    className="mb-4 flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm transition-colors hover:bg-neutral-100"
                  >
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-neutral-600" />
                      <span className="font-medium text-neutral-700">
                        {formatPhoneDisplay(searchedPhone)}
                      </span>
                    </span>
                    <span className="text-primary-600 text-xs">Alterar</span>
                  </button>

                  {isLoading ? (
                    <div className="py-12 text-center">
                      <div className="border-primary-500 mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                      <p className="mt-4 text-sm text-neutral-600">Buscando seus pedidos...</p>
                    </div>
                  ) : data?.orders.length === 0 ? (
                    <div className="py-12 text-center">
                      <Package className="mx-auto h-12 w-12 text-neutral-400" />
                      <p className="mt-4 text-base font-semibold text-neutral-900">
                        Nenhum pedido encontrado
                      </p>
                      <p className="mt-2 text-sm text-neutral-600">
                        Faça seu primeiro pedido no cardápio!
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Customer Greeting */}
                      {data?.customer && (
                        <div className="from-primary-50 to-primary-100/50 mb-4 rounded-xl bg-gradient-to-br p-4">
                          <p className="font-semibold text-neutral-900">
                            Olá, {data.customer.name}!
                          </p>
                          <p className="text-sm text-neutral-600">
                            {data.orders.length} {data.orders.length === 1 ? "pedido" : "pedidos"}
                          </p>
                        </div>
                      )}

                      {/* Orders List */}
                      <div className="space-y-3">
                        {data?.orders.map((order) => {
                          const isExpanded = expandedOrders.has(order.id);
                          const progress = getStatusProgress(order.status);
                          const isCancelled = order.status === "CANCELADO";

                          return (
                            <div
                              key={order.id}
                              className={`overflow-hidden rounded-xl border ${isCancelled ? "border-neutral-200 bg-neutral-50 opacity-60" : "border-neutral-200 bg-white"}`}
                            >
                              {/* Order Header */}
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-neutral-900">
                                        #{order.orderNumber}
                                      </h3>
                                      <Badge
                                        variant="outline"
                                        className={`${getOrderStatusColor(order.status)} text-xs`}
                                      >
                                        {getOrderStatusLabel(order.status)}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
                                      <Clock className="h-3.5 w-3.5" />
                                      {formatDate(order.createdAt)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-primary-600 text-lg font-bold">
                                      {formatCurrency(order.total)}
                                    </p>
                                    {order.paymentMethod && (
                                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                                        <CreditCard className="h-3 w-3" />
                                        {order.paymentMethod}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                {!isCancelled && (
                                  <div className="mt-3">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                                      <div
                                        className="from-primary-500 to-primary-600 h-full rounded-full bg-gradient-to-r transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Delivery Address */}
                                {order.deliveryAddress && (
                                  <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
                                    <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                                      <MapPin className="h-3.5 w-3.5" />
                                      Endereço de entrega
                                    </p>
                                    <p className="mt-0.5 text-xs text-neutral-600">
                                      {order.deliveryAddress.street}, {order.deliveryAddress.number}
                                    </p>
                                  </div>
                                )}

                                {/* Toggle Items */}
                                <button
                                  onClick={() => toggleOrder(order.id)}
                                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                                >
                                  {isExpanded ? (
                                    <>
                                      Ocultar itens
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      Ver itens ({order.items.length})
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Items List */}
                              {isExpanded && (
                                <div className="border-t border-neutral-200 bg-neutral-50 p-4">
                                  <div className="space-y-2">
                                    {order.items.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-start justify-between gap-3 rounded-lg bg-white p-3"
                                      >
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-neutral-900">
                                            {item.quantity}x {item.product.name}
                                          </p>
                                          {item.notes && (
                                            <p className="mt-1 text-xs text-neutral-600">
                                              Obs: {item.notes}
                                            </p>
                                          )}
                                        </div>
                                        <p className="text-sm font-semibold text-neutral-900">
                                          {formatCurrency(item.unitPrice * item.quantity)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
