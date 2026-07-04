# TSF 自建用户系统落地方案（脱离 Spring · 新用户灰度）

> 目标：在 **TypeScriptFrontend（TSF）** 内自建一套完整的「用户系统」——用户档案、
> 订阅计划、额度/积分、试用、订单、初始化与卸载——**全部落在 TSF 自己的 Turso（libsql）库**，
> 不再依赖 SpringBackend（Java）的 `SERVER_URL` 接口。**先从新装店（新用户）开始灰度**，
> 存量店保持走 Java，直到逐店迁移。
>
> 文档创建日期：2026-07-04。涉及仓库：`TypeScriptFrontend`（改动主体）、
> `Spark/worker`（额度实扣与自动翻译，需配合改额度数据源）、`SpringBackend`（Java，灰度期共存、后期下线）。
>
> 参考：本方案沿用现有「翻译 v4 切换」的灰度范式（`ShopTranslationSettings.migratedToTsf` +
> `shop.txt` 白名单 + worker 只处理已迁移店），见 `docs/translation-v4-cutover-plan.md`。
> Spark worker 侧已有 `tsfDb.ts` / `tsfQuota.ts` 的「TSF 数据源」用户操作范式可直接复用。

---

## 1. 背景与目标

### 1.1 什么是这里的「用户」

本项目是 Shopify 嵌入式 App，**「一个用户」= 「一个安装了 App 的 Shopify 店铺（myshopify 域名）」**。
不存在独立的账号密码登录 / 注册，身份由 Shopify OAuth 决定，会话存在 `Session` 表（`app/db.server.ts` + Prisma）。
因此「用户系统」实际要接管的是**围绕 shop 的业务身份数据**：档案、计划、额度、试用、订单、生命周期。

### 1.2 现在的痛点

所有用户业务数据都在 Java 侧（SQL Server），TSF 通过 `app/api/JavaServer.ts` 以 HTTP 调用。这带来：

- **强耦合**：TSF 首屏/翻译/计费都要等 Java；Java 慢或挂 → TSF 体验直接受损。
- **双写与漂移**：TSF 已把翻译、术语表、货币、语言等迁到 Turso，但「用户/额度/订阅」仍在 Java，形成两套真相源。
- **迭代慢**：用户相关任何字段变更都要跨 Java 团队与发版。

### 1.3 目标

1. TSF 拥有**自己的用户系统**（Turso 为唯一真相源），覆盖 §3 列出的全部用户操作。
2. **新用户灰度**：新装店安装即进入 TSF 用户系统；存量店按批次迁移，可回滚。
3. worker 的额度实扣与 TSF 的额度读写**指向同一账本**，口径一致（token × 系数）。
4. 灰度期 Java 与 TSF **共存**，通过一个「用户系统路由器」按店选择走哪套；最终 Java 用户模块下线。

---

## 2. 现状快照：用户相关全部走 Java

以下均在 `app/api/JavaServer.ts`，base 为 `process.env.SERVER_URL`（额度部分 worker 用 `TSF_SERVER_URL`）。

### 2.1 用户生命周期 / 初始化（`app/routes/app.tsx`、`webhooks.tsx`）

| 操作 | 函数 | Java 接口 | 触发点 |
|---|---|---|---|
| 建用户档案 | `UserInitialization` | `POST /user/userInitialization` | `app.tsx` loader/action 进入 App |
| 初始化检测 | `InitializationDetection` | `GET /user/InitializationDetection` | 同上，判断哪些子项已初始化 |
| 初始化额度 | `InsertCharsByShopName` | `POST /translationCounter/insertCharsByShopName` | 初始化检测未完成时 |
| 送免费额度 | `AddUserFreeSubscription` | `POST /shopify/addUserFreeSubscription` | 同上 |
| 默认语言包 | `AddDefaultLanguagePack` | `PUT /aiLanguagePacks/addDefaultLanguagePack` | 同上 |
| 改用户计划 | `UpdateUserPlan` | `POST /user/checkUserPlan` | 订阅 webhook、卸载 |
| 卸载清理 | `Uninstall` | `DELETE /user/uninstall` | `APP_UNINSTALLED` / `SHOP_REDACT` |

### 2.2 订阅 / 计划 / 订单（`app/server/appBootstrap.server.ts`、`app.pricing`、`webhooks.tsx`）

| 操作 | 函数 | Java 接口 |
|---|---|---|
| 查订阅计划 | `GetUserSubscriptionPlan` | `GET /shopify/getUserSubscriptionPlan` |
| 是否在免费期 | `IsInFreePlanTime` | `POST /userTrials/isInFreePlanTime` |
| 是否显示免费计划 | `IsShowFreePlan` | `POST /userTrials/isShowFreePlan` |
| 是否新客(未开过免费) | `IsOpenFreePlan` | `POST /userTrials/isOpenFreePlan` |
| 最近有效订阅 id | `GetLatestActiveSubscribeId` | `POST /orders/getLatestActiveSubscribeId` |
| 记订单 | `InsertOrUpdateOrder` | `POST /orders/insertOrUpdateOrder` |
| 订阅后加额度 | `AddCharsByShopNameAfterSubscribe` | `POST /translationCounter/addCharsByShopNameAfterSubscribe` |
| 订阅额度记录 | `AddSubscriptionQuotaRecord` | `PUT /subscriptionQuotaRecord/addSubscriptionQuotaRecord` |
| 订阅/购买成功邮件 | `SendSubscribeSuccessEmail` / `SendPurchaseSuccessEmail` | `POST /orders/*` |

### 2.3 额度 / 积分（TSF 手动翻译 + worker 实扣）

| 操作 | 位置 | Java 接口 |
|---|---|---|
| 查额度（总/已用/剩余） | `GetUserWords`（`getUserLimitChars`）、`server/translateV4/quota.server.ts` `getShopQuota` | `GET /shopify/getUserLimitChars`、`GET /quota/query` |
| 扣额度（单条手动） | `server/translateV4/singleTranslate.server.ts` `deductQuota` | `POST /quota/deduct` |
| 扣额度 / 查剩余（worker 批量） | `worker/src/services/tsfQuota.ts` `deductTsfQuota` / `getTsfRemaining` | `POST /quota/deduct`、`GET /quota/query`（base=`TSF_SERVER_URL`） |
| 一次性购买加额度 | `AddCharsByShopName` | `POST /translationCounter/addCharsByShopName` |

> **关键点**：额度是「用户系统」里唯一被 **worker 也直接依赖**的部分。用户系统迁移到 TSF 时，
> **额度账本必须同时被 TSF 路由和 worker 命中同一份数据**，否则会出现「TSF 看剩余 X，worker 按 Java 扣」的双账本超用。

---

## 3. 目标架构

```
                       ┌───────────────────────────────────────┐
                       │  用户系统路由器 resolveUserSystem(shop) │
                       │  规则：ShopUser.userSystem / env 白名单 │
                       └───────────────┬───────────────────────┘
              tsf                       │                        spring
     ┌────────────────────┐            │            ┌───────────────────────┐
     │  TSF UserService    │            │            │  JavaServer.ts (现状)  │
     │  (Turso 为真相源)   │            │            │  SERVER_URL → Java     │
     │  - profile          │            │            └───────────────────────┘
     │  - subscription     │
     │  - quota (账本)     │◄──────────── worker 额度实扣（/api/quota/*）
     │  - trial / order    │
     └─────────┬───────────┘
               │ Turso (libsql) —— 与翻译/术语/货币同库
               ▼
   ShopUser · ShopSubscription · ShopOrder · QuotaAccount · QuotaLedger · ShopTrial
```

设计原则：

- **单一路由入口**：所有用户操作先过 `resolveUserSystem(shop)`，返回 `"tsf" | "spring"`，再分派到对应实现。调用方（`app.tsx`、`webhooks`、`pricing`、bootstrap、single-translate）不感知底层。
- **Turso 同库复用**：新表加入现有 `prisma/schema.prisma`，与 `ShopTranslationSettings` 等同库，worker 已有 `tsfDb.ts` 可直接读。
- **额度对外仍是 HTTP**：为最小化 worker 改动，TSF 暴露 `/api/quota/query`、`/api/quota/deduct`（与 Java `BaseResponse<TokenQuotaVO>` **同形状**），worker 只需把 `TSF_SERVER_URL` 指向 TSF；TSF 内部再按店路由到 Turso 账本或代理 Java。
- **幂等 + 流水**：额度增减、订单、订阅都走「账本流水（ledger）+ 幂等键」，避免 webhook 重投、并发实扣造成错账。

---

## 4. 数据模型设计（Prisma / Turso）

新增以下模型到 `prisma/schema.prisma`（命名对齐既有 Java 语义，便于迁移时字段直映）。

```prisma
// 用户主档（取代 Java Users），一店一行
model ShopUser {
  shop          String    @id                 // myshopify 域名
  email         String?
  firstName     String?
  lastName      String?
  shopOwnerName String?                        // Java userTag
  defaultLocale String?                        // 安装时 primary locale
  defaultThemeId   String?
  defaultThemeName String?

  userSystem    String    @default("spring")   // 灰度开关："tsf" | "spring"（新装默认 tsf，见 §6）
  installedAt   DateTime  @default(now())
  lastLoginAt   DateTime?
  uninstalledAt DateTime?                       // 卸载不物理删，便于复装与 GDPR
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userSystem])
  @@index([uninstalledAt])
}

// 订阅 / 计划（取代 Java user plan + orders 里的订阅态），一店一行=当前有效计划
model ShopSubscription {
  shop            String    @id
  planId          Int       @default(2)         // 对齐 Java：2=Free,4=Basic,5=Pro,6=Premium
  planType        String    @default("Free")    // Free/Basic/Pro/Premium
  feeType         Int       @default(0)          // 0=无 1=月付 2=年付
  status          String    @default("ACTIVE")   // ACTIVE/CANCELLED/EXPIRED/FROZEN
  subscriptionGid String?                        // Shopify appSubscription gid
  currentPeriodEnd DateTime?
  isInFreePlanTime Boolean  @default(false)      // 是否处于试用期（对齐 bootstrap.plan）
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status])
}

// 试用发放记录（取代 userTrials 判定「是否新客/是否开过免费/是否在免费期」）
model ShopTrial {
  id        Int      @id @default(autoincrement())
  shop      String
  planType  String                               // 试用对应的计划
  startedAt DateTime @default(now())
  endsAt    DateTime
  consumed  Boolean  @default(false)             // 试用是否已用/过期
  createdAt DateTime @default(now())

  @@index([shop])
  @@unique([shop, planType])                     // 每店每计划仅一次试用
}

// 订单（取代 Java orders），订阅 + 一次性购买都记
model ShopOrder {
  id             String   @id                    // Shopify admin_graphql_api_id（gid）
  shop           String
  kind           String                          // "subscription" | "one_time"
  name           String?
  amount         Float?
  feeType        Int      @default(0)            // 1=月 2=年（订阅）
  credits        Int?                            // 一次性购买赠送积分
  status         String                          // ACTIVE/PENDING/CANCELLED/DECLINED...
  confirmationUrl String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([shop])
  @@index([shop, status])
}

// 额度账户（取代 Java translationCounter/quota），一店一行
// 语义与 worker/Java 一致：maxToken/usedToken，remaining = maxToken - usedToken（可为负）
model QuotaAccount {
  shop        String   @id
  maxToken    BigInt   @default(0)               // 累计可用额度（计划月度重置 + 购买叠加）
  usedToken   BigInt   @default(0)               // 累计已用
  planToken   BigInt   @default(0)               // 当期计划额度（月度重置部分）
  extraToken  BigInt   @default(0)               // 购买/结转的额外额度（不随月度清零）
  periodEnd   DateTime?                           // 当期计划额度到期时间（用于重置）
  updatedAt   DateTime @updatedAt

  @@index([periodEnd])
}

// 额度流水（幂等 + 审计），所有增减都写一条
model QuotaLedger {
  id          String   @id @default(cuid())
  shop        String
  type        String                             // GRANT_PLAN/GRANT_EXTRA/DEDUCT/RESET/EXPIRE/ADJUST
  amount      BigInt                             // 正=增，负=扣
  balanceAfter BigInt                            // 记账后 remaining
  source      String?                            // subscription/one_time/translate-task/manual
  refId       String?                            // 订阅 gid / 订单 gid / 任务 id
  idemKey     String?                            // 幂等键：同键只入账一次
  createdAt   DateTime @default(now())

  @@index([shop, createdAt])
  @@unique([idemKey])
}
```

> 说明：
> - `BigInt` 与 `Session.userId` 一致，libsql 支持；应用层注意序列化（`JSON` 时转字符串/Number）。
> - **额度拆分为 `planToken`（月度重置）+ `extraToken`（购买/结转，永不清零）**，正好对应 pricing 页 FAQ 的规则
>   （计划积分每周期重置；额外积分永不过期；取消/降级后未用积分保留 3 个月）。
> - 扣减顺序：先扣 `planToken`，用尽再扣 `extraToken`（与「Extra credits only used when plan credits run out」一致）。

---

## 5. 服务层设计

新增目录 `app/server/user/`（server-only），对外只暴露「按店路由」的门面。

```
app/server/user/
  userSystem.server.ts     # resolveUserSystem(shop) 灰度路由 + 判定
  profile.server.ts        # ensureUser / markUninstalled / touchLogin（Turso 实现）
  subscription.server.ts   # getSubscription / applySubscriptionUpdate / cancel
  trial.server.ts          # isNewShop / isInFreePlanTime / grantTrial
  order.server.ts          # upsertOrder / getLatestActiveSubscribeId
  quota.server.ts          # getQuota / deductQuota / grantQuota（账本 + 幂等，Turso 事务）
  bootstrap.server.ts      # loadUserBootstrap(shop) —— 取代 loadAppBootstrapJavaData 的 tsf 分支
```

门面统一签名，内部按 `resolveUserSystem(shop)` 分派：

```ts
// 伪代码：门面模式，调用方无感
export async function getUserBootstrap(shop: string, server: string): Promise<AppBootstrapJavaData> {
  if ((await resolveUserSystem(shop)) === "tsf") {
    return loadUserBootstrapFromTsf(shop);      // 读 Turso：subscription + quota + trial
  }
  return loadAppBootstrapJavaData({ shop, server }); // 现状：走 Java（保持不动）
}
```

### 5.1 额度：TSF 侧 HTTP 端点（供 worker 复用）

新增两条 Remix 资源路由，**返回结构与 Java `BaseResponse<TokenQuotaVO>` 完全一致**：

- `GET  /api/quota/query?shopName=` → `{ success, response: { shopName, maxToken, usedToken, remaining } }`
- `POST /api/quota/deduct?shopName=&tokens=` → 同上（原子 `usedToken += tokens`，返回新 remaining）

内部实现：
```ts
// /api/quota/deduct（Turso 事务，幂等）
if (resolveUserSystem(shop) === "tsf") {
  return deductQuotaTsf(shop, tokens, { source, refId, idemKey }); // UPDATE + ledger
}
return proxyToJava(`/quota/deduct`, ...);   // 灰度期未迁移店透传 Java
```

原子扣减（libsql 单语句，避免读改写竞态）：
```sql
UPDATE QuotaAccount
SET usedToken = usedToken + :tokens, updatedAt = datetime('now')
WHERE shop = :shop;
-- 再 SELECT remaining = maxToken - usedToken 返回；并 INSERT QuotaLedger（带 idemKey 唯一约束）
```

### 5.2 worker 侧改动（最小）

worker 的 `tsfQuota.ts` 目前 base = `TSF_SERVER_URL`，直接打 Java。两种落地路径（推荐 A）：

- **A. 端点重定向（改动最小）**：把 worker `TSF_SERVER_URL` 指向 **TSF App 域名**（如 `https://<tsf-app>/api`），
  由 TSF 的 `/api/quota/*` 按店路由到 Turso 或代理 Java。worker 代码零改动，`/quota/query`、`/quota/deduct` 路径不变。
- **B. worker 直连 Turso**：worker 已有 `tsfDb.ts`，可加 `quotaTurso.ts` 直接读/扣 Turso。省一跳但把额度事务/幂等逻辑复制到 worker，维护双份，**不推荐**。

> 采用 A 时注意：TSF App 需能承接 worker 的额度 QPS（批量翻译高频扣减）。可给 `/api/quota/*` 单独限流/日志采样，
> 并保证扣减是幂等的（worker 每批带 `refId=jobId:batchSeq`）。

---

## 6. 灰度策略（新用户优先）

沿用翻译 v4 的「按店开关 + 白名单 + 只处理已开店」的成熟范式。

### 6.1 判定函数 `resolveUserSystem(shop)`

优先级从高到低：

1. **强制回滚名单**（env `USER_SYSTEM_FORCE_SPRING`，逗号分隔 shop）→ `spring`。出问题时秒级回滚指定店。
2. **`ShopUser.userSystem` 字段**（已落库的显式归属）→ 直接返回。
3. **新装店**：`Session` 存在但 `ShopUser` 不存在（首次进入）→ 按 §6.2 决定初始归属，并落库。
4. 兜底 → `spring`（存量店默认不动）。

判定结果**首次即持久化**到 `ShopUser.userSystem`，避免同一店在两套系统间抖动。

### 6.2 新装店进入 TSF 的开关

- 全局开关 `USER_SYSTEM_NEW_INSTALL=tsf|spring`（默认先 `spring`，验证通过后切 `tsf`）。
- 百分比灰度 `USER_SYSTEM_NEW_INSTALL_PERCENT=0..100`：对新装店按 `hash(shop) % 100 < percent` 命中 TSF，
  从 5% → 20% → 50% → 100% 逐步放量。
- 「新装」判定：`app.tsx` 首次初始化时 `ShopUser` 不存在，即视为新用户。

### 6.3 存量店迁移（后期）

- 新增 `scripts/migrate-users-to-tsf.mjs`：从 Java 拉某店的 user/subscription/quota/order 快照 → 写 Turso →
  置 `ShopUser.userSystem="tsf"`。参考现成 `scripts/next-migration-shops.mjs`（读 Spring SQL 选批次）。
- 迁移窗口内**冻结该店额度写**（极短），做一致性对账（Java remaining == Turso remaining）后再切。
- `shop.txt` 式白名单可复用来圈定迁移批次。

---

## 7. 关键链路改造清单

| 链路 | 文件 | 改法 |
|---|---|---|
| 首屏 bootstrap | `app/routes/api.app-bootstrap.ts` + `app/server/appBootstrap.server.ts` | 调 `getUserBootstrap(shop)` 门面（tsf 读 Turso / spring 走原逻辑） |
| App 初始化 | `app/routes/app.tsx`（`runAppInitialization`） | `resolveUserSystem` = tsf → `ensureUser`+`grantTrial`+`initQuota`（Turso）；否则原 Java 初始化 |
| 单条手动翻译扣额度 | `app/server/translateV4/singleTranslate.server.ts` `deductQuota` | 改调用 `app/server/user/quota.server.ts` 门面 |
| worker 批量扣额度 | `worker/src/services/tsfQuota.ts` | 采用 §5.2 方案 A：`TSF_SERVER_URL` 指向 TSF `/api`，代码不改 |
| 订阅 webhook | `app/routes/webhooks.tsx`（`APP_SUBSCRIPTIONS_UPDATE`/`APP_PURCHASES_ONE_TIME_UPDATE`） | tsf 店 → 写 `ShopOrder`+`ShopSubscription`+`grantQuota`（ledger 幂等）；spring 店保持原逻辑 |
| 卸载 | `app/routes/webhooks.tsx`（`APP_UNINSTALLED`/`SHOP_REDACT`） | tsf 店 → `markUninstalled` + 计划回落 Free；spring 店保持 |
| 计费页 | `app/routes/app.pricing/route.tsx` | `GetLatestActiveSubscribeId`/`InsertOrUpdateOrder` 换门面；订阅创建仍走 Shopify Billing GraphQL（不变） |
| 定时重置额度 | 新增（worker scheduler 或 TSF cron） | 每日扫 `QuotaAccount.periodEnd` 到期店：`planToken` 重置、写 `RESET` 流水；`extraToken` 保留 |

> 计费本身（`appSubscriptionCreate` / `appPurchaseOneTimeCreate`）走 **Shopify Billing API**，与用户系统无关，**不迁**。
> 我们只接管「订阅/购买结果落库 + 额度发放」。

---

## 8. 分阶段落地

### Phase 0 — 建模与账本（无用户可见变化）
- 加 §4 的 Prisma 模型，生成迁移；`prisma generate`。
- 实现 `app/server/user/*` 门面与 Turso 实现；`resolveUserSystem` 全量返回 `spring`（等于 no-op）。
- 单测：额度原子扣减、幂等键、plan/extra 扣减顺序、月度重置。
- **退出标准**：门面在 `spring` 模式下与现网行为 100% 一致（灰度未开，纯代码就位）。

### Phase 1 — 额度端点就位 + worker 指向 TSF（仍 spring 账本）
- 上线 `/api/quota/query`、`/api/quota/deduct`（内部对 spring 店透传 Java，对 tsf 店走 Turso）。
- 把 worker `TSF_SERVER_URL` 指到 TSF `/api`。此时所有店仍是 spring → TSF 端点纯代理 Java，**行为不变**，只是多一跳（先在 test 环境验收延迟/正确性）。
- **退出标准**：worker 批量翻译额度实扣经 TSF 代理后与直连 Java 完全一致；延迟可接受。

### Phase 2 — 新装店灰度到 TSF（核心）
- `USER_SYSTEM_NEW_INSTALL=tsf` + `USER_SYSTEM_NEW_INSTALL_PERCENT` 从 5% 起。
- 新装店：`ensureUser` 建档 → 发免费额度（`grantQuota` plan） → 记 `userSystem="tsf"`。
- 其 bootstrap/初始化/额度/订阅/卸载**全部走 Turso**；worker 对这些店扣 Turso 账本。
- 观察：首屏计划/额度展示、试用判定、订阅回调加额度、卸载回落、worker 实扣。
- 逐步放量 5→20→50→100%。出问题用 `USER_SYSTEM_FORCE_SPRING` 点名回滚。
- **退出标准**：一个发布周期内新装店在 TSF 用户系统下全链路正常，额度对账无偏差。

### Phase 3 — 存量店批量迁移
- `scripts/migrate-users-to-tsf.mjs` 按批迁移（先小店、活跃度低的店，参考 `next-migration-shops.mjs` 排序）。
- 每批迁移后对账 remaining；置 `userSystem="tsf"`。
- **退出标准**：目标批次迁完且对账通过，无用户额度跳变投诉。

### Phase 4 — Java 用户模块下线
- 确认 `JavaServer.ts` 用户/额度/订阅/订单相关导出无引用后移除；`SERVER_URL` 仅剩非用户用途（若有）或彻底下线。
- 移除 `/api/quota/*` 的 Java 代理分支。
- 回归：全量店在 TSF 账本上运行。

---

## 9. 一致性、幂等与回滚

- **额度幂等**：所有 `grantQuota`/`deductQuota` 带 `idemKey`（订阅 gid、订单 gid、`jobId:batchSeq`），
  `QuotaLedger.idemKey` 唯一约束保证 webhook 重投 / worker 重试不重复记账。
- **并发实扣**：用单条 `UPDATE ... usedToken = usedToken + ?` 原子自增，杜绝读改写竞态；remaining 允许瞬时为负（与现有 worker 语义一致：在飞批次可小幅透支）。
- **双写对账（迁移期）**：迁移脚本迁完后拉 Java 与 Turso 的 `remaining` 比对，阈值内才切 `userSystem`。
- **回滚**：`USER_SYSTEM_FORCE_SPRING` env 点名回滚；由于 `userSystem` 落库，回滚只影响判定不动数据。
  注意回滚后该店额度会回到 Java 账本，**迁移期不建议对同一店来回切**（会产生账本分叉）。
- **worker 双源风险**：Phase 1 让 worker 经 TSF 代理，确保「TSF 判定 = worker 扣减源」永远一致，从架构上消除双账本。

---

## 10. 与既有范式的对齐点（可直接借鉴）

- `ShopTranslationSettings.migratedToTsf` + `@@index([autoTranslate, migratedToTsf])`：本方案的 `ShopUser.userSystem` 同理。
- `worker/src/services/tsfDb.ts`：已封装 Turso 连接、读 Session offline token、读 Glossary —— 额度直连（若选方案 B）可在此扩展。
- `worker/src/services/tsfQuota.ts`：已定义 `TokenQuotaVO` / `BaseResponse` 形状与 token×系数口径 —— TSF `/api/quota/*` 直接对齐它，worker 零改。
- `scripts/next-migration-shops.mjs`：读 Spring SQL 选迁移批次的现成脚本，存量用户迁移可复用其筛选/排序/`shop.txt` 排除逻辑。
- `docs/translation-v4-cutover-plan.md`：分阶段 + 灰度 + 回滚的叙事范式，本文保持一致。

---

## 11. 风险与依赖

- **额度是唯一 worker 硬依赖**：必须 Phase 1 先让 worker 经 TSF 代理，再开新用户灰度，否则 tsf 店会出现「TSF 扣 Turso、worker 扣 Java」双账本。
- **额度端点性能**：worker 批量翻译扣减 QPS 较高。TSF App 需能扛住；`/api/quota/*` 建议独立日志采样 + 轻量鉴权（worker 与 App 内网/共享密钥）。
- **BigInt 序列化**：Prisma BigInt 在 JSON 响应需显式转换，避免 `Do not know how to serialize a BigInt`。
- **月度重置任务**：`planToken` 重置依赖 `periodEnd` 与订阅周期，需与 Shopify 订阅计费周期对齐，避免重复发放或漏发。
- **GDPR**：`CUSTOMERS_DATA_REQUEST/REDACT/SHOP_REDACT` 目前是空实现（无个人数据）。自建后 `ShopUser` 存了 email/owner name，
  `SHOP_REDACT` 需真正清理或匿名化 `ShopUser`。
- **复装店**：卸载不物理删（`uninstalledAt`），复装时 `ensureUser` 要能识别老店（保留额度/计划历史，或按业务规则重置）。
- **计费不迁的边界**：订阅/购买创建仍走 Shopify Billing，用户系统只处理结果落库；两者事务不在一起，需靠 webhook 幂等兜底。

---

## 12. 待确认的开放项

1. **新用户判定口径**：以「`ShopUser` 不存在」为准，还是要结合 Shopify 店铺创建时间 / 首次安装时间？复装店算不算新用户？
2. **额度端点方案**：采用 §5.2 A（worker 经 TSF 代理，推荐）还是 B（worker 直连 Turso）？取决于对多一跳延迟的容忍度。
3. **额度重置载体**：月度重置放 worker scheduler（已有调度）还是 TSF 侧 cron / Render cron？
4. **存量迁移是否本期做**：本方案可只做到 Phase 2（新用户灰度）先上线，Phase 3/4 视效果再排。
5. **计划/试用规则细节**：免费额度数值、试用天数（现 5 天）、取消后额度保留 3 个月等，需要产品确认后固化到 `grantQuota`/重置逻辑。
6. **鉴权**：worker → TSF `/api/quota/*` 的鉴权方式（共享密钥 header / 内网），避免额度接口被外部滥用。
7. **spark 项目用户操作**：worker 侧目前**唯一的用户级硬依赖是额度**（`tsfQuota.ts`）；邮件相关（`shopEmail.ts`）已直接从 Shopify Admin GraphQL 取 `shop.email`/`shopOwnerName`，不依赖 Java。因此本方案 worker 侧改动可收敛到「额度数据源」一处（§5.2）。仍需确认 spark 是否有其它未覆盖的用户读写。
```
