-- CreateTable
CREATE TABLE "TranslateV4JobUsage" (
    "jobId" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME,
    "status" TEXT NOT NULL,
    "taskSource" TEXT,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "usedTokens" INTEGER NOT NULL DEFAULT 0,
    "translateUnitDone" INTEGER NOT NULL DEFAULT 0,
    "sourceChars" INTEGER NOT NULL DEFAULT 0,
    "translateDone" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "TranslateV4JobUsage_shop_recordedAt_idx" ON "TranslateV4JobUsage"("shop", "recordedAt");

-- CreateIndex
CREATE INDEX "TranslateV4JobUsage_recordedAt_idx" ON "TranslateV4JobUsage"("recordedAt");
