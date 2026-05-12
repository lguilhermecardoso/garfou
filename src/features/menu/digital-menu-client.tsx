"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
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
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string | null;
  restaurantPhone: string | null;
  isOpen: boolean;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

type DisplayProduct = MenuProduct & { categoryId: string };

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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CASH" | "CARD" | "ON_DELIVERY">(
    "PIX"
  );
  const [orderType, setOrderType] = useState<"DINE_IN" | "DELIVERY" | "TAKEOUT">("DINE_IN");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ["public-menu", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu`);
      const json = await res.json();
      return (json.data ?? []) as MenuCategory[];
    },
    staleTime: 60_000,
  });

  function addToCart(product: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, quantity: 1 },
      ];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const allProducts: DisplayProduct[] = categories.flatMap((cat) =>
    cat.products.map((product) => ({ ...product, categoryId: cat.id }))
  );

  const displayed = search
    ? allProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : activeCategory
      ? allProducts.filter((p) => p.categoryId === activeCategory)
      : null;

  async function placeOrder() {
    if (cart.length === 0) return;
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType,
          paymentMethod,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes,
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
      }
    } catch {
      alert("Erro ao realizar pedido. Tente novamente.");
    }
  }

  if (orderPlaced) {
    const waLink = restaurantPhone
      ? `https://wa.me/55${restaurantPhone.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Acabei de fazer um pedido no cardápio digital.")}`
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
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
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
              onChange={(e) => setSearch(e.target.value)}
              className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
              aria-label="Buscar produto"
            />
          </div>
        </div>
      </header>

      {/* Categories */}
      {!search && (
        <div className="overflow-x-auto border-b border-neutral-100 bg-white">
          <div className="mx-auto flex max-w-2xl gap-2 px-4 py-2.5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${!activeCategory ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600"}`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${activeCategory === cat.id ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
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
              const inCart = cart.find((i) => i.productId === product.id);
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
                    <p className="text-primary-500 mt-1 font-bold">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  {isOpen && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {inCart ? (
                        <>
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200"
                            aria-label={`Remover ${product.name}`}
                          >
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <span className="min-w-[1.25rem] text-center text-sm font-bold">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() =>
                              addToCart({
                                id: product.id,
                                name: product.name,
                                price: product.price,
                              })
                            }
                            className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                            aria-label={`Adicionar mais ${product.name}`}
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            addToCart({ id: product.id, name: product.name, price: product.price })
                          }
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
            {categories.map((cat) => (
              <div key={cat.id}>
                <h2 className="mb-3 text-lg font-bold text-neutral-900">{cat.name}</h2>
                <div className="space-y-3">
                  {cat.products.map((product) => {
                    const inCart = cart.find((i) => i.productId === product.id);
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
                          <p className="text-primary-500 mt-1 font-bold">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        {isOpen && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {inCart ? (
                              <>
                                <button
                                  onClick={() => removeFromCart(product.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200"
                                  aria-label={`Remover ${product.name}`}
                                >
                                  <Minus className="h-3 w-3" aria-hidden="true" />
                                </button>
                                <span className="min-w-[1.25rem] text-center text-sm font-bold">
                                  {inCart.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    addToCart({
                                      id: product.id,
                                      name: product.name,
                                      price: product.price,
                                    })
                                  }
                                  className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                                  aria-label={`Adicionar mais ${product.name}`}
                                >
                                  <Plus className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  addToCart({
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                  })
                                }
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

      {/* Cart Drawer */}
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
                <div key={item.productId} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
                    <p className="text-sm text-neutral-500">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200"
                      aria-label={`Remover ${item.name}`}
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        addToCart({ id: item.productId, name: item.name, price: item.price })
                      }
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
                  placeholder="Seu nome (opcional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  aria-label="Seu nome"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  aria-label="WhatsApp"
                />
              </div>

              {/* Order type */}
              <div className="border-t border-neutral-100 pt-2">
                <p className="mb-2 text-xs font-semibold text-neutral-500">Como vai ser?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "DINE_IN", label: "Comer aqui" },
                      { value: "TAKEOUT", label: "Retirar" },
                      { value: "DELIVERY", label: "Entrega" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setOrderType(opt.value)}
                      className={`rounded-lg border py-2 text-xs font-medium transition-colors ${orderType === opt.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 text-neutral-600"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div className="border-t border-neutral-100 pt-2">
                <p className="mb-2 text-xs font-semibold text-neutral-500">Forma de pagamento</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "PIX", label: "PIX", Icon: QrCode },
                      { value: "CASH", label: "Dinheiro", Icon: Banknote },
                      { value: "CARD", label: "Cartão no local", Icon: CreditCard },
                      { value: "ON_DELIVERY", label: "Pagar na entrega", Icon: Truck },
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
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold text-neutral-700">Total</span>
                <span className="text-xl font-bold text-neutral-900">
                  {formatCurrency(cartTotal)}
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
  );
}
