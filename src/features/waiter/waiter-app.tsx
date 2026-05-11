"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Plus, Minus, Search, ChefHat, X } from "lucide-react";

interface Props {
  restaurantId: string;
  tableNumber?: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  addons: { addonId: string; name: string; price: number; quantity: number }[];
}

interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isInternalOnly: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

type DisplayProduct = MenuProduct & { categoryId: string; categoryName: string };

export default function WaiterApp({ restaurantId, tableNumber }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: categories = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ["menu", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu?includeInactive=false`);
      const json = await res.json();
      return (json.data ?? []) as MenuCategory[];
    },
    staleTime: 30_000,
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
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          addons: [],
        },
      ];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  const cartTotal = cart.reduce(
    (acc, item) =>
      acc +
      (item.price +
        item.addons.reduce((a, addon) => a + addon.price * addon.quantity, 0)) *
        item.quantity,
    0
  );
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const allProducts: DisplayProduct[] = categories.flatMap((cat) =>
    cat.products.map((product) => ({
      ...product,
      categoryId: cat.id,
      categoryName: cat.name,
    }))
  );

  const filteredProducts = search
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : activeCategory
    ? allProducts.filter((p) => p.categoryId === activeCategory)
    : allProducts;

  async function submitOrder() {
    if (cart.length === 0) return;
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DINE_IN",
          tableNumber,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes,
            addons: i.addons.map((a) => ({
              addonId: a.addonId,
              quantity: a.quantity,
            })),
          })),
        }),
      });
      if (res.ok) {
        setCart([]);
        setIsCartOpen(false);
        alert("Pedido enviado!");
      }
    } catch {
      alert("Erro ao enviar pedido. Tente novamente.");
    }
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">App do Garçom</p>
            {tableNumber && (
              <p className="text-lg font-bold text-neutral-900">Mesa {tableNumber}</p>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative rounded-xl bg-primary-500 p-3 text-white shadow-md active:scale-95 transition-transform"
            aria-label={`Abrir carrinho — ${cartCount} itens`}
          >
            <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-neutral-900">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            aria-label="Buscar produto"
          />
        </div>
      </header>

      {/* Category Tabs */}
      {!search && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-white border-b border-neutral-100 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-primary-500 text-white"
                : "bg-neutral-100 text-neutral-600"
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
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-8 w-8 animate-pulse text-primary-400" aria-hidden="true" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden active:scale-95 transition-transform"
                >
                  <CardContent className="p-0">
                    <div className="bg-neutral-100 h-20 flex items-center justify-center">
                      <ChefHat className="h-8 w-8 text-neutral-300" aria-hidden="true" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-neutral-900 leading-tight">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-primary-500">
                        {formatCurrency(product.price)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {inCart ? (
                          <>
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-700"
                              aria-label={`Remover ${product.name}`}
                            >
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <span className="text-sm font-bold text-neutral-900 min-w-[1.5rem] text-center">
                              {inCart.quantity}
                            </span>
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
                            className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary-500 py-1.5 text-sm font-semibold text-white"
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
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" role="dialog" aria-modal="true" aria-label="Carrinho">
          <div className="rounded-t-2xl bg-white max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <h2 className="text-lg font-bold text-neutral-900">
                Carrinho ({cartCount})
              </h2>
              <button onClick={() => setIsCartOpen(false)} aria-label="Fechar carrinho">
                <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
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
                    <span className="text-sm font-bold min-w-[1.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart({ id: item.productId, name: item.name, price: item.price })}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white"
                      aria-label={`Adicionar mais ${item.name}`}
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
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
                onClick={submitOrder}
                disabled={cart.length === 0}
              >
                Enviar pedido para cozinha
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
