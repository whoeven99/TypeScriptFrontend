-- AlterTable: language-level coverage summary on ShopTargetLocale (Turso authority)
ALTER TABLE "ShopTargetLocale" ADD COLUMN "coverageTranslated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopTargetLocale" ADD COLUMN "coverageTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopTargetLocale" ADD COLUMN "coveragePercent" INTEGER;
ALTER TABLE "ShopTargetLocale" ADD COLUMN "coverageUpdatedAt" DATETIME;
ALTER TABLE "ShopTargetLocale" ADD COLUMN "coverageSource" TEXT;
