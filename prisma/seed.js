/* eslint-disable @typescript-eslint/no-require-imports */

/*
 * ═══════════════════════════════════════════════════════════════
 *  SEED DE QA — Garfou Prime Bistrô  (slug: garfou-demo-max)
 * ═══════════════════════════════════════════════════════════════
 *
 *  USUÁRIOS
 *  ┌──────────────────────────────┬────────────────┬──────────────┐
 *  │ E-mail                       │ Senha          │ Papel        │
 *  ├──────────────────────────────┼────────────────┼──────────────┤
 *  │ owner@garfou.demo            │ Owner123!      │ OWNER        │
 *  │ manager@garfou.demo          │ Manager123!    │ MANAGER      │
 *  │ waiter@garfou.demo           │ Waiter123!     │ WAITER       │
 *  │ kitchen@garfou.demo          │ Kitchen123!    │ KITCHEN      │
 *  │ cashier@garfou.demo          │ Cashier123!    │ CASHIER      │
 *  └──────────────────────────────┴────────────────┴──────────────┘
 *
 *  CARDÁPIO
 *  Pizzas Artesanais (7 itens, 1 inativo):
 *    Margherita R$62,90 · Pepperoni R$68,50 · Trufada R$84,90
 *    4 Queijos R$72,00 · Frango/Catupiry R$65,00 · Portuguesa R$70,00
 *    Vegana (INATIVA) R$58,00
 *  Bebidas (4):
 *    Limonada R$14,90 · Refri R$8,50 · Água R$5,00 · Suco Natural R$12,00
 *  Sobremesas (3):
 *    Tiramisu R$21,00 · Petit Gateau R$26,00 · Sorvete R$14,00
 *
 *  CUPONS (3):
 *    BEMVINDO15 — 15% off, mín R$70, 1º pedido, até 31/12/2026 (ativo)
 *    NOITE20    — R$20 off, mín R$120, qualquer pedido, até 31/12/2026 (ativo)
 *    VENCIDO10  — 10% off, expirado em 2025 (inativo)
 *
 *  CLIENTES (10):
 *    Guilherme, Marina, Rafael, Beatriz, Carlos, Fernanda, Lucas, Ana, Pedro, Juliana
 *
 *  PEDIDOS (15) — espalhados nos últimos 30 dias, todos os status:
 *    NOVO_PEDIDO · AGUARDANDO_CONFIRMACAO · CONFIRMADO · EM_PREPARO
 *    PRONTO · SAIU_PARA_ENTREGA · FINALIZADO · CANCELADO
 *
 *  NPS (10 respostas — promotores, passivos e detratores):
 *    Scores: 10, 9, 9, 8, 7, 7, 6, 5, 3, 10
 *
 *  FINANÇAS (25 lançamentos nos últimos 30 dias):
 *    Receitas: pedidos finalizados
 *    Despesas: INSUMOS, OPERACIONAL, FOLHA, MARKETING, MANUTENCAO
 *
 *  ESTOQUE (8 itens, 2 abaixo do mínimo para alerta):
 *    Farinha 00 · Mussarela · Pepperoni · Molho tomate · Limão
 *    Óleo · Sal/temperos (BAIXO) · Embalagens delivery (BAIXO)
 *
 *  HORÁRIO: Dom 18-23 | Seg-Qui 11:30-23 | Sex-Sáb 11:30-23:30
 *  ZONAS: Centro · Jardins · Vila Mariana · Moema · Itaim Bibi
 * ═══════════════════════════════════════════════════════════════
 */

require("dotenv").config();

const { PrismaPg } = require("@prisma/adapter-pg");
const {
  PrismaClient,
  SubscriptionStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  MovementType,
  EntryType,
  UserRole,
} = require("@prisma/client");
const { hash } = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/** Returns a Date N days ago */
function daysAgo(n, hourOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() + hourOffset, 0, 0, 0);
  return d;
}

async function upsertUser({ name, email, password }) {
  const passwordHash = await hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { name, email, passwordHash },
  });
}

async function main() {
  const DEMO_SLUG = "chamou-demo-max";
  const DEMO_NAME = "Chamou Prime Bistrô";

  console.log("[seed] starting...");

  // ── Users ────────────────────────────────────────────────────────
  const users = {
    owner: await upsertUser({ name: "Alice Donati", email: "owner@chamou.demo", password: "Owner123!" }),
    manager: await upsertUser({ name: "Bruno Silveira", email: "manager@chamou.demo", password: "Manager123!" }),
    waiter: await upsertUser({ name: "Carla Souza", email: "waiter@chamou.demo", password: "Waiter123!" }),
    kitchen: await upsertUser({ name: "Diego Lima", email: "kitchen@chamou.demo", password: "Kitchen123!" }),
    cashier: await upsertUser({ name: "Eva Rocha", email: "cashier@chamou.demo", password: "Cashier123!" }),
  };

  // ── Restaurant (UPSERT to keep same ID) ──────────────────────────
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: DEMO_SLUG },
    update: {
      name: DEMO_NAME,
      logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
      phone: "+55 11 93333-4444",
      address: "Rua das Palmeiras, 245",
      city: "Sao Paulo",
      state: "SP",
      isOpen: true,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      stripeCustomerId: "cus_demo_chamou_prime",
      stripeSubscriptionId: "sub_demo_chamou_enterprise",
      trialEndsAt: new Date("2027-01-01T00:00:00.000Z"),
      settings: {
        plan: "ENTERPRISE",
        approvalMode: "MANUAL",
        autoPrint: true,
        kitchenPollingSeconds: 3,
        waiterPollingSeconds: 5,
        dashboardPollingSeconds: 30,
        theme: "premium-red",
        currency: "BRL",
        timezone: "America/Sao_Paulo",
      },
    },
    create: {
      name: DEMO_NAME,
      slug: DEMO_SLUG,
      logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
      phone: "+55 11 93333-4444",
      address: "Rua das Palmeiras, 245",
      city: "Sao Paulo",
      state: "SP",
      isOpen: true,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      stripeCustomerId: "cus_demo_chamou_prime",
      stripeSubscriptionId: "sub_demo_chamou_enterprise",
      trialEndsAt: new Date("2027-01-01T00:00:00.000Z"),
      settings: {
        plan: "ENTERPRISE",
        approvalMode: "MANUAL",
        autoPrint: true,
        kitchenPollingSeconds: 3,
        waiterPollingSeconds: 5,
        dashboardPollingSeconds: 30,
        theme: "premium-red",
        currency: "BRL",
        timezone: "America/Sao_Paulo",
      },
    },
  });
  const rId = restaurant.id;

  // ── Clean existing data (keep restaurant) ────────────────────────
  console.log(`[seed] cleaning existing data for restaurant ${rId}...`);
  const orders = await prisma.order.findMany({ where: { restaurantId: rId }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length) {
    const items = await prisma.orderItem.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
    const itemIds = items.map((i) => i.id);
    if (itemIds.length) {
      await prisma.orderItemAddon.deleteMany({ where: { orderItemId: { in: itemIds } } });
      await prisma.orderItemSelectedOption.deleteMany({ where: { orderItemId: { in: itemIds } } });
      await prisma.orderItemSplit.deleteMany({ where: { orderItemId: { in: itemIds } } });
      await prisma.orderItem.deleteMany({ where: { id: { in: itemIds } } });
    }
    await prisma.npsResponse.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.financeEntry.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { restaurantId: rId } });
  }
  // Clean cash registers
  const cashRegisters = await prisma.cashRegister.findMany({ where: { restaurantId: rId }, select: { id: true } });
  const registerIds = cashRegisters.map((r) => r.id);
  if (registerIds.length) {
    await prisma.cashTransaction.deleteMany({ where: { registerId: { in: registerIds } } });
    await prisma.cashRegister.deleteMany({ where: { restaurantId: rId } });
  }
  // Clean inventory
  const inventoryItems = await prisma.inventoryItem.findMany({ where: { restaurantId: rId }, select: { id: true } });
  const itemIds = inventoryItems.map((i) => i.id);
  if (itemIds.length) {
    await prisma.inventoryMovement.deleteMany({ where: { itemId: { in: itemIds } } });
    await prisma.inventoryItem.deleteMany({ where: { restaurantId: rId } });
  }
  // Clean menu
  const products = await prisma.product.findMany({ where: { restaurantId: rId }, select: { id: true } });
  const productIds = products.map((p) => p.id);
  if (productIds.length) {
    await prisma.productAddon.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productSplitFlavor.deleteMany({
      where: {
        OR: [
          { sourceProductId: { in: productIds } },
          { flavorProductId: { in: productIds } },
        ],
      },
    });
    await prisma.product.deleteMany({ where: { restaurantId: rId } });
  }
  const modifierGroups = await prisma.modifierGroup.findMany({ where: { restaurantId: rId }, select: { id: true } });
  const groupIds = modifierGroups.map((g) => g.id);
  if (groupIds.length) {
    await prisma.modifierOption.deleteMany({ where: { groupId: { in: groupIds } } });
    await prisma.modifierGroup.deleteMany({ where: { restaurantId: rId } });
  }
  await prisma.category.deleteMany({ where: { restaurantId: rId } });
  await prisma.tab.deleteMany({ where: { restaurantId: rId } });
  await prisma.table.deleteMany({ where: { restaurantId: rId } });
  await prisma.coupon.deleteMany({ where: { restaurantId: rId } });
  await prisma.customer.deleteMany({ where: { restaurantId: rId } });
  await prisma.deliveryZone.deleteMany({ where: { restaurantId: rId } });
  await prisma.financeEntry.deleteMany({ where: { restaurantId: rId } });
  await prisma.operatingHours.deleteMany({ where: { restaurantId: rId } });
  await prisma.userRestaurant.deleteMany({ where: { restaurantId: rId } });
  console.log("[seed] cleaning done ✓");

  await prisma.userRestaurant.createMany({
    data: [
      { userId: users.owner.id, restaurantId: rId, role: UserRole.OWNER },
      { userId: users.manager.id, restaurantId: rId, role: UserRole.MANAGER },
      { userId: users.waiter.id, restaurantId: rId, role: UserRole.WAITER },
      { userId: users.kitchen.id, restaurantId: rId, role: UserRole.KITCHEN },
      { userId: users.cashier.id, restaurantId: rId, role: UserRole.CASHIER },
    ],
  });

  // ── Operating Hours ──────────────────────────────────────────────
  await prisma.operatingHours.createMany({
    data: [
      { restaurantId: rId, dayOfWeek: 0, openTime: "18:00", closeTime: "23:00", isClosed: false },
      { restaurantId: rId, dayOfWeek: 1, openTime: "11:30", closeTime: "23:00", isClosed: false },
      { restaurantId: rId, dayOfWeek: 2, openTime: "11:30", closeTime: "23:00", isClosed: false },
      { restaurantId: rId, dayOfWeek: 3, openTime: "11:30", closeTime: "23:00", isClosed: false },
      { restaurantId: rId, dayOfWeek: 4, openTime: "11:30", closeTime: "23:30", isClosed: false },
      { restaurantId: rId, dayOfWeek: 5, openTime: "11:30", closeTime: "23:30", isClosed: false },
      { restaurantId: rId, dayOfWeek: 6, openTime: "12:00", closeTime: "23:30", isClosed: false },
    ],
  });

  // ── Delivery Zones ───────────────────────────────────────────────
  await prisma.deliveryZone.createMany({
    data: [
      { restaurantId: rId, name: "Centro", fee: 6.9, estimatedMinutes: 25, isActive: true },
      { restaurantId: rId, name: "Jardins", fee: 9.9, estimatedMinutes: 35, isActive: true },
      { restaurantId: rId, name: "Vila Mariana", fee: 12.5, estimatedMinutes: 40, isActive: true },
      { restaurantId: rId, name: "Moema", fee: 14.9, estimatedMinutes: 45, isActive: true },
      { restaurantId: rId, name: "Itaim Bibi", fee: 11.9, estimatedMinutes: 38, isActive: false },
    ],
  });

  // ── Menu ─────────────────────────────────────────────────────────
  const [catPizza, catBebidas, catSobremesas] = await Promise.all([
    prisma.category.create({ data: { restaurantId: rId, name: "Pizzas Artesanais", description: "Fermentacao natural 48h", sortOrder: 1 } }),
    prisma.category.create({ data: { restaurantId: rId, name: "Bebidas", description: "Sem alcool e autorais", sortOrder: 2 } }),
    prisma.category.create({ data: { restaurantId: rId, name: "Sobremesas", description: "Finalizacao da casa", sortOrder: 3 } }),
  ]);

  const [
    pMargherita, pPepperoni, pTrufada, p4Queijos, pFrangoCatupiry, pPortuguesa, pVegana,
    pLimonada, pRefri, pAgua, pSuco,
    pTiramisu, pPetitGateau, pSorvete,
  ] = await Promise.all([
    // Pizzas
    prisma.product.create({ data: { restaurantId: rId, categoryId: catPizza.id, name: "Pizza Margherita", description: "Mussarela de bufala, manjericao e molho italiano", price: 62.9, sortOrder: 1, isFeatured: true, preparationTime: 18, costPrice: 24.0 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catPizza.id, name: "Pizza Pepperoni", description: "Pepperoni premium e blend de queijos", price: 68.5, sortOrder: 2, isFeatured: true, preparationTime: 20, costPrice: 27.5 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catPizza.id, name: "Pizza Trufada da Casa", description: "Cogumelos frescos, rucola e azeite trufado", price: 84.9, sortOrder: 3, preparationTime: 24, costPrice: 33.9 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catPizza.id, name: "Pizza 4 Queijos", description: "Mussarela, provolone, gorgonzola e parmesao", price: 72.0, sortOrder: 4, isFeatured: true, preparationTime: 20, costPrice: 28.0 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catPizza.id, name: "Pizza Frango/Catupiry", description: "Frango desfiado ao catupiry original", price: 65.0, sortOrder: 5, preparationTime: 22, costPrice: 25.0 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catPizza.id, name: "Pizza Portuguesa", description: "Presunto, ovo, azeitona, cebola e pimentao", price: 70.0, sortOrder: 6, preparationTime: 21, costPrice: 26.0 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catPizza.id, name: "Pizza Vegana", description: "Legumes grelhados e queijo vegano", price: 58.0, sortOrder: 7, isActive: false, preparationTime: 25, costPrice: 22.0 } }),
    // Bebidas
    prisma.product.create({ data: { restaurantId: rId, categoryId: catBebidas.id, name: "Limonada Siciliana", description: "Feita na hora com limao siciliano", price: 14.9, sortOrder: 1, preparationTime: 4, costPrice: 4.2 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catBebidas.id, name: "Refrigerante Lata", description: "350ml — Coca, Guarana ou Sprite", price: 8.5, sortOrder: 2, preparationTime: 1, costPrice: 3.2 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catBebidas.id, name: "Agua Mineral", description: "500ml com ou sem gas", price: 5.0, sortOrder: 3, preparationTime: 1, costPrice: 1.5 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catBebidas.id, name: "Suco Natural", description: "Laranja, maracuja ou abacaxi — 300ml", price: 12.0, sortOrder: 4, preparationTime: 5, costPrice: 3.8 } }),
    // Sobremesas
    prisma.product.create({ data: { restaurantId: rId, categoryId: catSobremesas.id, name: "Tiramisu", description: "Receita italiana classica", price: 21.0, sortOrder: 1, isFeatured: true, preparationTime: 6, costPrice: 8.5 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catSobremesas.id, name: "Petit Gateau", description: "Bolo quente com sorvete de creme", price: 26.0, sortOrder: 2, isFeatured: true, preparationTime: 8, costPrice: 9.5 } }),
    prisma.product.create({ data: { restaurantId: rId, categoryId: catSobremesas.id, name: "Sorvete Artesanal", description: "2 bolas — sabores do dia", price: 14.0, sortOrder: 3, preparationTime: 3, costPrice: 5.0 } }),
  ]);

  // Add-ons
  const [aBordaMarg, aExtraMuss, aBordaRecheada,
    aPepperoniExtra, aLascaParm, aExtraQueijo,
    aCatupiry, aAzeitona] = await Promise.all([
      prisma.productAddon.create({ data: { restaurantId: rId, productId: pMargherita.id, name: "Borda recheada catupiry", price: 9.9, maxQuantity: 1 } }),
      prisma.productAddon.create({ data: { restaurantId: rId, productId: pMargherita.id, name: "Extra mussarela", price: 7.5, maxQuantity: 2 } }),
      prisma.productAddon.create({ data: { restaurantId: rId, productId: p4Queijos.id, name: "Borda de cream cheese", price: 9.9, maxQuantity: 1 } }),
      prisma.productAddon.create({ data: { restaurantId: rId, productId: pPepperoni.id, name: "Pepperoni extra", price: 8.9, maxQuantity: 2 } }),
      prisma.productAddon.create({ data: { restaurantId: rId, productId: pTrufada.id, name: "Lasca de parmesao", price: 6.5, maxQuantity: 2 } }),
      prisma.productAddon.create({ data: { restaurantId: rId, productId: pFrangoCatupiry.id, name: "Extra catupiry", price: 5.0, maxQuantity: 2 } }),
      prisma.productAddon.create({ data: { restaurantId: rId, productId: pPortuguesa.id, name: "Catupiry", price: 5.0, maxQuantity: 1 } }),
      prisma.productAddon.create({ data: { restaurantId: rId, productId: pPortuguesa.id, name: "Azeitona extra", price: 3.0, maxQuantity: 1 } }),
    ]);

  // ── Coupons ──────────────────────────────────────────────────────
  const [couponBemVindo, couponNoite, couponVencido] = await Promise.all([
    prisma.coupon.create({ data: { restaurantId: rId, code: "BEMVINDO15", type: "PERCENTAGE", value: 15, minOrderValue: 70, maxUses: 100, usedCount: 23, isFirstOrderOnly: true, expiresAt: new Date("2026-12-31T23:59:59.000Z"), isActive: true } }),
    prisma.coupon.create({ data: { restaurantId: rId, code: "NOITE20", type: "FIXED_AMOUNT", value: 20, minOrderValue: 120, maxUses: 200, usedCount: 47, isFirstOrderOnly: false, expiresAt: new Date("2026-12-31T23:59:59.000Z"), isActive: true } }),
    prisma.coupon.create({ data: { restaurantId: rId, code: "VENCIDO10", type: "PERCENTAGE", value: 10, minOrderValue: 50, maxUses: 50, usedCount: 50, isFirstOrderOnly: false, expiresAt: new Date("2025-01-01T00:00:00.000Z"), isActive: false } }),
  ]);

  // ── Customers ────────────────────────────────────────────────────
  const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10] = await Promise.all([
    prisma.customer.create({ data: { restaurantId: rId, name: "Guilherme Matos", phone: "+55 11 97777-1111", email: "guilherme.cliente@demo.com", notes: "Cliente frequente, prefere massa fina" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Marina Costa", phone: "+55 11 97777-2222", email: "marina.cliente@demo.com" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Rafael Prado", phone: "+55 11 97777-3333", email: "rafael.cliente@demo.com" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Beatriz Alves", phone: "+55 11 97777-4444", email: "beatriz@demo.com", notes: "Alergia a frutos do mar" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Carlos Mendes", phone: "+55 11 97777-5555" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Fernanda Lima", phone: "+55 11 97777-6666", email: "fernanda@demo.com" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Lucas Ferreira", phone: "+55 11 97777-7777" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Ana Clara Santos", phone: "+55 11 97777-8888", email: "ana.clara@demo.com" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Pedro Rocha", phone: "+55 11 97777-9999" } }),
    prisma.customer.create({ data: { restaurantId: rId, name: "Juliana Neves", phone: "+55 11 97777-0000", email: "juliana@demo.com" } }),
  ]);

  // ── Inventory ────────────────────────────────────────────────────
  const [
    iFlour, iMozzarella, iPepperoni, iTomato, iLemon,
    iOil, iSalt, iPackaging,
  ] = await Promise.all([
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Farinha 00", unit: "kg", currentStock: 80, minimumStock: 15, averageCost: 5.4 } }),
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Mussarela", unit: "kg", currentStock: 45, minimumStock: 10, averageCost: 32 } }),
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Pepperoni", unit: "kg", currentStock: 24, minimumStock: 6, averageCost: 40 } }),
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Molho de tomate", unit: "L", currentStock: 30, minimumStock: 8, averageCost: 9 } }),
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Limao siciliano", unit: "un", currentStock: 120, minimumStock: 30, averageCost: 1.2 } }),
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Oleo de oliva", unit: "L", currentStock: 8, minimumStock: 5, averageCost: 24 } }),
    // Abaixo do mínimo (para testar alertas)
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Sal e temperos", unit: "kg", currentStock: 1.2, minimumStock: 3, averageCost: 8 } }),
    prisma.inventoryItem.create({ data: { restaurantId: rId, name: "Embalagens delivery", unit: "un", currentStock: 15, minimumStock: 50, averageCost: 0.8 } }),
  ]);

  await prisma.inventoryMovement.createMany({
    data: [
      { restaurantId: rId, itemId: iFlour.id, type: MovementType.IN, quantity: 100, unitCost: 5.3, reason: "Compra semanal", userId: users.manager.id },
      { restaurantId: rId, itemId: iMozzarella.id, type: MovementType.IN, quantity: 50, unitCost: 31.8, reason: "Fornecedor principal", userId: users.manager.id },
      { restaurantId: rId, itemId: iPepperoni.id, type: MovementType.OUT, quantity: 6, unitCost: 40, reason: "Producao do dia", userId: users.kitchen.id },
      { restaurantId: rId, itemId: iTomato.id, type: MovementType.OUT, quantity: 4, unitCost: 9, reason: "Producao do dia", userId: users.kitchen.id },
      { restaurantId: rId, itemId: iLemon.id, type: MovementType.OUT, quantity: 22, unitCost: 1.2, reason: "Bebidas do turno", userId: users.kitchen.id },
      { restaurantId: rId, itemId: iOil.id, type: MovementType.IN, quantity: 10, unitCost: 23.5, reason: "Reposicao mensal", userId: users.manager.id },
      { restaurantId: rId, itemId: iOil.id, type: MovementType.OUT, quantity: 2, unitCost: 24, reason: "Uso cozinha", userId: users.kitchen.id },
      { restaurantId: rId, itemId: iSalt.id, type: MovementType.ADJUSTMENT, quantity: -0.8, unitCost: 8, reason: "Ajuste apos inventario", userId: users.manager.id },
      { restaurantId: rId, itemId: iPackaging.id, type: MovementType.OUT, quantity: 35, unitCost: 0.8, reason: "Pedidos delivery", userId: users.kitchen.id },
      { restaurantId: rId, itemId: iFlour.id, type: MovementType.OUT, quantity: 20, unitCost: 5.4, reason: "Producao — turno noturno", userId: users.kitchen.id },
    ],
  });

  // ── Orders ───────────────────────────────────────────────────────
  // Helper: create order + items in one call
  async function makeOrder({ orderNumber, customer, status, type, paymentMethod, paymentStatus, tableNumber, items, discount, deliveryFee, subtotal, total, notes, coupon, deliveryAddress, createdAt, printConfirmed, printedAt }) {
    return prisma.order.create({
      data: {
        restaurantId: rId,
        orderNumber,
        customerId: customer?.id,
        waiterId: users.waiter.id,
        tableNumber,
        type,
        status,
        subtotal,
        discount: discount ?? 0,
        deliveryFee: deliveryFee ?? 0,
        total,
        paymentMethod,
        paymentStatus,
        notes,
        couponId: coupon?.id,
        deliveryAddress,
        printConfirmed: printConfirmed ?? false,
        printedAt: printedAt ?? null,
        createdAt: createdAt ?? new Date(),
        items: { create: items },
      },
    });
  }

  // 1. NOVO_PEDIDO — acaba de chegar, aguardando ação do operador
  const o1 = await makeOrder({
    orderNumber: 1001, customer: c1, status: OrderStatus.NOVO_PEDIDO,
    type: OrderType.DINE_IN, tableNumber: "05",
    paymentMethod: PaymentMethod.PIX, paymentStatus: PaymentStatus.PENDING,
    subtotal: 62.9, total: 62.9,
    notes: "Sem cebola por favor",
    createdAt: daysAgo(0, -1),
    items: [{ productId: pMargherita.id, quantity: 1, unitPrice: 62.9 }],
  });

  // 2. AGUARDANDO_CONFIRMACAO — cliente fez pedido online
  const o2 = await makeOrder({
    orderNumber: 1002, customer: c2, status: OrderStatus.AGUARDANDO_CONFIRMACAO,
    type: OrderType.DELIVERY,
    paymentMethod: PaymentMethod.CREDIT_CARD, paymentStatus: PaymentStatus.PAID,
    subtotal: 68.5, deliveryFee: 9.9, total: 78.4,
    notes: "Interfone 82",
    deliveryAddress: { street: "Rua Augusta", number: "1450", district: "Consolacao", city: "Sao Paulo", state: "SP" },
    createdAt: daysAgo(0, -1),
    items: [{ productId: pPepperoni.id, quantity: 1, unitPrice: 68.5, addons: { create: [{ addonId: aPepperoniExtra.id, quantity: 1, unitPrice: 8.9 }] } }],
  });

  // 3. CONFIRMADO — confirmado, indo para cozinha
  const o3 = await makeOrder({
    orderNumber: 1003, customer: c3, status: OrderStatus.CONFIRMADO,
    type: OrderType.DINE_IN, tableNumber: "12",
    paymentMethod: PaymentMethod.PIX, paymentStatus: PaymentStatus.PAID,
    subtotal: 86.3, total: 86.3,
    notes: "Massa fina",
    createdAt: daysAgo(0, -2),
    printConfirmed: false,
    items: [
      { productId: pMargherita.id, quantity: 1, unitPrice: 62.9, notes: "Massa fina", addons: { create: [{ addonId: aBordaMarg.id, quantity: 1, unitPrice: 9.9 }, { addonId: aExtraMuss.id, quantity: 1, unitPrice: 7.5 }] } },
      { productId: pLimonada.id, quantity: 1, unitPrice: 14.9 },
    ],
  });

  // 4. EM_PREPARO — na cozinha agora
  const o4 = await makeOrder({
    orderNumber: 1004, customer: c4, status: OrderStatus.EM_PREPARO,
    type: OrderType.TAKEOUT,
    paymentMethod: PaymentMethod.DEBIT_CARD, paymentStatus: PaymentStatus.PAID,
    subtotal: 156.9, total: 136.9, discount: 20, coupon: couponNoite,
    notes: "Buscar em 30 minutos",
    createdAt: daysAgo(0, -2),
    printConfirmed: true, printedAt: daysAgo(0, -2),
    items: [
      { productId: pTrufada.id, quantity: 1, unitPrice: 84.9, addons: { create: [{ addonId: aLascaParm.id, quantity: 1, unitPrice: 6.5 }] } },
      { productId: p4Queijos.id, quantity: 1, unitPrice: 72.0 },
    ],
  });

  // 5. PRONTO — aguardando retirada/entrega
  const o5 = await makeOrder({
    orderNumber: 1005, customer: c5, status: OrderStatus.PRONTO,
    type: OrderType.DINE_IN, tableNumber: "03",
    paymentMethod: PaymentMethod.CASH, paymentStatus: PaymentStatus.PAID,
    subtotal: 105.9, total: 105.9,
    notes: "Aniversario da mesa — parabens!",
    createdAt: daysAgo(0, -3),
    printConfirmed: true, printedAt: daysAgo(0, -3),
    items: [
      { productId: pFrangoCatupiry.id, quantity: 1, unitPrice: 65.0 },
      { productId: pTiramisu.id, quantity: 1, unitPrice: 21.0 },
      { productId: pPetitGateau.id, quantity: 1, unitPrice: 26.0 },
    ],
  });

  // 6. SAIU_PARA_ENTREGA
  const o6 = await makeOrder({
    orderNumber: 1006, customer: c6, status: OrderStatus.SAIU_PARA_ENTREGA,
    type: OrderType.DELIVERY,
    paymentMethod: PaymentMethod.PIX, paymentStatus: PaymentStatus.PAID,
    subtotal: 65.0, deliveryFee: 12.5, total: 77.5,
    deliveryAddress: { street: "Av. Republica do Libano", number: "331", district: "Ibirapuera", city: "Sao Paulo", state: "SP" },
    createdAt: daysAgo(0, -3),
    printConfirmed: true, printedAt: daysAgo(0, -3),
    items: [{ productId: pFrangoCatupiry.id, quantity: 1, unitPrice: 65.0, addons: { create: [{ addonId: aCatupiry.id, quantity: 1, unitPrice: 5.0 }] } }],
  });

  // 7. FINALIZADO — hoje, com desconto BEMVINDO15
  const o7 = await makeOrder({
    orderNumber: 1007, customer: c7, status: OrderStatus.FINALIZADO,
    type: OrderType.DELIVERY,
    paymentMethod: PaymentMethod.CREDIT_CARD, paymentStatus: PaymentStatus.PAID,
    subtotal: 92.0, discount: 13.8, deliveryFee: 9.9, total: 88.1,
    coupon: couponBemVindo,
    notes: "Tocar interfone apto 42",
    deliveryAddress: { street: "Rua Haddock Lobo", number: "595", district: "Cerqueira Cesar", city: "Sao Paulo", state: "SP" },
    createdAt: daysAgo(0),
    printConfirmed: true, printedAt: daysAgo(0),
    items: [
      { productId: pPepperoni.id, quantity: 1, unitPrice: 68.5 },
      { productId: pRefri.id, quantity: 2, unitPrice: 8.5 },
      { productId: pSuco.id, quantity: 1, unitPrice: 12.0 },
    ],
  });

  // 8. CANCELADO — cliente desistiu
  const o8 = await makeOrder({
    orderNumber: 1008, customer: c8, status: OrderStatus.CANCELADO,
    type: OrderType.DINE_IN, tableNumber: "08",
    paymentMethod: PaymentMethod.PIX, paymentStatus: PaymentStatus.PENDING,
    subtotal: 84.9, total: 84.9,
    notes: "Cliente desmarcou",
    createdAt: daysAgo(1),
    items: [{ productId: pTrufada.id, quantity: 1, unitPrice: 84.9 }],
  });

  // 9-15. Histórico (últimos 30 dias) — todos FINALIZADO para relatórios
  const o9 = await makeOrder({
    orderNumber: 1009, customer: c1, status: OrderStatus.FINALIZADO,
    type: OrderType.DINE_IN, tableNumber: "07",
    paymentMethod: PaymentMethod.PIX, paymentStatus: PaymentStatus.PAID,
    subtotal: 134.5, total: 134.5,
    createdAt: daysAgo(2),
    printConfirmed: true, printedAt: daysAgo(2),
    items: [
      { productId: p4Queijos.id, quantity: 1, unitPrice: 72.0 },
      { productId: pPortuguesa.id, quantity: 1, unitPrice: 70.0 },
    ],
  });

  const o10 = await makeOrder({
    orderNumber: 1010, customer: c2, status: OrderStatus.FINALIZADO,
    type: OrderType.DELIVERY,
    paymentMethod: PaymentMethod.CREDIT_CARD, paymentStatus: PaymentStatus.PAID,
    subtotal: 84.9, deliveryFee: 9.9, total: 94.8,
    deliveryAddress: { street: "Rua Augusta", number: "900", district: "Consolacao", city: "Sao Paulo", state: "SP" },
    createdAt: daysAgo(4),
    printConfirmed: true, printedAt: daysAgo(4),
    items: [{ productId: pTrufada.id, quantity: 1, unitPrice: 84.9 }],
  });

  const o11 = await makeOrder({
    orderNumber: 1011, customer: c3, status: OrderStatus.FINALIZADO,
    type: OrderType.TAKEOUT,
    paymentMethod: PaymentMethod.CASH, paymentStatus: PaymentStatus.PAID,
    subtotal: 170.5, total: 170.5,
    notes: "Retirada confirmada pelo telefone",
    createdAt: daysAgo(6),
    printConfirmed: true, printedAt: daysAgo(6),
    items: [
      { productId: pMargherita.id, quantity: 1, unitPrice: 62.9 },
      { productId: pPepperoni.id, quantity: 1, unitPrice: 68.5 },
      { productId: pTiramisu.id, quantity: 1, unitPrice: 21.0 },
      { productId: pPetitGateau.id, quantity: 1, unitPrice: 26.0 },
    ],
  });

  const o12 = await makeOrder({
    orderNumber: 1012, customer: c9, status: OrderStatus.FINALIZADO,
    type: OrderType.DINE_IN, tableNumber: "11",
    paymentMethod: PaymentMethod.DEBIT_CARD, paymentStatus: PaymentStatus.PAID,
    subtotal: 77.0, total: 77.0,
    createdAt: daysAgo(10),
    printConfirmed: true, printedAt: daysAgo(10),
    items: [
      { productId: pFrangoCatupiry.id, quantity: 1, unitPrice: 65.0 },
      { productId: pLimonada.id, quantity: 1, unitPrice: 14.9 },
    ],
  });

  const o13 = await makeOrder({
    orderNumber: 1013, customer: c10, status: OrderStatus.FINALIZADO,
    type: OrderType.DELIVERY,
    paymentMethod: PaymentMethod.PIX, paymentStatus: PaymentStatus.PAID,
    subtotal: 62.9, deliveryFee: 6.9, total: 69.8,
    deliveryAddress: { street: "Av. Paulista", number: "1578", district: "Bela Vista", city: "Sao Paulo", state: "SP" },
    createdAt: daysAgo(14),
    printConfirmed: true, printedAt: daysAgo(14),
    items: [{ productId: pMargherita.id, quantity: 1, unitPrice: 62.9 }],
  });

  const o14 = await makeOrder({
    orderNumber: 1014, customer: c5, status: OrderStatus.FINALIZADO,
    type: OrderType.DINE_IN, tableNumber: "02",
    paymentMethod: PaymentMethod.PIX, paymentStatus: PaymentStatus.PAID,
    subtotal: 93.5, total: 93.5,
    createdAt: daysAgo(20),
    printConfirmed: true, printedAt: daysAgo(20),
    items: [
      { productId: pPortuguesa.id, quantity: 1, unitPrice: 70.0, addons: { create: [{ addonId: aAzeitona.id, quantity: 1, unitPrice: 3.0 }] } },
      { productId: pSorvete.id, quantity: 1, unitPrice: 14.0 },
    ],
  });

  const o15 = await makeOrder({
    orderNumber: 1015, customer: c6, status: OrderStatus.FINALIZADO,
    type: OrderType.DELIVERY,
    paymentMethod: PaymentMethod.CREDIT_CARD, paymentStatus: PaymentStatus.PAID,
    subtotal: 140.9, discount: 20, deliveryFee: 11.9, total: 132.8,
    coupon: couponNoite,
    deliveryAddress: { street: "Rua Funchal", number: "411", district: "Vila Olimpia", city: "Sao Paulo", state: "SP" },
    createdAt: daysAgo(28),
    printConfirmed: true, printedAt: daysAgo(28),
    items: [
      { productId: p4Queijos.id, quantity: 1, unitPrice: 72.0, addons: { create: [{ addonId: aBordaRecheada.id, quantity: 1, unitPrice: 9.9 }] } },
      { productId: pPepperoni.id, quantity: 1, unitPrice: 68.5 },
    ],
  });

  // ── NPS Responses ────────────────────────────────────────────────
  const finalizedOrders = [o7, o9, o10, o11, o12, o13, o14, o15];
  const npsData = [
    { order: o7, customer: c7, score: 10, comment: "Entrega rapida e pizza excelente! Voltarei sempre." },
    { order: o9, customer: c1, score: 9, comment: "Muito bom, porcao generosa." },
    { order: o10, customer: c2, score: 9, comment: "Adorei a Trufada, sofisticada e saborosa." },
    { order: o11, customer: c3, score: 7, comment: "Bom, mas demorou um pouco mais do que esperava." },
    { order: o12, customer: c9, score: 8, comment: "Frango com catupiry estava otimo." },
    { order: o13, customer: c10, score: 7, comment: "Gostei, mas a embalagem chegou um pouco amassada." },
    { order: o14, customer: c5, score: 5, comment: "Pizza gelou antes de chegar. Esperava mais." },
    { order: o15, customer: c6, score: 3, comment: "Errou o pedido, veio diferente do solicitado." },
    { order: o7, customer: c7, score: 10, comment: null },
    { order: o11, customer: c3, score: 6, comment: "Segunda vez: desta vez a massa veio crua no centro." },
  ];

  await prisma.npsResponse.createMany({
    data: npsData.map(({ order, customer, score, comment }) => ({
      restaurantId: rId,
      orderId: order.id,
      customerId: customer.id,
      score,
      comment,
    })),
  });

  // ── Finance Entries (últimos 30 dias) ────────────────────────────
  const financeRevenues = [
    { order: o7, amount: 88.1, method: PaymentMethod.CREDIT_CARD, desc: "Pedido #1007", daysBack: 0 },
    { order: o9, amount: 134.5, method: PaymentMethod.PIX, desc: "Pedido #1009", daysBack: 2 },
    { order: o10, amount: 94.8, method: PaymentMethod.CREDIT_CARD, desc: "Pedido #1010", daysBack: 4 },
    { order: o11, amount: 170.5, method: PaymentMethod.CASH, desc: "Pedido #1011", daysBack: 6 },
    { order: o12, amount: 77.0, method: PaymentMethod.DEBIT_CARD, desc: "Pedido #1012", daysBack: 10 },
    { order: o13, amount: 69.8, method: PaymentMethod.PIX, desc: "Pedido #1013", daysBack: 14 },
    { order: o14, amount: 93.5, method: PaymentMethod.PIX, desc: "Pedido #1014", daysBack: 20 },
    { order: o15, amount: 132.8, method: PaymentMethod.CREDIT_CARD, desc: "Pedido #1015", daysBack: 28 },
  ];

  await prisma.financeEntry.createMany({
    data: [
      // Receitas de pedidos
      ...financeRevenues.map(({ order, amount, method, desc, daysBack }) => ({
        restaurantId: rId, type: EntryType.REVENUE, category: "VENDAS",
        description: desc, amount, date: daysAgo(daysBack),
        paymentMethod: method, orderId: order.id, userId: users.cashier.id,
      })),
      // Despesas: Insumos (semanais)
      { restaurantId: rId, type: EntryType.EXPENSE, category: "INSUMOS", description: "Compra semanal — Farinha e Queijos", amount: 1240.0, date: daysAgo(1), paymentMethod: PaymentMethod.PIX, userId: users.manager.id },
      { restaurantId: rId, type: EntryType.EXPENSE, category: "INSUMOS", description: "Compra semanal — Carnes e Embutidos", amount: 980.0, date: daysAgo(8), paymentMethod: PaymentMethod.PIX, userId: users.manager.id },
      { restaurantId: rId, type: EntryType.EXPENSE, category: "INSUMOS", description: "Compra semanal — Bebidas", amount: 430.0, date: daysAgo(15), paymentMethod: PaymentMethod.CASH, userId: users.manager.id },
      { restaurantId: rId, type: EntryType.EXPENSE, category: "INSUMOS", description: "Reposicao hortifruti", amount: 280.0, date: daysAgo(22), paymentMethod: PaymentMethod.PIX, userId: users.manager.id },
      // Despesas: Operacional
      { restaurantId: rId, type: EntryType.EXPENSE, category: "OPERACIONAL", description: "Gas cozinha", amount: 280.0, date: daysAgo(5), paymentMethod: PaymentMethod.CASH, userId: users.manager.id },
      { restaurantId: rId, type: EntryType.EXPENSE, category: "OPERACIONAL", description: "Energia eletrica", amount: 1850.0, date: daysAgo(12), paymentMethod: PaymentMethod.PIX, userId: users.manager.id },
      { restaurantId: rId, type: EntryType.EXPENSE, category: "OPERACIONAL", description: "Agua e esgoto", amount: 420.0, date: daysAgo(12), paymentMethod: PaymentMethod.PIX, userId: users.manager.id },
      // Despesas: Folha
      { restaurantId: rId, type: EntryType.EXPENSE, category: "FOLHA", description: "Folha de pagamento — quinzena 1", amount: 4800.0, date: daysAgo(15), paymentMethod: PaymentMethod.PIX, userId: users.manager.id },
      { restaurantId: rId, type: EntryType.EXPENSE, category: "FOLHA", description: "Folha de pagamento — quinzena 2", amount: 4800.0, date: daysAgo(1), paymentMethod: PaymentMethod.PIX, userId: users.manager.id },
      // Despesas: Marketing
      { restaurantId: rId, type: EntryType.EXPENSE, category: "MARKETING", description: "Impulsionamento Instagram", amount: 350.0, date: daysAgo(7), paymentMethod: PaymentMethod.CREDIT_CARD, userId: users.manager.id },
      // Despesas: Manutenção
      { restaurantId: rId, type: EntryType.EXPENSE, category: "MANUTENCAO", description: "Revisao forno a lenha", amount: 650.0, date: daysAgo(18), paymentMethod: PaymentMethod.CASH, userId: users.manager.id },
    ],
  });

  // ── Cash Register ────────────────────────────────────────────────
  // Caixa aberto hoje com R$200,00 inicial
  const cashRegister = await prisma.cashRegister.create({
    data: {
      restaurantId: rId,
      userId: users.cashier.id,
      openedAt: daysAgo(0),
      initialAmount: 200.0,
      status: "OPEN",
      openNotes: "Troco inicial do dia",
    },
  });

  // Transações de vendas (simulando vendas do dia)
  await prisma.cashTransaction.createMany({
    data: [
      { registerId: cashRegister.id, type: "SALE", amount: 85.0, paymentMethod: PaymentMethod.CASH, description: "Venda balcão", userId: users.cashier.id, createdAt: daysAgo(0) },
      { registerId: cashRegister.id, type: "SALE", amount: 120.5, paymentMethod: PaymentMethod.PIX, description: "Venda delivery", userId: users.cashier.id, createdAt: daysAgo(0) },
      { registerId: cashRegister.id, type: "SALE", amount: 45.0, paymentMethod: PaymentMethod.CASH, description: "Venda balcão", userId: users.cashier.id, createdAt: daysAgo(0) },
      { registerId: cashRegister.id, type: "SALE", amount: 95.0, paymentMethod: PaymentMethod.DEBIT_CARD, description: "Venda mesa 5", userId: users.cashier.id, createdAt: daysAgo(0) },
      { registerId: cashRegister.id, type: "SALE", amount: 150.0, paymentMethod: PaymentMethod.CREDIT_CARD, description: "Venda mesa 3", userId: users.cashier.id, createdAt: daysAgo(0) },
      // Sangria
      { registerId: cashRegister.id, type: "WITHDRAWAL", amount: 100.0, paymentMethod: PaymentMethod.CASH, description: "Depósito bancário", userId: users.manager.id, createdAt: daysAgo(0) },
      // Suprimento
      { registerId: cashRegister.id, type: "SUPPLY", amount: 50.0, paymentMethod: PaymentMethod.CASH, description: "Reforço de troco", userId: users.cashier.id, createdAt: daysAgo(0) },
      // Mais vendas
      { registerId: cashRegister.id, type: "SALE", amount: 75.0, paymentMethod: PaymentMethod.PIX, description: "Venda delivery", userId: users.cashier.id, createdAt: daysAgo(0) },
      { registerId: cashRegister.id, type: "SALE", amount: 60.0, paymentMethod: PaymentMethod.CASH, description: "Venda balcão", userId: users.cashier.id, createdAt: daysAgo(0) },
    ],
  });

  // ── Customer totals (calculados manualmente do histórico) ────────
  await Promise.all([
    prisma.customer.update({ where: { id: c1.id }, data: { totalOrders: 3, totalSpent: 284.4 } }),
    prisma.customer.update({ where: { id: c2.id }, data: { totalOrders: 2, totalSpent: 183.2 } }),
    prisma.customer.update({ where: { id: c3.id }, data: { totalOrders: 2, totalSpent: 255.4 } }),
    prisma.customer.update({ where: { id: c4.id }, data: { totalOrders: 1, totalSpent: 136.9 } }),
    prisma.customer.update({ where: { id: c5.id }, data: { totalOrders: 2, totalSpent: 199.4 } }),
    prisma.customer.update({ where: { id: c6.id }, data: { totalOrders: 2, totalSpent: 210.3 } }),
    prisma.customer.update({ where: { id: c7.id }, data: { totalOrders: 1, totalSpent: 88.1 } }),
    prisma.customer.update({ where: { id: c8.id }, data: { totalOrders: 0, totalSpent: 0 } }),
    prisma.customer.update({ where: { id: c9.id }, data: { totalOrders: 1, totalSpent: 77.0 } }),
    prisma.customer.update({ where: { id: c10.id }, data: { totalOrders: 1, totalSpent: 69.8 } }),
  ]);

  console.log("[seed] done ✓");
  console.log(`[seed] restaurant: ${DEMO_NAME} (${DEMO_SLUG}) — id: ${rId}`);
  console.log("[seed] users:");
  console.log("  owner@chamou.demo   / Owner123!");
  console.log("  manager@chamou.demo / Manager123!");
  console.log("  waiter@chamou.demo  / Waiter123!");
  console.log("  kitchen@chamou.demo / Kitchen123!");
  console.log("  cashier@chamou.demo / Cashier123!");
  console.log("[seed] pedidos: 15 (todos os status representados)");
  console.log("[seed] caixa: 1 aberto com R$200 inicial + 9 transações");
  console.log("[seed] estoque: 2 itens abaixo do minimo (alertas)");
  console.log("[seed] NPS: 10 respostas (3 detratores · 4 passivos · 3 promotores)");
}

main()
  .catch((error) => {
    console.error("[seed] failed:", error.message);
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
