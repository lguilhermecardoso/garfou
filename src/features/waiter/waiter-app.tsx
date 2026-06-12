/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  ChefHat,
  X,
  Users,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/masked-input";
import { ProductDetailSheet } from "@/features/menu/product-detail-sheet";
import {
  describeCartItem,
  getCartItemUnitPrice,
  type CartItem,
  type MenuProductData,
} from "@/features/menu/menu-customization-types";

interface Props {
  restaurantId: string;
  tableNumber?: string;
  bearerToken?: string; // Se fornecido, usa BFF
}

interface MenuCategory {
  id: string;
  name: string;
  products: MenuProductData[];
}

interface DiningTable {
  id: string;
  identifier: string;
  capacity: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
}

interface TabSummary {
  id: string;
  status: "OPEN" | "CLOSED" | "PAID" | "CANCELLED";
  total: number;
  finalTotal: number;
  table: DiningTable | null;
  customer: { id: string; name: string; phone?: string | null } | null;
  guestCustomerName: string | null;
  createdAt: string;
  notes?: string | null;
}

type DisplayProduct = MenuProductData & { categoryId: string; categoryName: string };

export default function WaiterApp({ restaurantId, tableNumber, bearerToken }: Props) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuProductData | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isOpenTabModal, setIsOpenTabModal] = useState(false);
  const [openTabMode, setOpenTabMode] = useState<"table" | "customer">("table");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isOpeningTab, setIsOpeningTab] = useState(false);

  // Delivery order state
  const [orderMode, setOrderMode] = useState<"DINE_IN" | "DELIVERY">("DINE_IN");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryComplement, setDeliveryComplement] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");

  const { data: categories = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ["menu", restaurantId, bearerToken ? "bff" : "auth"],
    queryFn: async () => {
      if (bearerToken) {
        // BFF mode
        const res = await fetch(`/api/bff/menu`, {
          headers: { Authorization: `Bearer ${bearerToken}` },
        });
        const json = await res.json();
        return (json.data ?? []) as MenuCategory[];
      } else {
        // Normal mode
        const res = await fetch(`/api/restaurants/${restaurantId}/menu?includeInactive=false`);
        const json = await res.json();
        return (json.data ?? []) as MenuCategory[];
      }
    },
    staleTime: 30_000,
  });

  const { data: tables = [] } = useQuery<DiningTable[]>({
    queryKey: ["tables", restaurantId, bearerToken ? "bff" : "auth"],
    queryFn: async () => {
      if (bearerToken) {
        // BFF mode
        const response = await fetch(`/api/bff/tables`, {
          headers: { Authorization: `Bearer ${bearerToken}` },
        });
        if (!response.ok) throw new Error("Falha ao carregar mesas");
        return response.json() as Promise<DiningTable[]>;
      } else {
        // Normal mode
        const response = await fetch(`/api/restaurants/${restaurantId}/tables?isActive=true`);
        if (!response.ok) throw new Error("Falha ao carregar mesas");
        return response.json() as Promise<DiningTable[]>;
      }
    },
    staleTime: 10_000,
  });

  const { data: tabs = [], refetch: refetchTabs } = useQuery<TabSummary[]>({
    queryKey: ["tabs", restaurantId, bearerToken ? "bff" : "auth"],
    queryFn: async () => {
      if (bearerToken) {
        // BFF mode
        const response = await fetch(`/api/bff/tabs?status=OPEN`, {
          headers: { Authorization: `Bearer ${bearerToken}` },
        });
        if (!response.ok) throw new Error("Falha ao carregar comandas");
        return response.json() as Promise<TabSummary[]>;
      } else {
        // Normal mode
        const response = await fetch(`/api/restaurants/${restaurantId}/tabs?status=OPEN`);
        if (!response.ok) throw new Error("Falha ao carregar comandas");
        return response.json() as Promise<TabSummary[]>;
      }
    },
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  // Update active tab when tabs list or table number changes
  const tabIds = tabs.map((t) => t.id).join(",");
  useEffect(() => {
    if (!tabs.length) {
      setActiveTabId(null);
      return;
    }

    if (tableNumber) {
      const tableTab = tabs.find((tab) => tab.table?.identifier === tableNumber);
      if (tableTab) {
        setActiveTabId((current) => current ?? tableTab.id);
        return;
      }
    }

    setActiveTabId((current) =>
      current && tabs.some((tab) => tab.id === current) ? current : tabs[0].id
    );
  }, [tabIds, tableNumber, tabs]);

  // Clear cart and delivery fields when active tab changes
  useEffect(() => {
    setCart([]);
    setIsCartOpen(false);
    setOrderMode("DINE_IN");
    setDeliveryStreet("");
    setDeliveryNumber("");
    setDeliveryComplement("");
    setDeliveryNeighborhood("");
    setDeliveryCity("");
    setDeliveryState("");
    setDeliveryFee("");
  }, [activeTabId]);

  function upsertCartItem(item: CartItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, item];
    });
  }

  function addSimpleProduct(product: MenuProductData) {
    upsertCartItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      selectedOptions: [],
      splits: [],
      splitPriceRule: product.splitPriceRule,
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  const cartTotal = cart.reduce((acc, item) => acc + getCartItemUnitPrice(item) * item.quantity, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const availableTables = tables.filter((table) => table.status === "AVAILABLE");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeTabLabel = activeTab?.table
    ? `Mesa ${activeTab.table.identifier}`
    : (activeTab?.customer?.name ?? activeTab?.guestCustomerName ?? "Sem comanda");

  const allProducts: DisplayProduct[] = useMemo(
    () =>
      categories.flatMap((cat) =>
        cat.products.map((product) => ({
          ...product,
          categoryId: cat.id,
          categoryName: cat.name,
        }))
      ),
    [categories]
  );

  const filteredProducts = search
    ? allProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : activeCategory
      ? allProducts.filter((p) => p.categoryId === activeCategory)
      : allProducts;

  async function openTab() {
    if (isOpeningTab) return;

    try {
      setIsOpeningTab(true);

      if (openTabMode === "customer") {
        if (!customerName.trim()) {
          toast.error("Informe o nome do cliente.");
          return;
        }
      }

      if (openTabMode === "table" && !selectedTableId) {
        toast.error("Selecione uma mesa disponível.");
        return;
      }

      const tabResponse = await fetch(
        bearerToken ? `/api/bff/tabs` : `/api/restaurants/${restaurantId}/tabs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
          },
          body: JSON.stringify({
            tableId: openTabMode === "table" ? selectedTableId : undefined,
            guestCustomerName: openTabMode === "customer" ? customerName.trim() : undefined,
          }),
        }
      );

      const tabJson = await tabResponse.json();
      if (!tabResponse.ok) {
        throw new Error(tabJson.error ?? "Erro ao abrir comanda");
      }

      await Promise.all([
        refetchTabs(),
        queryClient.invalidateQueries({
          queryKey: ["tables", restaurantId, bearerToken ? "bff" : "auth"],
        }),
      ]);

      setActiveTabId(tabJson.id);
      setIsOpenTabModal(false);
      setSelectedTableId("");
      setCustomerName("");
      setCustomerPhone("");
      toast.success("Comanda aberta com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir comanda.");
    } finally {
      setIsOpeningTab(false);
    }
  }

  async function submitOrder() {
    if (cart.length === 0 || !activeTab) return;

    try {
      const deliveryFeeNum = orderMode === "DELIVERY" ? parseFloat(deliveryFee) || 0 : undefined;

      const res = await fetch(
        bearerToken ? `/api/bff/orders` : `/api/restaurants/${restaurantId}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
          },
          body: JSON.stringify({
            type: orderMode,
            tabId: activeTab.id,
            tableNumber: orderMode === "DINE_IN" ? activeTab.table?.identifier : undefined,
            customerId: activeTab.customer?.id,
            ...(orderMode === "DELIVERY" && {
              deliveryFee: deliveryFeeNum,
              deliveryAddress: {
                street: deliveryStreet.trim() || undefined,
                number: deliveryNumber.trim() || undefined,
                complement: deliveryComplement.trim() || undefined,
                neighborhood: deliveryNeighborhood.trim() || undefined,
                city: deliveryCity.trim() || undefined,
                state: deliveryState.trim().toUpperCase() || undefined,
              },
            }),
            items: cart.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              notes: i.notes,
              selectedOptions: i.selectedOptions.map((option) => ({
                optionId: option.optionId,
                quantity: option.quantity,
                isRemoval: option.isRemoval,
              })),
              splits: i.splits.map((split) => ({
                splitIndex: split.splitIndex,
                flavorProductId: split.flavorProductId,
              })),
              addons: [],
            })),
          }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setCart([]);
        setIsCartOpen(false);

        // Invalida cache e força refetch para atualizar total da comanda
        const queryKeyMode = bearerToken ? "bff" : "auth";
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tabs", restaurantId, queryKeyMode] }),
          queryClient.invalidateQueries({ queryKey: ["pos-tabs", restaurantId] }),
        ]);

        toast.success("Pedido enviado com sucesso!", {
          description: `Pedido #${json.data?.orderNumber || ""} adicionado à comanda`,
          duration: 3000,
        });
      } else {
        toast.error(json.error ?? "Erro ao enviar pedido.");
      }
    } catch {
      toast.error("Erro ao enviar pedido. Tente novamente.");
    }
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">App do Garçom</p>
            <p className="text-lg font-bold text-neutral-900">{activeTabLabel}</p>
            {activeTab && (
              <p className="text-xs text-neutral-500">
                Total da comanda: {formatCurrency(activeTab.total)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpenTabModal(true)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
            >
              Abrir comanda
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-primary-500 relative rounded-xl p-3 text-white shadow-md transition-transform active:scale-95"
              aria-label={`Abrir carrinho — ${cartCount} itens`}
              disabled={!activeTab}
            >
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="bg-accent-500 absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-neutral-900">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const label = tab.table
              ? `Mesa ${tab.table.identifier}`
              : (tab.customer?.name ?? tab.guestCustomerName ?? "Cliente");

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left text-sm ${
                  isActive
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-neutral-200 bg-white text-neutral-700"
                }`}
              >
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-neutral-500">{formatCurrency(tab.total)}</p>
              </button>
            );
          })}
        </div>
        {/* Search */}
        <div className="relative mt-3">
          <Search
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
            aria-label="Buscar produto"
          />
        </div>
      </header>

      {/* Category Tabs */}
      {!search && (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto border-b border-neutral-100 bg-white px-4 py-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              !activeCategory ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      <main className="flex-1 overflow-y-auto px-4 py-3" id="main-content">
        {!activeTab ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
            <Store className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">
                Nenhuma comanda ativa selecionada
              </p>
              <p className="text-sm text-neutral-500">
                Abra uma comanda por mesa ou por cliente para lançar pedidos.
              </p>
            </div>
            <Button onClick={() => setIsOpenTabModal(true)}>Abrir comanda</Button>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="text-primary-400 h-8 w-8 animate-pulse" aria-hidden="true" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProducts.map((product) => {
              const totalForProduct = cart
                .filter((item) => item.productId === product.id)
                .reduce((acc, item) => acc + item.quantity, 0);
              const requiresConfiguration = product.allowCustomization || product.allowSplit;

              return (
                <Card
                  key={product.id}
                  className="overflow-hidden transition-transform active:scale-95"
                >
                  <CardContent className="p-0">
                    <div className="flex h-20 items-center justify-center bg-neutral-100">
                      <ChefHat className="h-8 w-8 text-neutral-300" aria-hidden="true" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm leading-tight font-semibold text-neutral-900">
                        {product.name}
                      </p>
                      <p className="text-primary-500 mt-1 text-sm font-bold">
                        {formatCurrency(product.price)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {requiresConfiguration ? (
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="bg-primary-500 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-semibold text-white"
                            aria-label={`Escolher ${product.name}`}
                          >
                            Escolher
                          </button>
                        ) : totalForProduct > 0 ? (
                          <>
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-700"
                              aria-label={`Remover ${product.name}`}
                            >
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-bold text-neutral-900">
                              {totalForProduct}
                            </span>
                            <button
                              onClick={() => addSimpleProduct(product)}
                              className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                              aria-label={`Adicionar mais ${product.name}`}
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addSimpleProduct(product)}
                            className="bg-primary-500 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-semibold text-white"
                            aria-label={`Adicionar ${product.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Carrinho"
        >
          <div className="flex max-h-[80vh] flex-col rounded-t-2xl bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Carrinho ({cartCount})</h2>
                {activeTab && <p className="text-xs text-neutral-500">{activeTabLabel}</p>}
              </div>
              <button onClick={() => setIsCartOpen(false)} aria-label="Fechar carrinho">
                <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
                    {describeCartItem(item) && (
                      <p className="mt-1 text-xs text-neutral-500">{describeCartItem(item)}</p>
                    )}
                    {item.selectedOptions.length > 0 && (
                      <div className="mt-1 space-y-1 text-xs text-neutral-500">
                        {item.selectedOptions.map((option) => (
                          <p key={`${item.id}-${option.optionId}`}>
                            {option.isRemoval ? "-" : "+"} {option.optionName}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-neutral-500">
                      {formatCurrency(getCartItemUnitPrice(item))} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200"
                      aria-label={`Remover ${item.name}`}
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => upsertCartItem({ ...item, quantity: 1 })}
                      className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                      aria-label={`Adicionar mais ${item.name}`}
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 border-t border-neutral-100 px-4 py-4">
              {/* Order mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderMode("DINE_IN")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    orderMode === "DINE_IN"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-600"
                  }`}
                >
                  <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
                  Local
                </button>
                <button
                  onClick={() => setOrderMode("DELIVERY")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    orderMode === "DELIVERY"
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-neutral-200 text-neutral-600"
                  }`}
                >
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  Entrega
                </button>
              </div>

              {/* Delivery address fields */}
              {orderMode === "DELIVERY" && (
                <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-700">Endereço de entrega</p>
                  <input
                    type="text"
                    placeholder="Rua *"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Número *"
                      value={deliveryNumber}
                      onChange={(e) => setDeliveryNumber(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Complemento"
                      value={deliveryComplement}
                      onChange={(e) => setDeliveryComplement(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Bairro *"
                    value={deliveryNeighborhood}
                    onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Cidade *"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      className="col-span-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="UF"
                      value={deliveryState}
                      onChange={(e) => setDeliveryState(e.target.value.toUpperCase())}
                      maxLength={2}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                    <input
                      type="number"
                      placeholder="Taxa de entrega (R$)"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      min="0"
                      step="0.50"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-700">Total</span>
                <span className="text-xl font-bold text-neutral-900">
                  {formatCurrency(
                    cartTotal + (orderMode === "DELIVERY" ? parseFloat(deliveryFee) || 0 : 0)
                  )}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={submitOrder}
                disabled={cart.length === 0 || !activeTab}
              >
                {orderMode === "DELIVERY"
                  ? "Enviar pedido de entrega"
                  : "Enviar pedido para cozinha"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isOpenTabModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Abrir comanda"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Abrir comanda</h2>
                <p className="text-sm text-neutral-500">
                  Escolha entre mesa disponível ou cliente avulso.
                </p>
              </div>
              <button onClick={() => setIsOpenTabModal(false)} aria-label="Fechar modal">
                <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setOpenTabMode("table")}
                className={`rounded-xl border px-3 py-3 text-left ${openTabMode === "table" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200"}`}
              >
                <Store className="mb-2 h-4 w-4" aria-hidden="true" />
                <p className="font-semibold">Mesa</p>
                <p className="text-xs text-neutral-500">Abrir para consumo em mesa</p>
              </button>
              <button
                onClick={() => setOpenTabMode("customer")}
                className={`rounded-xl border px-3 py-3 text-left ${openTabMode === "customer" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200"}`}
              >
                <Users className="mb-2 h-4 w-4" aria-hidden="true" />
                <p className="font-semibold">Cliente</p>
                <p className="text-xs text-neutral-500">Cliente avulso / balcão</p>
              </button>
            </div>

            {openTabMode === "table" ? (
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-neutral-700">Mesa disponível</label>
                <select
                  value={selectedTableId}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Selecione uma mesa</option>
                  {availableTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Mesa {table.identifier}
                      {table.capacity ? ` • ${table.capacity} lugares` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700">Nome do cliente</label>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Ex.: João Silva"
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Telefone</label>
                  <PhoneInput
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsOpenTabModal(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={openTab} disabled={isOpeningTab}>
                {isOpeningTab ? "Abrindo..." : "Abrir comanda"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProductDetailSheet
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAdd={upsertCartItem}
      />
    </div>
  );
}
