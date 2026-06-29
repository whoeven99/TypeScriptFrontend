-- CreateTable
CREATE TABLE "SwitcherConfiguration" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "languageSelector" BOOLEAN NOT NULL DEFAULT true,
    "currencySelector" BOOLEAN NOT NULL DEFAULT true,
    "ipOpen" BOOLEAN NOT NULL DEFAULT false,
    "includedFlag" BOOLEAN NOT NULL DEFAULT true,
    "fontColor" TEXT NOT NULL DEFAULT '#000000',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "buttonColor" TEXT NOT NULL DEFAULT '#ffffff',
    "buttonBackgroundColor" TEXT NOT NULL DEFAULT '#000000',
    "optionBorderColor" TEXT NOT NULL DEFAULT '#ccc',
    "selectorPosition" TEXT NOT NULL DEFAULT 'bottom_left',
    "positionData" TEXT NOT NULL DEFAULT '10',
    "isTransparent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IpRedirection" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "languageCode" TEXT NOT NULL DEFAULT '',
    "currencyCode" TEXT NOT NULL DEFAULT '',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "IpRedirection_shop_isDeleted_idx" ON "IpRedirection"("shop", "isDeleted");

-- CreateIndex
CREATE INDEX "IpRedirection_shop_region_idx" ON "IpRedirection"("shop", "region");
