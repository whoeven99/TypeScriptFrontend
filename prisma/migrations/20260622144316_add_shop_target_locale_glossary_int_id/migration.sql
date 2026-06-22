/*
  Warnings:

  - The primary key for the `Glossary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Glossary` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- CreateTable
CREATE TABLE "ShopTargetLocale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "autoTranslate" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Glossary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "rangeCode" TEXT,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Glossary" ("caseSensitive", "createdAt", "rangeCode", "shop", "sourceText", "targetText", "status") SELECT "caseSensitive", "createdAt", "rangeCode", "shop", "sourceText", "targetText", 1 FROM "Glossary";
DROP TABLE "Glossary";
ALTER TABLE "new_Glossary" RENAME TO "Glossary";
CREATE INDEX "Glossary_shop_idx" ON "Glossary"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ShopTargetLocale_shop_autoTranslate_idx" ON "ShopTargetLocale"("shop", "autoTranslate");

-- CreateIndex
CREATE UNIQUE INDEX "ShopTargetLocale_shop_locale_key" ON "ShopTargetLocale"("shop", "locale");
