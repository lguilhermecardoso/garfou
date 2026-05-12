/**
 * TrackOrdersClient
 *
 * Cliente pode acompanhar seus pedidos usando o número de telefone.
 * Mostra histórico de pedidos e status atual.
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import { Package, Phone, Clock, MapPin, CreditCard, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  restaurantSlug: string;
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

export function TrackOrdersClient({ restaurantSlug }: Props) {
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", restaurantSlug],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/slug/${restaurantSlug}`);
      if (!response.ok) throw new Error("Restaurante não encontrado");
      return response.json();
    },
  });

  const { data, isLoading } = useQuery<CustomerData>({
    queryKey: ["track-orders", restaurant?.id, searchedPhone],
    queryFn: async () => {
      if (!restaurant?.id || !searchedPhone) return { customer: null, orders: [] };
      const response = await fetch(
        `/api/restaurants/${restaurant.id}/orders/by-phone?phone=${encodeURIComponent(searchedPhone)}`
      );
      if (!response.ok) throw new Error("Erro ao buscar pedidos");
      const json = await response.json();
      return json.data;
    },
    enabled: Boolean(restaurant?.id && searchedPhone),
    refetchInterval: 15_000, // Atualiza a cada 15 segundos
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

  const statusSteps = [
    { key: "NOVO_PEDIDO", label: "Novo" },
    { key: "AGUARDANDO_CONFIRMACAO", label: "Aguardando" },
    { key: "CONFIRMADO", label: "Confirmado" },
    { key: "EM_PREPARO", label: "Preparando" },
    { key: "PRONTO", label: "Pronto" },
    { key: "SAIU_PARA_ENTREGA", label: "Saiu" },
    { key: "FINALIZADO", label: "Entregue" },
  ];

  function getStatusProgress(status: string): number {
    const index = statusSteps.findIndex((s) => s.key === status);
    if (status === "CANCELADO") return 0;
    if (status === "FINALIZADO") return 100;
    if (index === -1) return 0;
    return ((index + 1) / statusSteps.length) * 100;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-neutral-900">Acompanhe seu pedido</h1>
          <p className="mt-2 text-neutral-600">{restaurant?.name || "Carregando..."}</p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  <Phone className="mr-2 inline-block h-4 w-4" />
                  Número de telefone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="focus:border-primary-500 focus:ring-primary-100 w-full rounded-xl border border-neutral-300 px-4 py-3 focus:ring-2 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full sm:w-auto" loading={isLoading}>
                  Buscar pedidos
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searchedPhone && (
          <>
            {isLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="border-primary-500 mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                  <p className="mt-4 text-neutral-600">Buscando seus pedidos...</p>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-neutral-400" />
                  <p className="mt-4 text-lg font-semibold text-neutral-900">
                    Erro ao buscar pedidos
                  </p>
                  <p className="mt-2 text-neutral-600">Tente novamente em alguns instantes.</p>
                </CardContent>
              </Card>
            ) : data?.orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-neutral-400" />
                  <p className="mt-4 text-lg font-semibold text-neutral-900">
                    Nenhum pedido encontrado
                  </p>
                  <p className="mt-2 text-neutral-600">
                    Não encontramos pedidos para este número de telefone.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Customer Info */}
                {data?.customer && (
                  <Card className="mb-6">
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold text-neutral-900">
                        Olá, {data.customer.name}!
                      </h2>
                      <p className="text-sm text-neutral-600">
                        Encontramos {data.orders.length}{" "}
                        {data.orders.length === 1 ? "pedido" : "pedidos"} para você.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Orders List */}
                <div className="space-y-4">
                  {data?.orders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    const progress = getStatusProgress(order.status);
                    const isCancelled = order.status === "CANCELADO";

                    return (
                      <Card key={order.id} className={isCancelled ? "opacity-60" : ""}>
                        <CardContent className="p-6">
                          {/* Order Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-neutral-900">
                                  Pedido #{order.orderNumber}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={`${getOrderStatusColor(order.status)} font-medium`}
                                >
                                  {getOrderStatusLabel(order.status)}
                                </Badge>
                              </div>
                              <p className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
                                <Clock className="h-4 w-4" />
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-primary-600 text-2xl font-bold">
                                {formatCurrency(order.total)}
                              </p>
                              {order.paymentMethod && (
                                <p className="mt-1 flex items-center justify-end gap-1 text-xs text-neutral-500">
                                  <CreditCard className="h-3 w-3" />
                                  {order.paymentMethod}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {!isCancelled && (
                            <div className="mt-6">
                              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                                <div
                                  className="from-primary-500 to-primary-600 h-full rounded-full bg-gradient-to-r transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="mt-2 flex justify-between text-xs text-neutral-500">
                                <span>Novo</span>
                                <span>Em preparo</span>
                                <span>Entregue</span>
                              </div>
                            </div>
                          )}

                          {/* Delivery Address */}
                          {order.deliveryAddress && (
                            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                              <p className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                                <MapPin className="h-4 w-4" />
                                Endereço de entrega
                              </p>
                              <p className="mt-1 text-sm text-neutral-600">
                                {order.deliveryAddress.street}, {order.deliveryAddress.number} -{" "}
                                {order.deliveryAddress.district}
                              </p>
                            </div>
                          )}

                          {/* Toggle Items */}
                          <button
                            onClick={() => toggleOrder(order.id)}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                          >
                            {isExpanded ? (
                              <>
                                Ocultar itens
                                <ChevronUp className="h-4 w-4" />
                              </>
                            ) : (
                              <>
                                Ver itens ({order.items.length})
                                <ChevronDown className="h-4 w-4" />
                              </>
                            )}
                          </button>

                          {/* Items List */}
                          {isExpanded && (
                            <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between gap-4 rounded-lg bg-neutral-50 p-3"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-neutral-900">
                                      {item.quantity}x {item.product.name}
                                    </p>
                                    {item.notes && (
                                      <p className="mt-1 text-xs text-neutral-600">
                                        Obs: {item.notes}
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-semibold text-neutral-900">
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
