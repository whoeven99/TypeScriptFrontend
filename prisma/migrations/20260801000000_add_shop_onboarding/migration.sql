-- CreateTable: first-time translation onboarding state (one row per shop)
CREATE TABLE "ShopOnboarding" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "firstEnteredAt" DATETIME,
    "skippedAt" DATETIME,
    "completedAt" DATETIME,
    "startedTrialFromOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "createdFirstTaskFromOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "recommendedTargets" TEXT,
    "recommendedModules" TEXT,
    "estimateCredits" INTEGER,
    "estimateMinutes" INTEGER,
    "sourceScanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
