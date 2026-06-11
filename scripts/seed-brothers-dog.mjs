/**
 * Seed script: Brother's. Dog cardápio completo
 * Baseado na imagem do cardápio (Mario Bros theme)
 *
 * Uso: DATABASE_URL="..." node scripts/seed-brothers-dog.mjs
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.yeeuqljpuwclxppoamqx:*73%40Hs%21%3FyRLNsbN@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const RESTAURANT_ID = "cmq8h86jl0001xd3kng3thz5f";

// ─── Adicional group definition (shared across all dog products) ──────────────
const ADICIONAIS_GROUP = {
  name: "Adicionais",
  type: "ADDON",
  minSelections: 0,
  maxSelections: 10,
  sortOrder: 1,
  options: [
    { name: "Bacon Crocante", price: 4.0, isDefault: false, isAvailable: true, sortOrder: 1 },
    { name: "Cheddar Cremoso", price: 3.0, isDefault: false, isAvailable: true, sortOrder: 2 },
    { name: "Catupiry Original", price: 4.0, isDefault: false, isAvailable: true, sortOrder: 3 },
    { name: "Calabresa Grelhada", price: 4.0, isDefault: false, isAvailable: true, sortOrder: 4 },
    { name: "Frango Desfiado", price: 4.0, isDefault: false, isAvailable: true, sortOrder: 5 },
    { name: "Vinagrete Extra", price: 2.0, isDefault: false, isAvailable: true, sortOrder: 6 },
    { name: "Maionese Especial Extra", price: 3.0, isDefault: false, isAvailable: true, sortOrder: 7 },
  ],
};

async function createCategory(name, description = undefined) {
  const last = await prisma.category.findFirst({
    where: { restaurantId: RESTAURANT_ID, deletedAt: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return prisma.category.create({
    data: {
      restaurantId: RESTAURANT_ID,
      name,
      description,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
}

async function createProduct(categoryId, { name, description, price, modifierGroups = [] }) {
  return prisma.product.create({
    data: {
      restaurantId: RESTAURANT_ID,
      categoryId,
      name,
      description,
      price,
      isActive: true,
      isPaused: false,
      allowCustomization: modifierGroups.length > 0,
      allowSplit: false,
      maxSplits: 2,
      splitPriceRule: "HIGHEST",
      modifierGroups: {
        create: modifierGroups.map((g) => ({
          restaurant: { connect: { id: RESTAURANT_ID } },
          name: g.name,
          type: g.type,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          sortOrder: g.sortOrder,
          options: {
            create: g.options.map((o) => ({
              restaurant: { connect: { id: RESTAURANT_ID } },
              name: o.name,
              price: o.price,
              isDefault: o.isDefault,
              isAvailable: o.isAvailable,
              sortOrder: o.sortOrder,
            })),
          },
        })),
      },
    },
  });
}

async function main() {
  console.log("🚀 Iniciando seed do Brother's. Dog...\n");

  // ─── Categories ──────────────────────────────────────────────────────────────
  console.log("📂 Criando categorias...");
  const catTradicionais = await createCategory("Tradicionais", "Os clássicos da casa");
  const catEspeciais = await createCategory("Especiais", "Combinações exclusivas");
  const catCremosos = await createCategory("Cremosos", "Com cheddar e catupiry");
  const catPremium = await createCategory("Premium da Casa", "O top do cardápio");
  const catCombos = await createCategory("Combos", "Combos player");
  const catBuracoQuente = await createCategory("Buraco Quente", "Sanduíches quentes");
  const catBebidas = await createCategory("Bebidas", "Refrigerantes e mais");
  console.log("✅ Categorias criadas\n");

  // ─── Tradicionais ─────────────────────────────────────────────────────────────
  console.log("🌭 Criando Tradicionais...");
  await createProduct(catTradicionais.id, {
    name: "Brother's Classic",
    description: "Salsicha, vinagrete da casa e batata palha. O clássico que nunca decepciona!",
    price: 11.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  await createProduct(catTradicionais.id, {
    name: "Brother's Classic Frango",
    description: "Frango desfiado temperado, vinagrete da casa e batata palha. Leve, saboroso e inesquecível!",
    price: 14.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  console.log("✅ Tradicionais criados\n");

  // ─── Especiais ────────────────────────────────────────────────────────────────
  console.log("⭐ Criando Especiais...");
  await createProduct(catEspeciais.id, {
    name: "Bacon Dog",
    description: "Salsicha, bacon crocante, cheddar cremoso, vinagrete e batata palha. Defumado e irresistível!",
    price: 18.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  await createProduct(catEspeciais.id, {
    name: "Calabresa Dog",
    description: "Calabresa grelhada, vinagrete e cheddar cremoso. Mais sabor em cada mordida!",
    price: 17.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  await createProduct(catEspeciais.id, {
    name: "Brother's Supremo",
    description: "Frango desfiado temperado com Catupiry Original, vinagrete e batata palha. Leve, cremoso e top!",
    price: 21.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  console.log("✅ Especiais criados\n");

  // ─── Cremosos ─────────────────────────────────────────────────────────────────
  console.log("🧀 Criando Cremosos...");
  await createProduct(catCremosos.id, {
    name: "Dog Cheddar",
    description: "Salsicha coberta com nosso cheddar cremoso e batata palha. Cremoso demais!",
    price: 15.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  await createProduct(catCremosos.id, {
    name: "Dog Catupiry",
    description: "Salsicha com Catupiry Original, vinagrete e batata palha. Suavidade que conquista!",
    price: 17.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  await createProduct(catCremosos.id, {
    name: "Duo Cremoso",
    description: "Cheddar cremoso + Catupiry Original juntos pra uma explosão de sabor!",
    price: 19.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  console.log("✅ Cremosos criados\n");

  // ─── Premium da Casa ──────────────────────────────────────────────────────────
  console.log("🌟 Criando Premium da Casa...");
  await createProduct(catPremium.id, {
    name: "Mario Bros Dog",
    description: "Calabresa, bacon, cheddar cremoso, Catupiry Original e vinagrete. O chefão do sabor!",
    price: 24.90,
    modifierGroups: [ADICIONAIS_GROUP],
  });
  console.log("✅ Premium criado\n");

  // ─── Combos ───────────────────────────────────────────────────────────────────
  console.log("🎮 Criando Combos...");
  await createProduct(catCombos.id, {
    name: "Combo Player 1",
    description: "1 Dog Tradicional (Brother's Classic) + Batata Frita + Refri Lata",
    price: 19.90,
    modifierGroups: [],
  });
  await createProduct(catCombos.id, {
    name: "Combo Multiplayer 2 Jogadores",
    description: "2 Dog Tradicionais (Brother's Classic) + 2 Batatas Fritas + 2 Refris Latas",
    price: 36.90,
    modifierGroups: [],
  });
  console.log("✅ Combos criados\n");

  // ─── Buraco Quente ────────────────────────────────────────────────────────────
  console.log("🥪 Criando Buraco Quente...");
  await createProduct(catBuracoQuente.id, {
    name: "Buraco Quente de Pernil",
    description: "Sanduíche quente de pernil",
    price: 15.50,
    modifierGroups: [],
  });
  await createProduct(catBuracoQuente.id, {
    name: "Buraco Quente de Costela",
    description: "Sanduíche quente de costela",
    price: 19.90,
    modifierGroups: [],
  });
  await createProduct(catBuracoQuente.id, {
    name: "Buraco Quente de Frango",
    description: "Sanduíche quente de frango",
    price: 15.00,
    modifierGroups: [],
  });
  console.log("✅ Buraco Quente criado\n");

  // ─── Bebidas ──────────────────────────────────────────────────────────────────
  console.log("🥤 Criando Bebidas...");
  await createProduct(catBebidas.id, {
    name: "Refrigerante Lata",
    description: "Lata 350ml",
    price: 7.00,
    modifierGroups: [],
  });
  await createProduct(catBebidas.id, {
    name: "Refrigerante 1,5L",
    description: "Garrafa 1,5 litros",
    price: 12.00,
    modifierGroups: [],
  });
  console.log("✅ Bebidas criadas\n");

  console.log("🎉 Seed concluído com sucesso!");
  console.log(`\n📊 Resumo:
  - 7 categorias criadas
  - 2 tradicionais
  - 3 especiais
  - 3 cremosos
  - 1 premium
  - 2 combos
  - 3 buraco quente
  - 2 bebidas
  - Adicionais (7 opções) vinculados a todos os dogs`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
