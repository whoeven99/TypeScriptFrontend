-- CreateTable
CREATE TABLE "Currency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "currencyName" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "rounding" TEXT,
    "exchangeRate" TEXT,
    "primaryStatus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "currencyCode" TEXT NOT NULL PRIMARY KEY,
    "rate" REAL NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'EUR',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_shop_currencyCode_key" ON "Currency"("shop", "currencyCode");

-- CreateIndex
CREATE INDEX "Currency_shop_idx" ON "Currency"("shop");

-- CreateIndex
CREATE INDEX "Currency_shop_primaryStatus_idx" ON "Currency"("shop", "primaryStatus");
