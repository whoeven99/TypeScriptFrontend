-- CreateTable
CREATE TABLE "UserPicture" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "imageBeforeUrl" TEXT NOT NULL,
    "imageAfterUrl" TEXT,
    "altBeforeTranslation" TEXT,
    "altAfterTranslation" TEXT,
    "languageCode" TEXT NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPicture_shop_imageId_imageBeforeUrl_languageCode_key" ON "UserPicture"("shop", "imageId", "imageBeforeUrl", "languageCode");

-- CreateIndex
CREATE INDEX "UserPicture_shop_languageCode_isDelete_idx" ON "UserPicture"("shop", "languageCode", "isDelete");

-- CreateIndex
CREATE INDEX "UserPicture_shop_imageId_languageCode_isDelete_idx" ON "UserPicture"("shop", "imageId", "languageCode", "isDelete");

-- CreateIndex
CREATE INDEX "UserPicture_shop_isDelete_idx" ON "UserPicture"("shop", "isDelete");
