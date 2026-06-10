"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  Zap,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  restaurantId: string;
}

interface BillingData {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: "TRIALING" | "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID";
  trialEndsAt: string | null;
  currentPlanKey: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plans: {
    STARTER: { name: string; price: number; features: string[] };
    PRO: { name: string; price: number; features: string[] };
    ENTERPRISE: { name: string; price: number; features: string[] };
  };
}

type PlanKey = "STARTER" | "PRO" | "ENTERPRISE";

const PLAN_ICONS: Record<PlanKey, React.ElementType> = {
  STARTER: Zap,
  PRO: CreditCard,
  ENTERPRISE: Building2,
};

const STATUS_BADGE: Record<
  BillingData["subscriptionStatus"],
  { label: string; color: string; icon: React.ElementType }
> = {
  TRIALING: { label: "Período de teste", color: "text-blue-600 bg-blue-50", icon: Clock },
  ACTIVE: { label: "Ativo", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  CANCELED: { label: "Cancelado", color: "text-neutral-500 bg-neutral-100", icon: AlertCircle },
  PAST_DUE: { label: "Pagamento pendente", color: "text-amber-600 bg-amber-50", icon: AlertCircle },
  UNPAID: { label: "Inadimplente", color: "text-red-600 bg-red-50", icon: AlertCircle },
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function BillingSection({ restaurantId }: Props) {
  const { data, isLoading } = useQuery<{ data: BillingData }>({
    queryKey: ["billing", restaurantId],
    queryFn: () => fetch(`/api/restaurants/${restaurantId}/billing`).then((r) => r.json()),
  });

  const checkout = useMutation({
    mutationFn: async (plan: PlanKey) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao iniciar checkout");
      return json as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar checkout");
    },
  });

  const portal = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/billing/portal`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao abrir portal");
      return json as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir portal");
    },
  });

  if (isLoading || !data?.data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  const billing = data.data;
  const isSubscribed = !!billing.stripeSubscriptionId;
  const statusInfo = STATUS_BADGE[billing.subscriptionStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900">Assinatura e cobrança</h2>
        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
          >
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            {portal.isPending ? "Abrindo portal..." : "Gerenciar assinatura"}
          </Button>
        )}
      </div>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${statusInfo.color}`}
        >
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
          {statusInfo.label}
          {billing.subscriptionStatus === "TRIALING" && billing.trialEndsAt && (
            <span className="ml-1 font-normal">· expira em {formatDate(billing.trialEndsAt)}</span>
          )}
        </div>

        {billing.subscriptionStatus === "ACTIVE" && billing.currentPeriodEnd && (
          <div className="inline-flex items-center gap-1.5 text-sm text-neutral-500">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {billing.cancelAtPeriodEnd
              ? `Cancela em ${formatDate(billing.currentPeriodEnd)}`
              : `Renova em ${formatDate(billing.currentPeriodEnd)}`}
          </div>
        )}
      </div>

      {/* Alerts */}
      {billing.subscriptionStatus === "PAST_DUE" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-amber-800">Pagamento pendente</p>
            <p className="text-sm text-amber-700">
              Não foi possível cobrar seu cartão. Acesse o portal para atualizar o método de
              pagamento.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
            >
              Atualizar pagamento
            </Button>
          </div>
        </div>
      )}

      {billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          ⚠️ Sua assinatura será cancelada em{" "}
          <strong>{formatDate(billing.currentPeriodEnd)}</strong>. Você ainda pode reativá-la pelo
          portal antes dessa data.
        </div>
      )}

      {/* Error states */}
      {checkout.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {checkout.error instanceof Error ? checkout.error.message : "Erro ao iniciar checkout"}
        </div>
      )}
      {portal.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {portal.error instanceof Error ? portal.error.message : "Erro ao abrir portal"}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.entries(billing.plans) as [PlanKey, BillingData["plans"]["STARTER"]][]).map(
          ([key, plan]) => {
            const Icon = PLAN_ICONS[key];
            const isPro = key === "PRO";
            const isCurrentPlan = billing.currentPlanKey === key;

            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all ${
                  isCurrentPlan
                    ? "border-emerald-400 ring-2 ring-emerald-400"
                    : isPro
                      ? "border-primary-400 ring-primary-400 ring-2"
                      : "border-neutral-200"
                }`}
              >
                {isCurrentPlan && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-white">
                    Plano atual
                  </span>
                )}
                {!isCurrentPlan && isPro && (
                  <span className="bg-primary-500 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white">
                    Recomendado
                  </span>
                )}

                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`rounded-xl p-2 ${
                      isCurrentPlan ? "bg-emerald-50" : isPro ? "bg-primary-50" : "bg-neutral-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isCurrentPlan
                          ? "text-emerald-600"
                          : isPro
                            ? "text-primary-600"
                            : "text-neutral-600"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">{plan.name}</p>
                    <p className="text-lg font-bold text-neutral-900">
                      {formatBRL(plan.price)}
                      <span className="text-sm font-normal text-neutral-500">/mês</span>
                    </p>
                  </div>
                </div>

                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending}
                  >
                    {portal.isPending ? "Abrindo portal..." : "Gerenciar"}
                  </Button>
                ) : isSubscribed ? (
                  <Button
                    className="w-full"
                    variant={isPro ? "default" : "outline"}
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending}
                  >
                    {portal.isPending ? "Aguarde..." : "Mudar para este plano"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isPro ? "default" : "outline"}
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate(key)}
                  >
                    {checkout.isPending ? "Aguarde..." : "Assinar — 7 dias grátis"}
                  </Button>
                )}
              </div>
            );
          }
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Todos os planos incluem 7 dias de teste grátis. Cancele a qualquer momento sem multa.
        Cobrança mensal via cartão de crédito processada pelo Stripe.
      </p>
    </div>
  );
}
