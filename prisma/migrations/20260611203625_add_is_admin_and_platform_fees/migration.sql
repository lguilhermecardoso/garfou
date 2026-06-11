-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "platform_fees" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "paymentMethod" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_fees_orderId_key" ON "platform_fees"("orderId");

-- CreateIndex
CREATE INDEX "platform_fees_restaurantId_idx" ON "platform_fees"("restaurantId");

-- CreateIndex
CREATE INDEX "platform_fees_collectedAt_idx" ON "platform_fees"("collectedAt");

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
