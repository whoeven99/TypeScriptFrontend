-- CreateTable
CREATE TABLE "PageFlyTranslation" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "PageFlyTranslation_shop_languageCode_isDeleted_idx" ON "PageFlyTranslation"("shop", "languageCode", "isDeleted");
