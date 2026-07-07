-- AlterTable
ALTER TABLE "Glossary" ADD COLUMN "createdBy" TEXT;

-- CreateTable
CREATE TABLE "ShopProfile" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT,
    "primaryLocale" TEXT,
    "industry" TEXT,
    "keywords" JSONB,
    "description" TEXT,
    "brandTone" TEXT,
    "aiModel" TEXT,
    "lastScanId" TEXT,
    "lastScannedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
