-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "client" TEXT;

-- CreateIndex
CREATE INDEX "AuthSession_client_idx" ON "AuthSession"("client");
