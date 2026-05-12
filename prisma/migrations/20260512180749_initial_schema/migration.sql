-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'WAITER', 'KITCHEN', 'CASHIER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID');

-- CreateEnum
CREATE TYPE "ModifierGroupType" AS ENUM ('INGREDIENT', 'ADDON', 'REQUIRED_CHOICE', 'REQUIRED_MULTI');

-- CreateEnum
CREATE TYPE "SplitPriceRule" AS ENUM ('HIGHEST', 'AVERAGE', 'SUM');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED');

-- CreateEnum
CREATE TYPE "TabStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEOUT', 'DELIVERY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NOVO_PEDIDO', 'AGUARDANDO_CONFIRMACAO', 'CONFIRMADO', 'EM_PREPARO', 'PRONTO', 'SAIU_PARA_ENTREGA', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('SALE', 'WITHDRAWAL', 'SUPPLY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_restaurants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WAITER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isInternalOnly" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomization" BOOLEAN NOT NULL DEFAULT false,
    "allowSplit" BOOLEAN NOT NULL DEFAULT false,
    "maxSplits" INTEGER NOT NULL DEFAULT 2,
    "splitPriceRule" "SplitPriceRule" NOT NULL DEFAULT 'HIGHEST',
    "preparationTime" INTEGER,
    "costPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_addons" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ModifierGroupType" NOT NULL,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_options" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_split_flavors" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "flavorProductId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_split_flavors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabs" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT,
    "customerId" TEXT,
    "guestCustomerName" TEXT,
    "openedBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "status" "TabStatus" NOT NULL DEFAULT 'OPEN',
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "tabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "tabId" TEXT,
    "customerId" TEXT,
    "waiterId" TEXT,
    "tableNumber" TEXT,
    "type" "OrderType" NOT NULL DEFAULT 'DINE_IN',
    "status" "OrderStatus" NOT NULL DEFAULT 'NOVO_PEDIDO',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "deliveryAddress" JSONB,
    "couponId" TEXT,
    "printedAt" TIMESTAMP(3),
    "printConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_addons" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_item_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_selected_options" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "optionName" TEXT NOT NULL,
    "isRemoval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_selected_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_splits" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "splitIndex" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" JSONB,
    "notes" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "paymentMethod" "PaymentMethod",
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_hours" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minOrderValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isFirstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_responses" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialAmount" DECIMAL(10,2) NOT NULL,
    "openNotes" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "declaredCash" DECIMAL(10,2),
    "declaredDebit" DECIMAL(10,2),
    "declaredCredit" DECIMAL(10,2),
    "declaredPix" DECIMAL(10,2),
    "expectedCash" DECIMAL(10,2),
    "expectedDebit" DECIMAL(10,2),
    "expectedCredit" DECIMAL(10,2),
    "expectedPix" DECIMAL(10,2),
    "cashDifference" DECIMAL(10,2),
    "debitDifference" DECIMAL(10,2),
    "creditDifference" DECIMAL(10,2),
    "pixDifference" DECIMAL(10,2),
    "closeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "type" "CashTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_restaurants_userId_restaurantId_key" ON "user_restaurants"("userId", "restaurantId");

-- CreateIndex
CREATE INDEX "categories_restaurantId_deletedAt_idx" ON "categories"("restaurantId", "deletedAt");

-- CreateIndex
CREATE INDEX "products_restaurantId_isActive_deletedAt_idx" ON "products"("restaurantId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "products_restaurantId_categoryId_idx" ON "products"("restaurantId", "categoryId");

-- CreateIndex
CREATE INDEX "modifier_groups_restaurantId_productId_deletedAt_idx" ON "modifier_groups"("restaurantId", "productId", "deletedAt");

-- CreateIndex
CREATE INDEX "modifier_options_restaurantId_groupId_deletedAt_idx" ON "modifier_options"("restaurantId", "groupId", "deletedAt");

-- CreateIndex
CREATE INDEX "product_split_flavors_restaurantId_sourceProductId_idx" ON "product_split_flavors"("restaurantId", "sourceProductId");

-- CreateIndex
CREATE UNIQUE INDEX "product_split_flavors_sourceProductId_flavorProductId_key" ON "product_split_flavors"("sourceProductId", "flavorProductId");

-- CreateIndex
CREATE INDEX "tables_restaurantId_status_isActive_idx" ON "tables"("restaurantId", "status", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tables_restaurantId_identifier_key" ON "tables"("restaurantId", "identifier");

-- CreateIndex
CREATE INDEX "tabs_restaurantId_status_createdAt_idx" ON "tabs"("restaurantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "tabs_restaurantId_tableId_status_idx" ON "tabs"("restaurantId", "tableId", "status");

-- CreateIndex
CREATE INDEX "tabs_restaurantId_customerId_status_idx" ON "tabs"("restaurantId", "customerId", "status");

-- CreateIndex
CREATE INDEX "orders_restaurantId_status_createdAt_idx" ON "orders"("restaurantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_restaurantId_printConfirmed_idx" ON "orders"("restaurantId", "printConfirmed");

-- CreateIndex
CREATE UNIQUE INDEX "orders_restaurantId_orderNumber_key" ON "orders"("restaurantId", "orderNumber");

-- CreateIndex
CREATE INDEX "order_item_selected_options_orderItemId_idx" ON "order_item_selected_options"("orderItemId");

-- CreateIndex
CREATE INDEX "order_item_splits_orderItemId_idx" ON "order_item_splits"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_splits_orderItemId_splitIndex_key" ON "order_item_splits"("orderItemId", "splitIndex");

-- CreateIndex
CREATE INDEX "customers_restaurantId_phone_idx" ON "customers"("restaurantId", "phone");

-- CreateIndex
CREATE INDEX "inventory_items_restaurantId_deletedAt_idx" ON "inventory_items"("restaurantId", "deletedAt");

-- CreateIndex
CREATE INDEX "inventory_movements_restaurantId_createdAt_idx" ON "inventory_movements"("restaurantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "finance_entries_restaurantId_date_idx" ON "finance_entries"("restaurantId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "operating_hours_restaurantId_dayOfWeek_key" ON "operating_hours"("restaurantId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_restaurantId_code_key" ON "coupons"("restaurantId", "code");

-- CreateIndex
CREATE INDEX "cash_registers_restaurantId_status_idx" ON "cash_registers"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "cash_registers_restaurantId_openedAt_idx" ON "cash_registers"("restaurantId", "openedAt");

-- CreateIndex
CREATE INDEX "cash_transactions_registerId_type_idx" ON "cash_transactions"("registerId", "type");

-- CreateIndex
CREATE INDEX "cash_transactions_registerId_createdAt_idx" ON "cash_transactions"("registerId", "createdAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restaurants" ADD CONSTRAINT "user_restaurants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restaurants" ADD CONSTRAINT "user_restaurants_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_split_flavors" ADD CONSTRAINT "product_split_flavors_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_split_flavors" ADD CONSTRAINT "product_split_flavors_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_split_flavors" ADD CONSTRAINT "product_split_flavors_flavorProductId_fkey" FOREIGN KEY ("flavorProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "tabs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "product_addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_selected_options" ADD CONSTRAINT "order_item_selected_options_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_selected_options" ADD CONSTRAINT "order_item_selected_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "modifier_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_splits" ADD CONSTRAINT "order_item_splits_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_splits" ADD CONSTRAINT "order_item_splits_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
