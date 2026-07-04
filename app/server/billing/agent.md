# TSF 计费模块约定（Phase 0+）

改动本目录、`app/server/taskTokenUsage/`、`app/server/onboarding/` 或计费 Webhook 前请先读本文档。

## 新/老用户分流

- **无** `BILLING_TSF_ENABLED` 环境变量。
- Turso 存在 `Account` 行 → `isTsfBillingShop(shop) === true` → 走 TSF 本地计费。
- 无 `Account` 行 → 仍走 Java Spring（`/quota/*`、`UserInitialization` 等）。
- 安装/init 分流见 `resolveAppInitPath`：已有 Account → TSF；Java 已有额度/订阅 → Java；全新安装 → TSF。

## 表职责

| 表 | 职责 |
|----|------|
| `Account` | 三池 token + `usedTokens` |
| `AppSubscription` | 当前 Shopify 订阅 |
| `PlanCatalog` | 套餐/购包目录（种子 `prisma/billing-plan-catalog-seed.sql`） |
| `AccountPeriodUsage` | 订阅周期归档 |
| `BillingLog` | 账务流水（含 `TRIAL_GRANTED` 幂等） |
| `TaskTokenUsageLog` | 翻译任务消耗明细（`taskType`: `manual` / `auto`） |
| `TokenBillingRule` | 翻译 LLM 乘数 |
| `ShopProfile` | 取代 Java `Users` 元数据 |
| `ShopLanguagePack` | 取代 Java `User_AILanguagePacks` |
| `CommonEventLog` | 安装/卸载（与 BillingLog 分表） |

## Token 模型

- 可用 = `subscriptionTokens + purchasedTokens + trialTokens`
- 周期内消费：只 `increment usedTokens`
- 续费结算顺序：trial → subscription → purchased
- **无**翻译日限额（不实现 `trialDailyUsed`）

## 安装试用

- 固定 `INSTALL_TRIAL_TOKENS = 200_000`
- `BillingLog.TRIAL_GRANTED` 存在则重装不重复发放

## 环境变量

| 变量 | 说明 |
|------|------|
| `BILLING_ENABLED=false` | 关闭 token 校验与扣费 |
| `BILLING_GATEWAY=noop` | 不调 Shopify Billing，本地直接入账 |
| `BILLING_TEST=true` | Shopify 测试计费 |

## Turso 迁移

```bash
npm run turso:migrate:test
npm run turso:migrate:prod
```

迁移后自动执行 `billing-plan-catalog-seed.sql` 与 `token-billing-rule-seed.sql`。

## Phase 0 范围

- Schema + 模块骨架已就绪

## Phase 1 已接入

- `app/routes/app.tsx` loader/action：`runAppInitialization` / `runLanguageTargetsSync`
- `resolveAppInitPath` + `detectTsfInitialization` 本地 init 检测
- `/api/app-bootstrap`：`loadAppBootstrapData`（TSF 读 Turso，老用户读 Java）
- 新用户：200k 试用、`ShopProfile`、`ShopLanguagePack`、`CommonEventLog` 安装事件

## Phase 2 已接入

- `app/server/taskTokenUsage/shopQuota.server.ts`：`getShopQuota` / `deductShopQuota`（TSF Turso / Java 分流）
- `GET/POST /api/billing/quota` — 对齐 Java `/quota/*` 响应格式
- `/api/translate-v4/quota`、单字段 `deductQuota` — 经 shopQuota 分流
- Worker `tsfAccountQuota.ts` + `tsfQuota.ts`：TSF 用户直读 Turso Account 扣费

## Phase 3 已接入

- `app/routes/app.pricing` action：`isTsfBillingShop` → `startSubscriptionCheckout` / `startTokenPackCheckout`
- `GET /api/billing/active-subscription` — TSF 读 Turso `AppSubscription`，老用户读 Java
- `app/routes/webhooks`：`APP_SUBSCRIPTIONS_UPDATE` / `APP_PURCHASES_ONE_TIME_UPDATE` → TSF 本地 handler
- UI 价格仍由前端传入（`priceOverride`），PlanCatalog 负责 tokens 与 Shopify 商品名

## Phase 4 已接入

- **卸载生命周期**：`APP_UNINSTALLED` / `SHOP_REDACT` → TSF 本地 `handleTsfAppUninstalled`（取消订阅池、CommonEventLog，不调 Java）
- **店铺 webhook**：`SHOP_UPDATE` / `THEMES_PUBLISH` → TSF 刷新 `ShopProfile` + `primaryLocale`
- **建任务门禁**：`POST /api/translate-v4/tasks` 对 TSF 用户调用 `requireBillingAccess`

## Phase 5 已接入（新用户路径 Java 清理）

- `app.tsx` loader **await** `runAppInitialization`，消除 bootstrap/quota 竞态
- `usesTsfBilling` — Account / migratedToTsf / trial / 缓存路由 → 不走 Java bootstrap/quota
- `resolveAppInitPath` — 分流结果写入 `CommonEventLog.BILLING_ROUTE_RESOLVED`，避免重复 `InitializationDetection`
- TSF 用户 loader 不传 `SERVER_URL`；`globalStore.tsfBilling` 标记客户端跳过 Java
- `hasPayForFreePlanModal` — TSF 用户跳过 `IsShowFreePlan` Java 调用
- `TaskTokenUsageLog.taskType` 枚举：`manual` / `auto`

## 待做

- PlanCatalog 种子由产品覆盖（当前为简单占位）
- Webhook 成功邮件（暂不实现）
- manage-translation / switcher 等二级页面 Java 依赖（非新用户主路径）
- `TaskTokenUsageLog` 写入（`recordBilledTaskTokenUsages` 尚未接入 worker 扣费链路）
