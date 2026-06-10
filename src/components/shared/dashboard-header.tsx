"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, X, Building2, ChevronDown, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDate } from "@/lib/utils";
import { NewRestaurantButton } from "./new-restaurant-button";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  restaurantId: string;
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function DashboardHeader({ restaurantId, user }: Props) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRestaurants, setShowRestaurants] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [togglingStore, setTogglingStore] = useState(false);

  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications(restaurantId);

  // Carrega status da loja
  useEffect(() => {
    async function loadStoreStatus() {
      try {
        const res = await fetch(`/api/user/restaurants`);
        if (res.ok) {
          const data = await res.json();
          const current = data.restaurants?.find((r: Restaurant) => r.id === restaurantId);
          if (current) setIsOpen(current.isOpen ?? false);
        }
      } catch {}
    }
    loadStoreStatus();
  }, [restaurantId]);

  async function handleToggleStore() {
    setTogglingStore(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/toggle-store`, { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        setIsOpen(data.data.isOpen);
      }
    } catch {}
    setTogglingStore(false);
  }

  // Carrega lista de restaurantes do usuário
  useEffect(() => {
    async function loadRestaurants() {
      try {
        const res = await fetch("/api/user/restaurants");
        if (res.ok) {
          const data = await res.json();
          setRestaurants(data.restaurants || []);

          // Encontra o restaurante atual
          const current = data.restaurants?.find((r: Restaurant) => r.id === restaurantId);
          if (current) {
            setCurrentRestaurant(current);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar restaurantes:", error);
      } finally {
        setLoadingRestaurants(false);
      }
    }

    loadRestaurants();
  }, [restaurantId]);

  function switchRestaurant(newRestaurantId: string) {
    setShowRestaurants(false);
    router.push(`/dashboard/${newRestaurantId}`);
  }

  return (
    <header className="relative flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      {/* Mobile menu button — sidebar toggle */}
      <button
        className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Restaurant Selector (always show if user has at least 1 restaurant) */}
        {!loadingRestaurants && restaurants.length >= 1 && (
          <div className="relative">
            <button
              onClick={() => setShowRestaurants(!showRestaurants)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              aria-label="Selecionar restaurante"
            >
              <Building2 className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <span className="hidden max-w-[150px] truncate sm:block">
                {currentRestaurant?.name || "Selecione"}
              </span>
              <ChevronDown className="h-3 w-3 text-neutral-400" aria-hidden="true" />
            </button>

            {/* Restaurants Dropdown */}
            {showRestaurants && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowRestaurants(false)}
                  aria-hidden="true"
                />

                {/* Dropdown Panel */}
                <div className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-neutral-200 bg-white shadow-xl">
                  <div className="border-b border-neutral-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-neutral-900">Meus Restaurantes</h3>
                  </div>

                  <div className="max-h-80 overflow-y-auto py-2">
                    {restaurants.map((restaurant) => (
                      <button
                        key={restaurant.id}
                        onClick={() => switchRestaurant(restaurant.id)}
                        className={`w-full px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 ${
                          restaurant.id === restaurantId ? "bg-primary-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              restaurant.id === restaurantId
                                ? "bg-primary-100 text-primary-600"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            <Building2 className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-medium ${
                                restaurant.id === restaurantId
                                  ? "text-primary-900"
                                  : "text-neutral-900"
                              }`}
                            >
                              {restaurant.name}
                            </p>
                            <p className="truncate text-xs text-neutral-500">{restaurant.slug}</p>
                          </div>
                          {restaurant.id === restaurantId && (
                            <div className="bg-primary-500 h-2 w-2 rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-neutral-200 p-2">
                    <NewRestaurantButton />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Store open/close toggle */}
        {isOpen !== null && (
          <button
            onClick={handleToggleStore}
            disabled={togglingStore}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              isOpen
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
            }`}
            aria-label={
              isOpen ? "Loja aberta — clique para fechar" : "Loja fechada — clique para abrir"
            }
            title={isOpen ? "Loja aberta — clique para fechar" : "Loja fechada — clique para abrir"}
          >
            <Store className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{isOpen ? "Aberta" : "Fechada"}</span>
          </button>
        )}

        {/* Notifications Button */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          aria-label={`Notificações${unreadCount > 0 ? ` - ${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : ""}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5">
          <div className="bg-primary-100 text-primary-600 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span className="hidden text-sm font-medium text-neutral-700 sm:block">
            {user.name ?? user.email}
          </span>
        </div>

        {/* Logout */}
        <form action={logoutAction}>
          <Button variant="ghost" size="icon-sm" type="submit" aria-label="Sair">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
            aria-hidden="true"
          />

          {/* Dropdown Panel */}
          <div className="absolute top-full right-4 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-neutral-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="font-semibold text-neutral-900">Notificações</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Fechar notificações"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Bell className="h-10 w-10 text-neutral-300" aria-hidden="true" />
                  <p className="text-sm text-neutral-500">Nenhuma notificação</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={`/dashboard/${restaurantId}/orders?status=NOVO_PEDIDO`}
                      onClick={() => setShowNotifications(false)}
                      className={`block border-b border-neutral-100 px-4 py-3 transition-colors hover:bg-neutral-50 ${
                        !notification.read ? "bg-primary-50/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            notification.type === "NEW_ORDER"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-primary-100 text-primary-600"
                          }`}
                        >
                          <Bell className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${!notification.read ? "font-semibold text-neutral-900" : "text-neutral-700"}`}
                          >
                            {notification.message}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {formatDate(notification.createdAt.toISOString())}
                          </p>
                        </div>
                        {!notification.read && (
                          <div
                            className="bg-primary-500 mt-2 h-2 w-2 shrink-0 rounded-full"
                            aria-label="Não lida"
                          />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-neutral-200 px-4 py-3">
                <button
                  onClick={() => {
                    clearAll();
                    setShowNotifications(false);
                  }}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Limpar todas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
