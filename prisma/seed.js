/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, SubscriptionStatus, OrderStatus, OrderType, PaymentMethod, PaymentStatus, MovementType, EntryType, UserRole } = require("@prisma/client");
const { hash } = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function upsertUser({ name, email, password }) {
  const passwordHash = await hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
    },
    create: {
      name,
      email,
      passwordHash,
    },
  });
}

async function main() {
  const seedMeta = {
    restaurantSlug: "garfou-demo-max",
    restaurantName: "Garfou Prime Bistrô",
  };

  console.log("[seed] starting...");

  const existingRestaurant = await prisma.restaurant.findUnique({
    where: { slug: seedMeta.restaurantSlug },
    select: { id: true },
  });

  if (existingRestaurant) {
    console.log("[seed] cleaning previous demo restaurant...");
    await prisma.restaurant.delete({ where: { id: existingRestaurant.id } });
  }

  const users = {
    owner: await upsertUser({
      name: "Alice Donati",
      email: "owner@garfou.demo",
      password: "Owner123!",
    }),
    manager: await upsertUser({
      name: "Bruno Silveira",
      email: "manager@garfou.demo",
      password: "Manager123!",
    }),
    waiter: await upsertUser({
      name: "Carla Souza",
      email: "waiter@garfou.demo",
      password: "Waiter123!",
    }),
    kitchen: await upsertUser({
      name: "Diego Lima",
      email: "kitchen@garfou.demo",
      password: "Kitchen123!",
    }),
    cashier: await upsertUser({
      name: "Eva Rocha",
      email: "cashier@garfou.demo",
      password: "Cashier123!",
    }),
  };

  const restaurant = await prisma.restaurant.create({
    data: {
      name: seedMeta.restaurantName,
      slug: seedMeta.restaurantSlug,
      logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
      phone: "+55 11 93333-4444",
      address: "Rua das Palmeiras, 245",
      city: "Sao Paulo",
      state: "SP",
      isOpen: true,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      stripeCustomerId: "cus_demo_garfou_prime",
      stripeSubscriptionId: "sub_demo_garfou_enterprise",
      trialEndsAt: new Date("2027-01-01T00:00:00.000Z"),
      settings: {
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

  await prisma.userRestaurant.createMany({
    data: [
      { userId: users.owner.id, restaurantId: restaurant.id, role: UserRole.OWNER },
      { userId: users.manager.id, restaurantId: restaurant.id, role: UserRole.MANAGER },
      { userId: users.waiter.id, restaurantId: restaurant.id, role: UserRole.WAITER },
      { userId: users.kitchen.id, restaurantId: restaurant.id, role: UserRole.KITCHEN },
      { userId: users.cashier.id, restaurantId: restaurant.id, role: UserRole.CASHIER },
    ],
  });

  const [pizzaCategory, drinksCategory, dessertsCategory] = await Promise.all([
    prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: "Pizzas Artesanais",
        description: "Fermentacao natural 48h",
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: "Bebidas",
        description: "Sem alcool e autorais",
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: "Sobremesas",
        description: "Finalizacao da casa",
        sortOrder: 3,
      },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: pizzaCategory.id,
        name: "Pizza Margherita",
        description: "Mussarela de bufala, manjericao e molho italiano",
        price: 62.9,
        sortOrder: 1,
        isFeatured: true,
        preparationTime: 18,
        costPrice: 24.0,
      },
    }),
    prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: pizzaCategory.id,
        name: "Pizza Pepperoni",
        description: "Pepperoni premium e blend de queijos",
        price: 68.5,
        sortOrder: 2,
        isFeatured: true,
        preparationTime: 20,
        costPrice: 27.5,
      },
    }),
    prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: pizzaCategory.id,
        name: "Pizza Trufada da Casa",
        description: "Cogumelos frescos e azeite trufado",
        price: 84.9,
        sortOrder: 3,
        isInternalOnly: false,
        preparationTime: 24,
        costPrice: 33.9,
      },
    }),
    prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: drinksCategory.id,
        name: "Limonada Siciliana",
        description: "Feita na hora",
        price: 14.9,
        sortOrder: 1,
        preparationTime: 4,
        costPrice: 4.2,
      },
    }),
    prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: drinksCategory.id,
        name: "Refrigerante Lata",
        description: "350ml",
        price: 8.5,
        sortOrder: 2,
        preparationTime: 1,
        costPrice: 3.2,
      },
    }),
    prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: dessertsCategory.id,
        name: "Tiramisu",
        description: "Receita italiana",
        price: 21.0,
        sortOrder: 1,
        isFeatured: true,
        preparationTime: 6,
        costPrice: 8.5,
      },
    }),
  ]);

  const margherita = products[0];
  const pepperoni = products[1];
  const trufada = products[2];
  const limonada = products[3];
  const refrigerante = products[4];
  const tiramisu = products[5];

  const addons = await Promise.all([
    prisma.productAddon.create({
      data: {
        restaurantId: restaurant.id,
        productId: margherita.id,
        name: "Borda recheada",
        price: 9.9,
        maxQuantity: 1,
      },
    }),
    prisma.productAddon.create({
      data: {
        restaurantId: restaurant.id,
        productId: margherita.id,
        name: "Extra mussarela",
        price: 7.5,
        maxQuantity: 2,
      },
    }),
    prisma.productAddon.create({
      data: {
        restaurantId: restaurant.id,
        productId: pepperoni.id,
        name: "Pepperoni extra",
        price: 8.9,
        maxQuantity: 2,
      },
    }),
    prisma.productAddon.create({
      data: {
        restaurantId: restaurant.id,
        productId: trufada.id,
        name: "Lasca de parmesao",
        price: 6.5,
        maxQuantity: 2,
      },
    }),
  ]);

  const [customer1, customer2, customer3] = await Promise.all([
    prisma.customer.create({
      data: {
        restaurantId: restaurant.id,
        name: "Guilherme Matos",
        phone: "+55 11 97777-1111",
        email: "guilherme.cliente@demo.com",
        notes: "Cliente frequente, prefere massa fina",
      },
    }),
    prisma.customer.create({
      data: {
        restaurantId: restaurant.id,
        name: "Marina Costa",
        phone: "+55 11 97777-2222",
        email: "marina.cliente@demo.com",
      },
    }),
    prisma.customer.create({
      data: {
        restaurantId: restaurant.id,
        name: "Rafael Prado",
        phone: "+55 11 97777-3333",
        email: "rafael.cliente@demo.com",
      },
    }),
  ]);

  const [coupon1, coupon2] = await Promise.all([
    prisma.coupon.create({
      data: {
        restaurantId: restaurant.id,
        code: "BEMVINDO15",
        type: "PERCENTAGE",
        value: 15,
        minOrderValue: 70,
        maxUses: 100,
        isFirstOrderOnly: true,
        expiresAt: new Date("2026-12-31T23:59:59.000Z"),
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        restaurantId: restaurant.id,
        code: "NOITE20",
        type: "FIXED_AMOUNT",
        value: 20,
        minOrderValue: 120,
        maxUses: 200,
        isFirstOrderOnly: false,
        expiresAt: new Date("2026-12-31T23:59:59.000Z"),
        isActive: true,
      },
    }),
  ]);

  await prisma.operatingHours.createMany({
    data: [
      { restaurantId: restaurant.id, dayOfWeek: 0, openTime: "18:00", closeTime: "23:00", isClosed: false },
      { restaurantId: restaurant.id, dayOfWeek: 1, openTime: "11:30", closeTime: "23:00", isClosed: false },
      { restaurantId: restaurant.id, dayOfWeek: 2, openTime: "11:30", closeTime: "23:00", isClosed: false },
      { restaurantId: restaurant.id, dayOfWeek: 3, openTime: "11:30", closeTime: "23:00", isClosed: false },
      { restaurantId: restaurant.id, dayOfWeek: 4, openTime: "11:30", closeTime: "23:30", isClosed: false },
      { restaurantId: restaurant.id, dayOfWeek: 5, openTime: "11:30", closeTime: "23:30", isClosed: false },
      { restaurantId: restaurant.id, dayOfWeek: 6, openTime: "12:00", closeTime: "23:30", isClosed: false },
    ],
  });

  await prisma.deliveryZone.createMany({
    data: [
      { restaurantId: restaurant.id, name: "Centro", fee: 6.9, estimatedMinutes: 25, isActive: true },
      { restaurantId: restaurant.id, name: "Jardins", fee: 9.9, estimatedMinutes: 35, isActive: true },
      { restaurantId: restaurant.id, name: "Vila Mariana", fee: 12.5, estimatedMinutes: 40, isActive: true },
    ],
  });

  const [itemFlour, itemCheese, itemPepperoni, itemTomatoSauce, itemLemon] = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        restaurantId: restaurant.id,
        name: "Farinha 00",
        unit: "kg",
        currentStock: 80,
        minimumStock: 15,
        averageCost: 5.4,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        restaurantId: restaurant.id,
        name: "Mussarela",
        unit: "kg",
        currentStock: 45,
        minimumStock: 10,
        averageCost: 32,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        restaurantId: restaurant.id,
        name: "Pepperoni",
        unit: "kg",
        currentStock: 24,
        minimumStock: 6,
        averageCost: 40,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        restaurantId: restaurant.id,
        name: "Molho de tomate",
        unit: "L",
        currentStock: 30,
        minimumStock: 8,
        averageCost: 9,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        restaurantId: restaurant.id,
        name: "Limao siciliano",
        unit: "un",
        currentStock: 120,
        minimumStock: 30,
        averageCost: 1.2,
      },
    }),
  ]);

  await prisma.inventoryMovement.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        itemId: itemFlour.id,
        type: MovementType.IN,
        quantity: 100,
        unitCost: 5.3,
        reason: "Compra semanal",
        userId: users.manager.id,
      },
      {
        restaurantId: restaurant.id,
        itemId: itemCheese.id,
        type: MovementType.IN,
        quantity: 50,
        unitCost: 31.8,
        reason: "Fornecedor principal",
        userId: users.manager.id,
      },
      {
        restaurantId: restaurant.id,
        itemId: itemPepperoni.id,
        type: MovementType.OUT,
        quantity: 6,
        unitCost: 40,
        reason: "Producao do dia",
        userId: users.kitchen.id,
      },
      {
        restaurantId: restaurant.id,
        itemId: itemTomatoSauce.id,
        type: MovementType.OUT,
        quantity: 4,
        unitCost: 9,
        reason: "Producao do dia",
        userId: users.kitchen.id,
      },
      {
        restaurantId: restaurant.id,
        itemId: itemLemon.id,
        type: MovementType.OUT,
        quantity: 22,
        unitCost: 1.2,
        reason: "Bebidas do turno",
        userId: users.kitchen.id,
      },
    ],
  });

  const order1 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 1001,
      customerId: customer1.id,
      waiterId: users.waiter.id,
      tableNumber: "12",
      type: OrderType.DINE_IN,
      status: OrderStatus.CONFIRMADO,
      subtotal: 86.3,
      discount: 0,
      deliveryFee: 0,
      total: 86.3,
      paymentMethod: PaymentMethod.PIX,
      paymentStatus: PaymentStatus.PAID,
      notes: "Sem cebola",
      printConfirmed: false,
      items: {
        create: [
          {
            productId: margherita.id,
            quantity: 1,
            unitPrice: 62.9,
            notes: "Massa fina",
            addons: {
              create: [
                { addonId: addons[0].id, quantity: 1, unitPrice: 9.9 },
                { addonId: addons[1].id, quantity: 1, unitPrice: 7.5 },
              ],
            },
          },
          {
            productId: limonada.id,
            quantity: 1,
            unitPrice: 14.9,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 1002,
      customerId: customer2.id,
      waiterId: users.waiter.id,
      type: OrderType.DELIVERY,
      status: OrderStatus.EM_PREPARO,
      subtotal: 92.0,
      discount: 13.8,
      deliveryFee: 9.9,
      total: 88.1,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      paymentStatus: PaymentStatus.PAID,
      notes: "Tocar interfone apto 82",
      deliveryAddress: {
        street: "Rua Augusta",
        number: "1450",
        district: "Consolacao",
        city: "Sao Paulo",
        state: "SP",
      },
      couponId: coupon1.id,
      printConfirmed: true,
      printedAt: new Date(),
      items: {
        create: [
          {
            productId: pepperoni.id,
            quantity: 1,
            unitPrice: 68.5,
            addons: {
              create: [
                { addonId: addons[2].id, quantity: 1, unitPrice: 8.9 },
              ],
            },
          },
          {
            productId: refrigerante.id,
            quantity: 2,
            unitPrice: 8.5,
          },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 1003,
      customerId: customer3.id,
      waiterId: users.waiter.id,
      tableNumber: "05",
      type: OrderType.DINE_IN,
      status: OrderStatus.PRONTO,
      subtotal: 105.9,
      discount: 20,
      deliveryFee: 0,
      total: 85.9,
      paymentMethod: PaymentMethod.DEBIT_CARD,
      paymentStatus: PaymentStatus.PAID,
      notes: "Comemorar aniversario",
      couponId: coupon2.id,
      printConfirmed: true,
      printedAt: new Date(),
      items: {
        create: [
          {
            productId: trufada.id,
            quantity: 1,
            unitPrice: 84.9,
            addons: {
              create: [
                { addonId: addons[3].id, quantity: 1, unitPrice: 6.5 },
              ],
            },
          },
          {
            productId: tiramisu.id,
            quantity: 1,
            unitPrice: 21.0,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 1004,
      customerId: customer1.id,
      waiterId: users.waiter.id,
      type: OrderType.TAKEOUT,
      status: OrderStatus.NOVO_PEDIDO,
      subtotal: 68.5,
      discount: 0,
      deliveryFee: 0,
      total: 68.5,
      paymentMethod: PaymentMethod.PIX,
      paymentStatus: PaymentStatus.PENDING,
      printConfirmed: false,
      items: {
        create: [
          {
            productId: pepperoni.id,
            quantity: 1,
            unitPrice: 68.5,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: 1005,
      customerId: customer2.id,
      waiterId: users.waiter.id,
      type: OrderType.DELIVERY,
      status: OrderStatus.FINALIZADO,
      subtotal: 77.8,
      discount: 0,
      deliveryFee: 7.5,
      total: 85.3,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
      printConfirmed: true,
      printedAt: new Date(),
      deliveryAddress: {
        street: "Av. Paulista",
        number: "1000",
        district: "Bela Vista",
        city: "Sao Paulo",
        state: "SP",
      },
      items: {
        create: [
          {
            productId: margherita.id,
            quantity: 1,
            unitPrice: 62.9,
          },
          {
            productId: limonada.id,
            quantity: 1,
            unitPrice: 14.9,
          },
        ],
      },
    },
  });

  await prisma.npsResponse.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        orderId: order2.id,
        customerId: customer2.id,
        score: 10,
        comment: "Entrega rapida e pizza excelente.",
      },
      {
        restaurantId: restaurant.id,
        orderId: order3.id,
        customerId: customer3.id,
        score: 8,
        comment: "Muito bom, so achei o ponto um pouco acima.",
      },
    ],
  });

  await prisma.financeEntry.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        type: EntryType.REVENUE,
        category: "VENDAS",
        description: "Pedido #1001",
        amount: 86.3,
        date: new Date(),
        paymentMethod: PaymentMethod.PIX,
        orderId: order1.id,
        userId: users.cashier.id,
      },
      {
        restaurantId: restaurant.id,
        type: EntryType.REVENUE,
        category: "VENDAS",
        description: "Pedido #1002",
        amount: 88.1,
        date: new Date(),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        orderId: order2.id,
        userId: users.cashier.id,
      },
      {
        restaurantId: restaurant.id,
        type: EntryType.REVENUE,
        category: "VENDAS",
        description: "Pedido #1003",
        amount: 85.9,
        date: new Date(),
        paymentMethod: PaymentMethod.DEBIT_CARD,
        orderId: order3.id,
        userId: users.cashier.id,
      },
      {
        restaurantId: restaurant.id,
        type: EntryType.EXPENSE,
        category: "INSUMOS",
        description: "Compra semanal de insumos",
        amount: 1240.0,
        date: new Date(),
        paymentMethod: PaymentMethod.PIX,
        userId: users.manager.id,
      },
      {
        restaurantId: restaurant.id,
        type: EntryType.EXPENSE,
        category: "OPERACIONAL",
        description: "Gas cozinha",
        amount: 280.0,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        userId: users.manager.id,
      },
    ],
  });

  await prisma.customer.update({
    where: { id: customer1.id },
    data: { totalOrders: 2, totalSpent: 171.6 },
  });

  await prisma.customer.update({
    where: { id: customer2.id },
    data: { totalOrders: 2, totalSpent: 173.4 },
  });

  await prisma.customer.update({
    where: { id: customer3.id },
    data: { totalOrders: 1, totalSpent: 85.9 },
  });

  console.log("[seed] done");
  console.log("[seed] restaurant:", restaurant.name, `(${restaurant.slug})`);
  console.log("[seed] users:");
  console.log("  owner@garfou.demo / Owner123!");
  console.log("  manager@garfou.demo / Manager123!");
  console.log("  waiter@garfou.demo / Waiter123!");
  console.log("  kitchen@garfou.demo / Kitchen123!");
  console.log("  cashier@garfou.demo / Cashier123!");
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
