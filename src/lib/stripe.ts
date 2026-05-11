import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const STRIPE_PLANS = {
  STARTER: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    name: "Starter",
    price: 9900, // R$ 99,00 in cents
    features: [
      "Até 500 pedidos/mês",
      "1 usuário",
      "Cardápio digital",
      "App garçom básico",
    ],
  },
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    name: "Pro",
    price: 19900, // R$ 199,00 in cents
    features: [
      "Pedidos ilimitados",
      "Até 5 usuários",
      "Tela de cozinha",
      "Relatórios avançados",
      "Impressão térmica",
      "Gestão de estoque",
    ],
  },
  ENTERPRISE: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    name: "Enterprise",
    price: 39900, // R$ 399,00 in cents
    features: [
      "Tudo do Pro",
      "Usuários ilimitados",
      "Multi-restaurante",
      "Suporte prioritário",
      "Customização",
    ],
  },
} as const;
