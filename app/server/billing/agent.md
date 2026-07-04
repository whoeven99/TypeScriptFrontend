# TSF 计费模块约定（Phase 0+）

改动本目录、`app/server/taskTokenUsage/`、`app/server/onboarding/` 或计费 Webhook 前请先读本文档。

## 新/老用户分流

- **无** `BILLING_TSF_ENABLED` 环境变量。
- Turso 存在 `Account` 行 → `isTsfBillingShop(shop) === true` → 走 TSF 本地计费。
- 无 `Account` 行 → 仍走 Java Spring（`/quota/*`、`UserInitialization` 等）。

## 表职责

| 表 | 职责 |
|----|------|
| `Account` | 三池 token + `usedTokens` |
| `AppSubscription` | 当前 Shopify 订阅 |
| `PlanCatalog` | 套餐/购包目录（种子 `prisma/billing-plan-catalog-seed.sql`） |
| `AccountPeriodUsage` | 订阅周期归档 |
| `BillingLog` | 账务流水（含 `TRIAL_GRANTED` 幂等） |
| `TaskTokenUsageLog` | 翻译任务消耗明细（`taskType`） |
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
- **尚未**接入 `app.tsx` init、pricing action、webhook、worker quota（Phase 1+）
