"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Search, ShoppingCart, Plus, Minus, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string | null;
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

export function DigitalMenuClient({ restaurantId, restaurantName, restaurantLogo, isOpen }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);

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
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
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
          type: "DINE_IN",
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes,
            addons: [],
          })),
        }),
      });
      if (res.ok) {
        setOrderPlaced(true);
        setCart([]);
        setIsCartOpen(false);
      }
    } catch {
      alert("Erro ao realizar pedido. Tente novamente.");
    }
  }

  if (orderPlaced) {
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
        <Button onClick={() => setOrderPlaced(false)}>Fazer novo pedido</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 px-4 py-4 sticky top-0 z-40">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {restaurantLogo ? (
                <img src={restaurantLogo} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5 text-primary-500" aria-hidden="true" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-neutral-900">{restaurantName}</h1>
                <span className={`text-xs font-medium ${isOpen ? "text-emerald-600" : "text-red-500"}`}>
                  {isOpen ? "● Aberto agora" : "● Fechado"}
                </span>
              </div>
            </div>
            {isOpen && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative rounded-xl bg-primary-500 p-2.5 text-white"
                aria-label={`Carrinho — ${cartCount} itens`}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-neutral-900">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar no cardápio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              aria-label="Buscar produto"
            />
          </div>
        </div>
      </header>

      {/* Categories */}
      {!search && (
        <div className="bg-white border-b border-neutral-100 overflow-x-auto">
          <div className="flex gap-2 px-4 py-2.5 max-w-2xl mx-auto">
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" aria-label="Carregando..." />
          </div>
        ) : displayed ? (
          <div className="space-y-3">
            {displayed.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              return (
                <div key={product.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <UtensilsCrossed className="h-6 w-6 text-neutral-300" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm">{product.name}</p>
                    {product.description && (
                      <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{product.description}</p>
                    )}
                    <p className="mt-1 font-bold text-primary-500">{formatCurrency(product.price)}</p>
                  </div>
                  {isOpen && (
                    <div className="shrink-0 flex items-center gap-1.5">
                      {inCart ? (
                        <>
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200"
                            aria-label={`Remover ${product.name}`}
                          >
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <span className="text-sm font-bold min-w-[1.25rem] text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => addToCart({ id: product.id, name: product.name, price: product.price })}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white"
                            aria-label={`Adicionar mais ${product.name}`}
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addToCart({ id: product.id, name: product.name, price: product.price })}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white"
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
                      <div key={product.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                        <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <UtensilsCrossed className="h-6 w-6 text-neutral-300" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 text-sm">{product.name}</p>
                          {product.description && (
                            <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{product.description}</p>
                          )}
                          <p className="mt-1 font-bold text-primary-500">{formatCurrency(product.price)}</p>
                        </div>
                        {isOpen && (
                          <div className="shrink-0 flex items-center gap-1.5">
                            {inCart ? (
                              <>
                                <button onClick={() => removeFromCart(product.id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200" aria-label={`Remover ${product.name}`}>
                                  <Minus className="h-3 w-3" aria-hidden="true" />
                                </button>
                                <span className="text-sm font-bold min-w-[1.25rem] text-center">{inCart.quantity}</span>
                                <button onClick={() => addToCart({ id: product.id, name: product.name, price: product.price })} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white" aria-label={`Adicionar mais ${product.name}`}>
                                  <Plus className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => addToCart({ id: product.id, name: product.name, price: product.price })} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white" aria-label={`Adicionar ${product.name}`}>
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
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" role="dialog" aria-modal="true" aria-label="Meu pedido">
          <div className="rounded-t-2xl bg-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <h2 className="text-lg font-bold text-neutral-900">Meu pedido</h2>
              <button onClick={() => setIsCartOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
                    <p className="text-sm text-neutral-500">{formatCurrency(item.price)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.productId)} className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200" aria-label={`Remover ${item.name}`}>
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-bold min-w-[1.5rem] text-center">{item.quantity}</span>
                    <button onClick={() => addToCart({ id: item.productId, name: item.name, price: item.price })} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white" aria-label={`Adicionar mais ${item.name}`}>
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <input
                  type="text"
                  placeholder="Seu nome (opcional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  aria-label="Seu nome"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  aria-label="WhatsApp"
                />
              </div>
            </div>
            <div className="border-t border-neutral-100 px-4 py-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold text-neutral-700">Total</span>
                <span className="text-xl font-bold text-neutral-900">{formatCurrency(cartTotal)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={placeOrder} disabled={cart.length === 0}>
                Confirmar pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
