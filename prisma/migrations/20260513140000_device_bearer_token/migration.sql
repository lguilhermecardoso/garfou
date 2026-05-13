-- AlterTable: Add bearerToken to device_sessions
ALTER TABLE "device_sessions" ADD COLUMN "bearerToken" TEXT;

-- CreateIndex: Unique index on bearerToken for fast lookups
CREATE UNIQUE INDEX "device_sessions_bearerToken_key" ON "device_sessions"("bearerToken");

-- CreateIndex: Index for active bearer tokens
CREATE INDEX "device_sessions_bearerToken_isActive_idx" ON "device_sessions"("bearerToken", "isActive");
