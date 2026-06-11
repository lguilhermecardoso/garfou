/**
 * DigitalMenuClient
 *
 * Renders the public digital menu flow, including product listing, cart,
 * product customization, and split-product ordering before checkout.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  Copy,
  Check,
  Clock,
  Wifi,
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
  restaurantBanner?: string | null;
  restaurantPhone: string | null;
  isOpen: boolean;
  /** Pre-filled table number from ?table= URL param (QR code per mesa) */
  tableNumber?: string;
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
  restaurantBanner,
  restaurantPhone,
  isOpen,
  tableNumber,
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
  // When coming from a QR code (?table=X), lock to DINE_IN
  const [orderType, setOrderType] = useState<"DINE_IN" | "DELIVERY" | "TAKEOUT">("DINE_IN");
  const [tableNumberState] = useState<string>(tableNumber ?? "");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [isPaidOnline, setIsPaidOnline] = useState(false);

  // Online PIX payment state
  type PaymentMode = "on_delivery" | "pix_online" | "card_online";
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("on_delivery");
  type PixStep = null | {
    pixQrCodeUrl: string | null;
    pixCopyPaste: string | null;
    expiresAt: string | null;
    orderNumber: number;
    orderId: string;
    total: number;
  };
  const [pixStep, setPixStep] = useState<PixStep>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixPolling, setPixPolling] = useState<ReturnType<typeof setInterval> | null>(null);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);

  // Handle Stripe redirect back (success or cancelled)

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const orderId = params.get("orderId");
    if (payment === "success" && orderId) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPlacedOrderId(orderId);
      setIsPaidOnline(true);
      setOrderPlaced(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "cancelled") {
      toast.error("Pagamento cancelado. Tente novamente.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
        category.products
          .filter((product) => {
            // Hide expired promotions
            if (product.promotionExpiresAt) {
              return new Date(product.promotionExpiresAt) > new Date();
            }
            return true;
          })
          .map((product) => ({ ...product, categoryId: category.id }))
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

  function formatPromoExpiry(expiresAt: string) {
    const d = new Date(expiresAt);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day}/${month} às ${hours}:${minutes}`;
  }

  const cartTotal = cart.reduce((acc, item) => acc + getCartItemUnitPrice(item) * item.quantity, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const finalTotal = cartTotal + (orderType === "DELIVERY" ? deliveryFee : 0);

  async function placeOrder() {
    if (cart.length === 0) return;

    // Check for paused products still in cart
    const allProducts = categories.flatMap((c) => c.products);
    const pausedInCart = cart.filter((item) =>
      allProducts.some((p) => p.id === item.productId && p.isPaused)
    );
    if (pausedInCart.length > 0) {
      const names = pausedInCart.map((i) => i.name).join(", ");
      toast.error(
        `${pausedInCart.length === 1 ? "O item" : "Os itens"} "${names}" ${pausedInCart.length === 1 ? "ficou" : "ficaram"} indisponível${pausedInCart.length === 1 ? "" : "s"}. Por favor, remova-${pausedInCart.length === 1 ? "o" : "os"} do carrinho antes de continuar.`,
        { duration: 5000 }
      );
      return;
    }

    if (paymentMode === "pix_online") {
      await placeOrderWithPix();
      return;
    }

    if (paymentMode === "card_online") {
      await placeOrderWithCard();
      return;
    }

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
          tableNumber: tableNumberState || undefined,
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

  async function placeOrderWithPix() {
    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Por favor, informe seu WhatsApp");
      return;
    }
    if (
      orderType === "DELIVERY" &&
      (!deliveryStreet.trim() ||
        !deliveryNumber.trim() ||
        !deliveryNeighborhood.trim() ||
        !deliveryCity.trim())
    ) {
      toast.error("Por favor, preencha o endereço completo");
      return;
    }

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType,
          paymentMethod: "PIX",
          tableNumber: tableNumberState || undefined,
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
        setIsCartOpen(false);
        setPixStep({
          orderId: data.data.orderId,
          orderNumber: data.data.orderNumber,
          total: data.data.total,
          pixQrCodeUrl: data.data.pixQrCodeUrl,
          pixCopyPaste: data.data.pixCopyPaste,
          expiresAt: data.data.expiresAt,
        });
        // Poll for payment confirmation every 5 seconds
        const intervalId = setInterval(async () => {
          try {
            const statusRes = await fetch(
              `/api/restaurants/${restaurantId}/orders/${data.data.orderId}`
            );
            const statusData = await statusRes.json();
            if (statusData.data?.paymentStatus === "PAID") {
              clearInterval(intervalId);
              setPixPolling(null);
              setPixStep(null);
              setCart([]);
              setPlacedOrderId(data.data.orderId);
              setOrderPlaced(true);
              toast.success("Pagamento confirmado! Pedido realizado.");
            }
          } catch {
            // ignore polling errors
          }
        }, 5000);
        setPixPolling(intervalId);
      } else {
        toast.error(data.error ?? "Erro ao gerar PIX.");
      }
    } catch {
      toast.error("Erro ao gerar PIX. Tente novamente.");
    }
  }

  function cancelPixPayment() {
    if (pixPolling) clearInterval(pixPolling);
    setPixPolling(null);
    setPixStep(null);
    setIsCartOpen(true);
  }

  async function placeOrderWithCard() {
    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Por favor, informe seu WhatsApp");
      return;
    }
    if (
      orderType === "DELIVERY" &&
      (!deliveryStreet.trim() ||
        !deliveryNumber.trim() ||
        !deliveryNeighborhood.trim() ||
        !deliveryCity.trim())
    ) {
      toast.error("Por favor, preencha o endereço completo");
      return;
    }

    setIsRedirectingToStripe(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: window.location.origin,
          type: orderType,
          paymentMethod: "CREDIT_CARD",
          tableNumber: tableNumberState || undefined,
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
            selectedOptions: item.selectedOptions.map((o) => ({
              optionId: o.optionId,
              quantity: o.quantity,
              isRemoval: o.isRemoval,
            })),
            splits: item.splits.map((s) => ({
              splitIndex: s.splitIndex,
              flavorProductId: s.flavorProductId,
            })),
            addons: [],
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.data?.sessionUrl) {
        window.location.href = data.data.sessionUrl;
      } else {
        toast.error(data.error ?? "Erro ao iniciar pagamento.");
        setIsRedirectingToStripe(false);
      }
    } catch {
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
      setIsRedirectingToStripe(false);
    }
  }

  async function copyPixCode() {
    if (!pixStep?.pixCopyPaste) return;
    await navigator.clipboard.writeText(pixStep.pixCopyPaste);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  }

  // PIX payment screen
  if (pixStep) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-neutral-50 px-4 py-10">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lg">
          {/* Header */}
          <div className="bg-emerald-500 px-5 py-4 text-white">
            <div className="mb-1 flex items-center gap-2">
              <QrCode className="h-5 w-5" aria-hidden="true" />
              <span className="text-lg font-bold">Pague com PIX</span>
            </div>
            <p className="text-sm text-emerald-100">
              Pedido #{pixStep.orderNumber} · {formatCurrency(Number(pixStep.total))}
            </p>
          </div>

          <div className="space-y-4 p-5">
            {/* QR Code */}
            {pixStep.pixQrCodeUrl ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pixStep.pixQrCodeUrl}
                  alt="QR Code PIX"
                  className="h-48 w-48 rounded-xl border border-neutral-100"
                />
                <p className="text-center text-xs text-neutral-500">
                  Abra seu banco e escaneie o QR Code
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <QrCode className="h-12 w-12 text-neutral-300" aria-hidden="true" />
                <p className="text-sm text-neutral-500">QR Code não disponível</p>
              </div>
            )}

            {/* Copia e cola */}
            {pixStep.pixCopyPaste && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-neutral-500">Ou copie o código PIX:</p>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="flex-1 truncate font-mono text-xs text-neutral-700">
                    {pixStep.pixCopyPaste.slice(0, 40)}…
                  </p>
                  <button
                    onClick={copyPixCode}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${pixCopied ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-700"}`}
                    aria-label="Copiar código PIX"
                  >
                    {pixCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Expiry info */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
              <Clock className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-xs text-amber-700">
                Este código expira em <span className="font-semibold">1 hora</span>. Após pagar, seu
                pedido é confirmado automaticamente.
              </p>
            </div>

            {/* Polling indicator */}
            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
              <Wifi className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
              <p className="text-xs text-blue-700">Aguardando confirmação do pagamento…</p>
            </div>
          </div>

          {/* Cancel */}
          <div className="border-t border-neutral-100 px-5 py-4">
            <button
              onClick={cancelPixPayment}
              className="w-full text-sm text-neutral-500 underline underline-offset-2"
            >
              Cancelar e voltar ao carrinho
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    const waLink = restaurantPhone
      ? `https://wa.me/55${restaurantPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Acabei de fazer um pedido no cardápio digital${placedOrderId ? ` (#${placedOrderId})` : ""}.`)}`
      : null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4 text-center">
        <div className={`rounded-full p-6 ${isPaidOnline ? "bg-blue-100" : "bg-emerald-100"}`}>
          {isPaidOnline ? (
            <CreditCard className="h-12 w-12 text-blue-500" aria-hidden="true" />
          ) : (
            <UtensilsCrossed className="h-12 w-12 text-emerald-500" aria-hidden="true" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pedido realizado!</h1>
          <p className="mt-2 text-neutral-500">
            Seu pedido foi enviado. Aguarde, estamos preparando tudo com carinho.
          </p>
        </div>

        {isPaidOnline && (
          <div className="w-full max-w-sm rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left">
            <div className="mb-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <span className="font-semibold text-blue-800">Pagamento confirmado!</span>
            </div>
            <p className="text-sm text-blue-700">
              Seu pagamento com cartão foi processado com sucesso pelo Stripe. O restaurante já
              recebeu a confirmação.
            </p>
          </div>
        )}

        {!isPaidOnline && paymentMethod === "PIX" && (
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
            setIsPaidOnline(false);
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
        {restaurantBanner && (
          <div className="relative h-32 w-full overflow-hidden sm:h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={restaurantBanner} alt="" className="h-full w-full object-cover" />
          </div>
        )}
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
              {categories.map((category) => {
                const isPromoCategory = category.name === "Promoção do Dia";
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeCategory === category.id
                        ? isPromoCategory
                          ? "bg-red-500 text-white"
                          : "bg-primary-500 text-white"
                        : isPromoCategory
                          ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                          : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {isPromoCategory ? `🔥 ${category.name}` : category.name}
                  </button>
                );
              })}
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
                const productPaused = product.isPaused === true;
                const productFeatured = product.isFeatured === true;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 rounded-xl p-4 shadow-sm ${
                      productPaused
                        ? "bg-white opacity-60"
                        : productFeatured
                          ? "bg-white ring-2 ring-red-400"
                          : "bg-white"
                    }`}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UtensilsCrossed className="h-6 w-6 text-neutral-300" aria-hidden="true" />
                      )}
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
                        {productFeatured && !product.promotionExpiresAt && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                            ⭐ Destaque
                          </span>
                        )}
                        {product.promotionExpiresAt && (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700">
                            🔥 Válido até {formatPromoExpiry(product.promotionExpiresAt)}
                          </span>
                        )}
                        {requiresConfiguration && !productPaused && (
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                            Personalizável
                          </span>
                        )}
                        {productPaused && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                            Esgotado — em breve voltamos!
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen && !productPaused && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {totalForProduct > 0 ? (
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
                              onClick={() => setSelectedProduct(product)}
                              className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                              aria-label={`Adicionar mais ${product.name}`}
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => setSelectedProduct(product)}>
                            {requiresConfiguration ? "Escolher" : "Adicionar"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map((category) => {
                const isPromoCategory = category.name === "Promoção do Dia";
                return (
                  <div key={category.id}>
                    {isPromoCategory ? (
                      <div className="mb-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-400 px-4 py-3">
                        <span className="text-xl">🔥</span>
                        <div>
                          <h2 className="text-base font-bold text-white">{category.name}</h2>
                          <p className="text-xs text-red-100">
                            Ofertas especiais com tempo limitado
                          </p>
                        </div>
                      </div>
                    ) : (
                      <h2 className="mb-3 text-lg font-bold text-neutral-900">{category.name}</h2>
                    )}
                    <div className="space-y-3">
                      {category.products
                        .filter(
                          (p) =>
                            !p.promotionExpiresAt || new Date(p.promotionExpiresAt) > new Date()
                        )
                        .map((product) => {
                          const totalForProduct = cart
                            .filter((item) => item.productId === product.id)
                            .reduce((acc, item) => acc + item.quantity, 0);
                          const requiresConfiguration =
                            product.allowCustomization || product.allowSplit;
                          const productPaused = product.isPaused === true;

                          const productFeatured = product.isFeatured === true;
                          return (
                            <div
                              key={product.id}
                              className={`flex items-center gap-3 rounded-xl p-4 shadow-sm ${
                                productPaused
                                  ? "bg-white opacity-60"
                                  : isPromoCategory || productFeatured
                                    ? "bg-white ring-2 ring-red-400"
                                    : "bg-white"
                              }`}
                            >
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
                                {product.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <UtensilsCrossed
                                    className="h-6 w-6 text-neutral-300"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-neutral-900">
                                  {product.name}
                                </p>
                                {product.description && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                                    {product.description}
                                  </p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <p className="text-primary-500 font-bold">
                                    {formatCurrency(product.price)}
                                  </p>
                                  {productFeatured && !product.promotionExpiresAt && (
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                                      ⭐ Destaque
                                    </span>
                                  )}
                                  {product.promotionExpiresAt && (
                                    <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700">
                                      🔥 Válido até {formatPromoExpiry(product.promotionExpiresAt)}
                                    </span>
                                  )}
                                  {requiresConfiguration && !productPaused && (
                                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                                      Personalizável
                                    </span>
                                  )}
                                  {productPaused && (
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                                      Esgotado — em breve voltamos!
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isOpen && !productPaused && (
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {totalForProduct > 0 ? (
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
                                        onClick={() => setSelectedProduct(product)}
                                        className="bg-primary-500 flex h-7 w-7 items-center justify-center rounded-full text-white"
                                        aria-label={`Adicionar mais ${product.name}`}
                                      >
                                        <Plus className="h-3 w-3" aria-hidden="true" />
                                      </button>
                                    </>
                                  ) : (
                                    <Button size="sm" onClick={() => setSelectedProduct(product)}>
                                      {requiresConfiguration ? "Escolher" : "Adicionar"}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}{" "}
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
                {/* Warning: paused items in cart */}
                {(() => {
                  const allProducts = categories.flatMap((c) => c.products);
                  const pausedInCart = cart.filter((item) =>
                    allProducts.some((p) => p.id === item.productId && p.isPaused)
                  );
                  if (pausedInCart.length === 0) return null;
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-800">
                        ⚠️ {pausedInCart.length === 1 ? "Item indisponível" : "Itens indisponíveis"}{" "}
                        no carrinho
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        <strong>{pausedInCart.map((i) => i.name).join(", ")}</strong>{" "}
                        {pausedInCart.length === 1 ? "está" : "estão"} temporariamente esgotado
                        {pausedInCart.length === 1 ? "" : "s"}. Remova-
                        {pausedInCart.length === 1 ? "o" : "os"} para finalizar o pedido.
                      </p>
                    </div>
                  );
                })()}
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
                  {tableNumberState ? (
                    <div className="border-primary-500 bg-primary-50 flex items-center gap-2 rounded-lg border px-3 py-2">
                      <span className="text-primary-700 text-xs font-medium">
                        Comer aqui — Mesa {tableNumberState}
                      </span>
                    </div>
                  ) : (
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
                  )}
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
                  <p className="mb-2 text-xs font-semibold text-neutral-500">Como vai pagar?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMode("on_delivery")}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-colors ${paymentMode === "on_delivery" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 text-neutral-600"}`}
                    >
                      <Banknote className="h-4 w-4" aria-hidden="true" />
                      Na entrega / retirada
                    </button>
                    <button
                      onClick={() => setPaymentMode("card_online")}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-colors ${paymentMode === "card_online" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-600"}`}
                    >
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                      Cartão online (Stripe)
                    </button>
                  </div>
                </div>

                {/* Payment method selector — only when paying on delivery */}
                {paymentMode === "on_delivery" && (
                  <div className="border-t border-neutral-100 pt-2">
                    <p className="mb-2 text-xs font-semibold text-neutral-500">
                      Forma de pagamento
                    </p>
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
                )}
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
                  disabled={cart.length === 0 || isRedirectingToStripe || !isOpen}
                >
                  {isRedirectingToStripe ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Aguarde…
                    </span>
                  ) : !isOpen ? (
                    "Loja fechada"
                  ) : paymentMode === "card_online" ? (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                      Pagar com cartão
                    </span>
                  ) : (
                    "Confirmar pedido"
                  )}
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

      {/* Floating cart bar — visible only when cart has items and restaurant is open */}
      {isOpen && cartCount > 0 && !isCartOpen && (
        <div className="pointer-events-none fixed right-0 bottom-20 left-0 z-40 flex justify-center px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-2xl bg-neutral-900 px-5 py-4 shadow-2xl transition-all active:scale-[0.98]"
            aria-label={`Ver carrinho — ${cartCount} ${cartCount === 1 ? "item" : "itens"}, total ${formatCurrency(finalTotal)}`}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <ShoppingCart className="h-5 w-5 text-white" aria-hidden="true" />
                <span className="bg-accent-500 absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-neutral-900">
                  {cartCount}
                </span>
              </div>
              <span className="text-sm font-semibold text-white">
                {cartCount === 1 ? "1 item" : `${cartCount} itens`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">{formatCurrency(finalTotal)}</span>
              <span className="rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Ver pedido →
              </span>
            </div>
          </button>
        </div>
      )}

      <OrderTrackingFAB restaurantId={restaurantId} />
    </>
  );
}
