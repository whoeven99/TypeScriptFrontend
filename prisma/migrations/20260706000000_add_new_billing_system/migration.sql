-- CreateTable
CREATE TABLE "ShopBillingBinding" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "billingSystem" TEXT NOT NULL,
    "boundReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "subscriptionCredits" INTEGER NOT NULL DEFAULT 0,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "trialCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlanCatalog" (
    "planKey" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "billingInterval" TEXT,
    "displayName" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceAmount" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "trialDays" INTEGER,
    "shopifyPlanName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppSubscription" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "planKey" TEXT NOT NULL,
    "shopifySubscriptionId" TEXT NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "creditsPerPeriod" INTEGER NOT NULL,
    "trialEndsAt" DATETIME,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelledAt" DATETIME,
    "rawPayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppSubscription_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "planKey" TEXT,
    "referenceId" TEXT,
    "creditsDelta" INTEGER,
    "usedCredits" INTEGER,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingLog_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountPeriodUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "appSubscriptionId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "usedCredits" INTEGER NOT NULL,
    "subscriptionCreditsAllocated" INTEGER NOT NULL,
    "purchasedCreditsRemaining" INTEGER NOT NULL DEFAULT 0,
    "trialCreditsRemaining" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountPeriodUsage_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Account" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ShopBillingBinding_billingSystem_idx" ON "ShopBillingBinding"("billingSystem");

-- CreateIndex
CREATE INDEX "PlanCatalog_enabled_sortOrder_idx" ON "PlanCatalog"("enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AppSubscription_shopifySubscriptionId_key" ON "AppSubscription"("shopifySubscriptionId");

-- CreateIndex
CREATE INDEX "AppSubscription_status_idx" ON "AppSubscription"("status");

-- CreateIndex
CREATE INDEX "BillingLog_shop_createdAt_idx" ON "BillingLog"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "BillingLog_eventType_createdAt_idx" ON "BillingLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "BillingLog_referenceId_idx" ON "BillingLog"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountPeriodUsage_appSubscriptionId_periodStart_periodEnd_key" ON "AccountPeriodUsage"("appSubscriptionId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AccountPeriodUsage_shop_periodEnd_idx" ON "AccountPeriodUsage"("shop", "periodEnd");

-- Seed: PlanCatalog（对齐 app.pricing 现有套餐 / 加量包 / 试用；幂等）
-- 订阅套餐（月付 + 年付；年付以折后月单价记录，实际扣费按 Shopify）
INSERT OR IGNORE INTO "PlanCatalog" ("planKey","kind","billingInterval","displayName","credits","priceAmount","currencyCode","trialDays","shopifyPlanName","sortOrder","enabled","createdAt","updatedAt") VALUES
  ('free','SUBSCRIPTION',NULL,'Free',0,'0','USD',NULL,'Free',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('basic-monthly','SUBSCRIPTION','MONTHLY','Basic',1500000,'7.99','USD',NULL,'Basic',10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('basic-annual','SUBSCRIPTION','ANNUAL','Basic - Yearly',1500000,'6.39','USD',NULL,'Basic',11,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pro-monthly','SUBSCRIPTION','MONTHLY','Pro',3000000,'19.99','USD',NULL,'Pro',20,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pro-annual','SUBSCRIPTION','ANNUAL','Pro - Yearly',3000000,'15.99','USD',NULL,'Pro',21,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('premium-monthly','SUBSCRIPTION','MONTHLY','Premium',8000000,'39.99','USD',NULL,'Premium',30,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('premium-annual','SUBSCRIPTION','ANNUAL','Premium - Yearly',8000000,'31.99','USD',NULL,'Premium',31,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- 内置试用：新用户安装赠送（结转、不随续费刷新）
INSERT OR IGNORE INTO "PlanCatalog" ("planKey","kind","billingInterval","displayName","credits","priceAmount","currencyCode","trialDays","shopifyPlanName","sortOrder","enabled","createdAt","updatedAt") VALUES
  ('trial-install','INTERNAL_TRIAL',NULL,'Install Trial Credits',200000,'0','USD',NULL,NULL,5,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- 一次性加量包（priceAmount 记 base 原价；实际扣费按 Shopify 动态定价）
INSERT OR IGNORE INTO "PlanCatalog" ("planKey","kind","billingInterval","displayName","credits","priceAmount","currencyCode","trialDays","shopifyPlanName","sortOrder","enabled","createdAt","updatedAt") VALUES
  ('pack-500k','ONE_TIME_PACK',NULL,'500K Credits',500000,'3.99','USD',NULL,'500K',100,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pack-1m','ONE_TIME_PACK',NULL,'1M Credits',1000000,'7.99','USD',NULL,'1M',101,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pack-2m','ONE_TIME_PACK',NULL,'2M Credits',2000000,'15.99','USD',NULL,'2M',102,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pack-3m','ONE_TIME_PACK',NULL,'3M Credits',3000000,'23.99','USD',NULL,'3M',103,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pack-5m','ONE_TIME_PACK',NULL,'5M Credits',5000000,'39.99','USD',NULL,'5M',104,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pack-10m','ONE_TIME_PACK',NULL,'10M Credits',10000000,'79.99','USD',NULL,'10M',105,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pack-20m','ONE_TIME_PACK',NULL,'20M Credits',20000000,'159.99','USD',NULL,'20M',106,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pack-30m','ONE_TIME_PACK',NULL,'30M Credits',30000000,'239.99','USD',NULL,'30M',107,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
