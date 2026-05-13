/*
  Warnings:

  - You are about to drop the column `createdBy` on the `device_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `device_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `pin` on the `device_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `device_sessions` table. All the data in the column will be lost.
  - Added the required column `tokenId` to the `device_sessions` table without a default value. This is not possible if the table is not empty.
  - Made the column `activatedAt` on table `device_sessions` required. This step will fail if there are existing NULL values in that column.

*/

-- Step 1: Create device_tokens table first
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");
CREATE INDEX "device_tokens_restaurantId_type_isActive_idx" ON "device_tokens"("restaurantId", "type", "isActive");
CREATE INDEX "device_tokens_token_isActive_idx" ON "device_tokens"("token", "isActive");

-- AddForeignKey for device_tokens
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 2: Migrate existing data - Create one token per (restaurantId, type) combination
INSERT INTO "device_tokens" ("id", "restaurantId", "token", "type", "isActive", "createdBy", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text AS id,
    "restaurantId",
    LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0') AS token, -- Generate random 6-digit token
    "type",
    true AS isActive,
    "createdBy",
    MIN("createdAt") AS createdAt,
    NOW() AS updatedAt
FROM "device_sessions"
WHERE "type" IS NOT NULL AND "restaurantId" IS NOT NULL
GROUP BY "restaurantId", "type", "createdBy";

-- Step 3: Clean up old device_sessions (we'll recreate them from scratch with new structure)
DELETE FROM "device_sessions";

-- Step 4: Now apply schema changes to device_sessions
-- DropForeignKey
ALTER TABLE "device_sessions" DROP CONSTRAINT "device_sessions_createdBy_fkey";
ALTER TABLE "device_sessions" DROP CONSTRAINT "device_sessions_restaurantId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "device_sessions_expiresAt_idx";
DROP INDEX IF EXISTS "device_sessions_restaurantId_pin_isActive_idx";
DROP INDEX IF EXISTS "device_sessions_restaurantId_type_isActive_idx";

-- AlterTable - remove old columns and add new ones
ALTER TABLE "device_sessions" 
DROP COLUMN IF EXISTS "createdBy",
DROP COLUMN IF EXISTS "expiresAt",
DROP COLUMN IF EXISTS "pin",
DROP COLUMN IF EXISTS "type",
ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "tokenId" TEXT;

-- Update activatedAt for any remaining NULL values (should be none after DELETE)
UPDATE "device_sessions" SET "activatedAt" = CURRENT_TIMESTAMP WHERE "activatedAt" IS NULL;

-- Make activatedAt required
ALTER TABLE "device_sessions" 
ALTER COLUMN "activatedAt" SET NOT NULL,
ALTER COLUMN "activatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Now make tokenId required (safe because table is empty)
ALTER TABLE "device_sessions" ALTER COLUMN "tokenId" SET NOT NULL;

-- CreateIndex for device_sessions
CREATE INDEX "device_sessions_tokenId_isActive_idx" ON "device_sessions"("tokenId", "isActive");
CREATE INDEX "device_sessions_restaurantId_isActive_idx" ON "device_sessions"("restaurantId", "isActive");
CREATE INDEX "device_sessions_lastSeenAt_idx" ON "device_sessions"("lastSeenAt");

-- Re-add foreign keys for device_sessions
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "device_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
