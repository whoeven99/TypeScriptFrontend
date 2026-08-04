-- CreateTable
CREATE TABLE "CreditUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "referenceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditUsage_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditUsage_referenceId_key" ON "CreditUsage"("referenceId");

-- CreateIndex
CREATE INDEX "CreditUsage_shop_createdAt_idx" ON "CreditUsage"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "CreditUsage_source_createdAt_idx" ON "CreditUsage"("source", "createdAt");
