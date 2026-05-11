import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  UtensilsCrossed,
  Tablet,
  ChefHat,
  BarChart3,
  Printer,
  Shield,
  Zap,
  Star,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { STRIPE_PLANS } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";

export default async function LandingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let systemHref = "/auth/signin";
  if (userId) {
    const membership = await prisma.userRestaurant.findFirst({
      where: { userId },
      select: { restaurantId: true },
      orderBy: { createdAt: "asc" },
    });
    systemHref = membership ? `/dashboard/${membership.restaurantId}` : "/onboarding";
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="text-primary-500 h-7 w-7" aria-hidden="true" />
            <span className="text-xl font-bold text-neutral-900">GARFOU</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação principal">
            <a
              href="#features"
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
            >
              Funcionalidades
            </a>
            <a
              href="#plans"
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
            >
              Planos
            </a>
            <a
              href="#faq"
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {userId ? (
              <Link href={systemHref}>
                <Button size="sm">
                  Acessar sistema
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    Começar grátis
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 px-4 py-24 text-white sm:px-6 sm:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Zap className="text-accent-400 h-3.5 w-3.5" aria-hidden="true" />
            <span>Novo: Impressão térmica automática</span>
          </div>
          <h1 className="mb-6 text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl">
            O sistema que o seu <span className="text-primary-400">restaurante</span> merece
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-neutral-300 sm:text-xl">
            Cardápio digital, pedidos, tela de cozinha, app do garçom, gestão financeira e muito
            mais. Tudo em um só lugar, sem complicação.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={userId ? systemHref : "/auth/signup"}>
              <Button size="xl" className="w-full sm:w-auto">
                {userId ? "Acessar sistema" : "Começar 14 dias grátis"}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="xl"
              className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
            >
              Ver demonstração
            </Button>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Sem cartão de crédito necessário • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-neutral-900 sm:text-4xl">
              Tudo que você precisa para operar
            </h2>
            <p className="text-lg text-neutral-500">
              Do pedido ao caixa, passando pela cozinha e estoque.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="bg-primary-50 group-hover:bg-primary-100 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
                    <feature.icon className="text-primary-500 h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-neutral-900">{feature.title}</h3>
                  <p className="text-sm text-neutral-500">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="bg-neutral-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-neutral-900 sm:text-4xl">
              Planos simples e transparentes
            </h2>
            <p className="text-lg text-neutral-500">
              Comece grátis por 14 dias. Sem surpresas na fatura.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {Object.entries(STRIPE_PLANS).map(([key, plan]) => (
              <Card
                key={key}
                className={
                  key === "PRO"
                    ? "border-primary-500 shadow-elevated ring-primary-500 ring-2 ring-offset-2"
                    : ""
                }
              >
                <CardContent className="p-8">
                  {key === "PRO" && (
                    <div className="bg-primary-500 mb-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white">
                      <Star className="h-3 w-3" aria-hidden="true" />
                      Mais popular
                    </div>
                  )}
                  <h3 className="mb-2 text-xl font-bold text-neutral-900">{plan.name}</h3>
                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-neutral-900">
                      {formatCurrency(plan.price / 100)}
                    </span>
                    <span className="text-neutral-500">/mês</span>
                  </div>
                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-neutral-700"
                      >
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/auth/signup?plan=${key.toLowerCase()}`}>
                    <Button className="w-full" variant={key === "PRO" ? "default" : "outline"}>
                      Começar grátis
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-neutral-900 sm:text-4xl">
            Perguntas frequentes
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-neutral-200 pb-6">
                <h3 className="mb-2 font-semibold text-neutral-900">{faq.q}</h3>
                <p className="text-neutral-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-500 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center text-white">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Pronto para transformar seu restaurante?
          </h2>
          <p className="text-primary-100 mb-8 text-lg">
            Junte-se a centenas de restaurantes que já usam o GARFOU.
          </p>
          <Link href={userId ? systemHref : "/auth/signup"}>
            <Button
              size="xl"
              variant="secondary"
              className="text-primary-600 hover:bg-primary-50 bg-white"
            >
              {userId ? "Entrar no sistema" : "Começar agora — é grátis"}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="text-primary-500 h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-neutral-700">GARFOU</span>
          </div>
          <p className="text-sm text-neutral-400">
            © {new Date().getFullYear()} GARFOU. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: UtensilsCrossed,
    title: "Pedidos inteligentes",
    description:
      "Fluxo completo de pedidos com aprovação automática ou manual, rastreamento em tempo real e histórico completo.",
  },
  {
    icon: Tablet,
    title: "Cardápio digital",
    description:
      "QR Code, URL personalizada, categorias, adicionais, promoções e pedido sem login. Mobile-first.",
  },
  {
    icon: ChefHat,
    title: "Tela de cozinha",
    description:
      "Interface fullscreen otimizada para cozinheiros com alertas sonoros, filtros e controle de status.",
  },
  {
    icon: Printer,
    title: "Impressão térmica",
    description:
      "Print Agent local para impressão automática em impressoras térmicas. Windows e Linux.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e dashboard",
    description: "Vendas, ticket médio, produtos mais pedidos, horários de pico e muito mais.",
  },
  {
    icon: Shield,
    title: "Seguro e confiável",
    description: "Multitenancy seguro, RBAC, autenticação robusta e backups automáticos.",
  },
];

const faqs = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. O GARFOU roda 100% no navegador. Para impressão térmica automática, existe um agente local opcional para Windows e Linux.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim! O GARFOU é mobile-first. O app do garçom e a tela de cozinha foram projetados especialmente para tablets e smartphones.",
  },
  {
    q: "Posso gerenciar vários restaurantes?",
    a: "Sim. Com o plano Enterprise você gerencia múltiplos restaurantes com uma só conta.",
  },
  {
    q: "O que acontece depois do trial?",
    a: "Após 14 dias, você escolhe um plano. Se não assinar, o acesso é suspenso mas seus dados ficam preservados por 30 dias.",
  },
  {
    q: "Como funciona o cardápio digital?",
    a: "Cada restaurante recebe uma URL personalizada (garfou.app/menu/seu-restaurante) e um QR Code. Clientes fazem pedidos sem precisar de login.",
  },
];
