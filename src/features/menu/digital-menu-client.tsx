/**
 * DigitalMenuClient
 *
 * Renders the public digital menu flow, including product listing, cart,
 * product customization, and split-product ordering before checkout.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  UtensilsCrossed,
  X,
  QrCode,
  Banknote,
  CreditCard,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductDetailSheet } from "@/features/menu/product-detail-sheet";
import { OrderTrackingFAB } from "@/features/orders/order-tracking-fab";
import {
  describeCartItem,
  getCartItemUnitPrice,
  type CartItem,
  type MenuProductData,
} from "@/features/menu/menu-customization-types";
import { formatCurrency } from "@/lib/utils";
import { PhoneInput, EmailInput, CEPInput } from "@/components/ui/masked-input";

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string | null;
  restaurantPhone: string | null;
  isOpen: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  products: MenuProductData[];
}

type DisplayProduct = MenuProductData & { categoryId: string };
type PaymentMethod = "PIX" | "CASH" | "CREDIT_CARD" | "DEBIT_CARD";

export function DigitalMenuClient({
  restaurantId,
  restaurantName,
  restaurantLogo,
  restaurantPhone,
  isOpen,
}: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuProductData | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [orderType, setOrderType] = useState<"DINE_IN" | "DELIVERY" | "TAKEOUT">("DINE_IN");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // Delivery address fields
  const [deliveryCEP, setDeliveryCEP] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryComplement, setDeliveryComplement] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const { data: categories = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ["public-menu", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu`);
      const json = await res.json();
      return (json.data ?? []) as MenuCategory[];
    },
    staleTime: 60_000,
  });

  // Fetch address from CEP via ViaCEP API
  async function fetchAddressByCEP(cep: string) {
    if (cep.length !== 8) return;

    setIsFetchingAddress(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setDeliveryStreet(data.logradouro || "");
      setDeliveryNeighborhood(data.bairro || "");
      setDeliveryCity(data.localidade || "");
      setDeliveryState(data.uf || "");

      // Calculate delivery fee based on neighborhood
      await calculateDeliveryFee(data.bairro || "", data.localidade || "");
    } catch {
      toast.error("Erro ao buscar endereço. Preencha manualmente.");
    } finally {
      setIsFetchingAddress(false);
    }
  }

  // Calculate delivery fee based on zone or flat rate
  async function calculateDeliveryFee(neighborhood: string, city: string) {
    try {
      const response = await fetch(
        `/api/restaurants/${restaurantId}/delivery-zones?neighborhood=${encodeURIComponent(neighborhood)}&city=${encodeURIComponent(city)}`
      );
      const data = await response.json();

      if (data.fee !== undefined) {
        setDeliveryFee(data.fee);
      } else {
        setDeliveryFee(0);
        toast.warning("Não entregamos nesta região no momento");
      }
    } catch (error) {
      console.error("Error calculating delivery fee:", error);
      setDeliveryFee(0);
    }
  }

  const allProducts: DisplayProduct[] = useMemo(
    () =>
      categories.flatMap((category) =>
        category.products.map((product) => ({ ...product, categoryId: category.id }))
      ),
    [categories]
  );

  const displayed = search
    ? allProducts.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()))
    : activeCategory
      ? allProducts.filter((product) => product.categoryId === activeCategory)
      : null;

  function upsertCartItem(item: CartItem) {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (!existing) {
        return [...current, item];
      }

      return current.map((entry) =>
        entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
      );
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

  function decrementCartItem(itemId: string) {
    setCart((current) =>
      current
        .map((item) => (item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  const cartTotal = cart.reduce((acc, item) => acc + getCartItemUnitPrice(item) * item.quantity, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const finalTotal = cartTotal + (orderType === "DELIVERY" ? deliveryFee : 0);

  async function placeOrder() {
    if (cart.length === 0) return;

    // Validate customer info
    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome");
      return;
    }

    if (!customerPhone.trim()) {
      toast.error("Por favor, informe seu WhatsApp");
      return;
    }

    // Validate delivery address
    if (orderType === "DELIVERY") {
      if (
        !deliveryStreet.trim() ||
        !deliveryNumber.trim() ||
        !deliveryNeighborhood.trim() ||
        !deliveryCity.trim()
      ) {
        toast.error("Por favor, preencha o endereço completo");
        return;
      }

      if (deliveryFee === 0) {
        toast.error("Não entregamos nesta região");
        return;
      }
    }

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType,
          paymentMethod,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          deliveryFee: orderType === "DELIVERY" ? deliveryFee : undefined,
          deliveryAddress:
            orderType === "DELIVERY"
              ? {
                  street: deliveryStreet.trim(),
                  number: deliveryNumber.trim(),
                  complement: deliveryComplement.trim() || undefined,
                  neighborhood: deliveryNeighborhood.trim(),
                  city: deliveryCity.trim(),
                  state: deliveryState.trim(),
                  zipCode: deliveryCEP.trim(),
                }
              : undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
            selectedOptions: item.selectedOptions.map((option) => ({
              optionId: option.optionId,
              quantity: option.quantity,
              isRemoval: option.isRemoval,
            })),
            splits: item.splits.map((split) => ({
              splitIndex: split.splitIndex,
              flavorProductId: split.flavorProductId,
            })),
            addons: [],
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlacedOrderId(data.data?.id ?? null);
        setOrderPlaced(true);
        setCart([]);
        setIsCartOpen(false);
        toast.success("Pedido realizado com sucesso!", {
          description: "Aguarde, estamos preparando tudo com carinho",
        });
      } else {
        toast.error(data.error ?? "Erro ao realizar pedido.");
      }
    } catch {
      toast.error("Erro ao realizar pedido. Tente novamente.");
    }
  }

  if (orderPlaced) {
    const waLink = restaurantPhone
      ? `https://wa.me/55${restaurantPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Acabei de fazer um pedido no cardápio digital${placedOrderId ? ` (#${placedOrderId})` : ""}.`)}`
      : null;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4 text-center">
        <div className="rounded-full bg-emerald-100 p-6">
          <UtensilsCrossed className="h-12 w-12 text-emerald-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pedido realizado!</h1>
          <p className="mt-2 text-neutral-500">
            Seu pedido foi enviado. Aguarde, estamos preparando tudo com carinho.
          </p>
        </div>

        {paymentMethod === "PIX" && (
          <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
            <div className="mb-2 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span className="font-semibold text-emerald-800">Pagamento via PIX</span>
            </div>
            <p className="text-sm text-emerald-700">
              Efetue o pagamento pelo PIX e envie o comprovante para o restaurante.
            </p>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600"
              >
                Enviar comprovante pelo WhatsApp
              </a>
            )}
          </div>
        )}

        <Button
          onClick={() => {
            setOrderPlaced(false);
            setPlacedOrderId(null);
          }}
        >
          Fazer novo pedido
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-neutral-50">
        <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white px-4 py-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {restaurantLogo ? (
                  <img src={restaurantLogo} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="bg-primary-100 flex h-10 w-10 items-center justify-center rounded-xl">
                    <UtensilsCrossed className="text-primary-500 h-5 w-5" aria-hidden="true" />
                  </div>
                )}
                <div>
                  <h1 className="font-bold text-neutral-900">{restaurantName}</h1>
                  <span
                    className={`text-xs font-medium ${isOpen ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {isOpen ? "● Aberto agora" : "● Fechado"}
                  </span>
                </div>
              </div>
              {isOpen && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="bg-primary-500 relative rounded-xl p-2.5 text-white"
                  aria-label={`Carrinho — ${cartCount} itens`}
                >
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  {cartCount > 0 && (
                    <span className="bg-accent-500 absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-neutral-900">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Buscar no cardápio..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
                aria-label="Buscar produto"
              />
            </div>
          </div>
        </header>

        {!search && (
          <div className="overflow-x-auto border-b border-neutral-100 bg-white">
            <div className="mx-auto flex max-w-2xl gap-2 px-4 py-2.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${!activeCategory ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600"}`}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${activeCategory === category.id ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600"}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="mx-auto max-w-2xl px-4 py-4" id="main-content">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4"
                aria-label="Carregando..."
              />
            </div>
          ) : displayed ? (
            <div className="space-y-3">
              {displayed.map((product) => {
                const totalForProduct = cart
                  .filter((item) => item.productId === product.id)
                  .reduce((acc, item) => acc + item.quantity, 0);
                const requiresConfiguration = product.allowCustomization || product.allowSplit;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                      <UtensilsCrossed className="h-6 w-6 text-neutral-300" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900">{product.name}</p>
                      {product.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-primary-500 font-bold">
                          {formatCurrency(product.price)}
                        </p>
                        {requiresConfiguration && (
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                            Personalizável
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {requiresConfiguration ? (
                          <Button size="sm" onClick={() => setSelectedProduct(product)}>
                            Escolher
                          </Button>
                        ) : totalForProduct > 0 ? (
                          <>
                            <button
                              onClick={() => decrementCartItem(product.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200"
                              aria-label={`Remover ${product.name}`}
                            >
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <span className="min-w-[1.25rem] text-center text-sm font-bold">
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
                            className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                            aria-label={`Adicionar ${product.name}`}
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map((category) => (
                <div key={category.id}>
                  <h2 className="mb-3 text-lg font-bold text-neutral-900">{category.name}</h2>
                  <div className="space-y-3">
                    {category.products.map((product) => {
                      const totalForProduct = cart
                        .filter((item) => item.productId === product.id)
                        .reduce((acc, item) => acc + item.quantity, 0);
                      const requiresConfiguration =
                        product.allowCustomization || product.allowSplit;

                      return (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
                        >
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                            <UtensilsCrossed
                              className="h-6 w-6 text-neutral-300"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-neutral-900">{product.name}</p>
                            {product.description && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                                {product.description}
                              </p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className="text-primary-500 font-bold">
                                {formatCurrency(product.price)}
                              </p>
                              {requiresConfiguration && (
                                <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                                  Personalizável
                                </span>
                              )}
                            </div>
                          </div>
                          {isOpen && (
                            <div className="flex shrink-0 items-center gap-1.5">
                              {requiresConfiguration ? (
                                <Button size="sm" onClick={() => setSelectedProduct(product)}>
                                  Escolher
                                </Button>
                              ) : totalForProduct > 0 ? (
                                <>
                                  <button
                                    onClick={() => decrementCartItem(product.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200"
                                    aria-label={`Remover ${product.name}`}
                                  >
                                    <Minus className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                  <span className="min-w-[1.25rem] text-center text-sm font-bold">
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
                                  className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                                  aria-label={`Adicionar ${product.name}`}
                                >
                                  <Plus className="h-3 w-3" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {isCartOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-label="Meu pedido"
          >
            <div className="flex max-h-[85vh] flex-col rounded-t-2xl bg-white">
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <h2 className="text-lg font-bold text-neutral-900">Meu pedido</h2>
                <button onClick={() => setIsCartOpen(false)} aria-label="Fechar">
                  <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3"
                  >
                    <div className="min-w-0 flex-1">
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
                      {item.notes && (
                        <p className="mt-1 text-xs text-neutral-500">Obs: {item.notes}</p>
                      )}
                      <p className="mt-1 text-sm text-neutral-500">
                        {formatCurrency(getCartItemUnitPrice(item))} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decrementCartItem(item.id)}
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

                <div className="space-y-2 border-t border-neutral-100 pt-2">
                  <input
                    type="text"
                    placeholder="Seu nome *"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    aria-label="Seu nome"
                    required
                  />
                  <PhoneInput
                    placeholder="WhatsApp *"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    required
                    aria-label="WhatsApp"
                  />
                  <EmailInput
                    placeholder="Email (opcional)"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    aria-label="Email"
                  />
                </div>

                <div className="border-t border-neutral-100 pt-2">
                  <p className="mb-2 text-xs font-semibold text-neutral-500">Como vai ser?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: "DINE_IN", label: "Comer aqui" },
                        { value: "TAKEOUT", label: "Retirar" },
                        { value: "DELIVERY", label: "Entrega" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setOrderType(option.value)}
                        className={`rounded-lg border py-2 text-xs font-medium transition-colors ${orderType === option.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 text-neutral-600"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {orderType === "DELIVERY" && (
                  <div className="space-y-2 border-t border-neutral-100 pt-2">
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                      <p className="text-xs font-semibold text-neutral-500">Endereço de entrega</p>
                    </div>

                    <CEPInput
                      placeholder="CEP *"
                      value={deliveryCEP}
                      onChange={(event) => setDeliveryCEP(event.target.value)}
                      onCEPComplete={fetchAddressByCEP}
                      required
                      disabled={isFetchingAddress}
                      aria-label="CEP"
                    />

                    <input
                      type="text"
                      placeholder="Rua *"
                      value={deliveryStreet}
                      onChange={(event) => setDeliveryStreet(event.target.value)}
                      className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                      required
                      disabled={isFetchingAddress}
                      aria-label="Rua"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Número *"
                        value={deliveryNumber}
                        onChange={(event) => setDeliveryNumber(event.target.value)}
                        className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                        required
                        aria-label="Número"
                      />
                      <input
                        type="text"
                        placeholder="Complemento"
                        value={deliveryComplement}
                        onChange={(event) => setDeliveryComplement(event.target.value)}
                        className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                        aria-label="Complemento"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Bairro *"
                      value={deliveryNeighborhood}
                      onChange={(event) => setDeliveryNeighborhood(event.target.value)}
                      className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                      required
                      disabled={isFetchingAddress}
                      aria-label="Bairro"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Cidade *"
                        value={deliveryCity}
                        onChange={(event) => setDeliveryCity(event.target.value)}
                        className="focus:ring-primary-400 col-span-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                        required
                        disabled={isFetchingAddress}
                        aria-label="Cidade"
                      />
                      <input
                        type="text"
                        placeholder="UF *"
                        value={deliveryState}
                        onChange={(event) => setDeliveryState(event.target.value.toUpperCase())}
                        maxLength={2}
                        className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm uppercase focus:ring-2 focus:outline-none"
                        required
                        disabled={isFetchingAddress}
                        aria-label="Estado"
                      />
                    </div>

                    {deliveryFee > 0 && (
                      <div className="rounded-lg bg-emerald-50 px-3 py-2">
                        <p className="text-xs text-emerald-700">
                          Taxa de entrega:{" "}
                          <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-neutral-100 pt-2">
                  <p className="mb-2 text-xs font-semibold text-neutral-500">Forma de pagamento</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: "PIX", label: "PIX", Icon: QrCode },
                        { value: "CASH", label: "Dinheiro", Icon: Banknote },
                        { value: "CREDIT_CARD", label: "Cartão crédito", Icon: CreditCard },
                        { value: "DEBIT_CARD", label: "Cartão débito", Icon: CreditCard },
                      ] as const
                    ).map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${paymentMethod === value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 text-neutral-600"}`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-neutral-100 px-4 py-4">
                <div className="mb-2 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-medium text-neutral-900">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  {orderType === "DELIVERY" && deliveryFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">Taxa de entrega</span>
                      <span className="font-medium text-neutral-900">
                        {formatCurrency(deliveryFee)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mb-4 flex items-center justify-between border-t border-neutral-100 pt-2">
                  <span className="font-semibold text-neutral-700">Total</span>
                  <span className="text-xl font-bold text-neutral-900">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={placeOrder}
                  disabled={cart.length === 0}
                >
                  Confirmar pedido
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ProductDetailSheet
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAdd={upsertCartItem}
      />

      <OrderTrackingFAB restaurantId={restaurantId} />
    </>
  );
}
