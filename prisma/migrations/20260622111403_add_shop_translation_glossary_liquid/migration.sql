-- CreateTable
CREATE TABLE "ShopTranslationSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "primaryLocale" TEXT NOT NULL,
    "targets" JSONB NOT NULL,
    "autoTranslate" BOOLEAN NOT NULL DEFAULT false,
    "migratedToTsf" BOOLEAN NOT NULL DEFAULT false,
    "migratedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Glossary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "rangeCode" TEXT,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LiquidRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "beforeTranslation" TEXT NOT NULL,
    "afterTranslation" TEXT NOT NULL,
    "languageCode" TEXT,
    "replacementMethod" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ShopTranslationSettings_autoTranslate_migratedToTsf_idx" ON "ShopTranslationSettings"("autoTranslate", "migratedToTsf");

-- CreateIndex
CREATE INDEX "Glossary_shop_idx" ON "Glossary"("shop");

-- CreateIndex
CREATE INDEX "LiquidRule_shop_idx" ON "LiquidRule"("shop");
