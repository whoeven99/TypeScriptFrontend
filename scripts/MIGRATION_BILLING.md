# Spring 额度/订阅 → TSF Turso 灰度迁移手册

把 Spring 主翻译 App 的存量 legacy 店铺的「额度 + 订阅」搬到 TSF 的 Turso 新 account 系统。
翻译数据迁移（`ShopTranslationSettings.migratedToTsf`）已有独立流程，本手册只负责**计费**这一环。

## 一、原理

双轨并行：`ShopBillingBinding.billingSystem` 决定某 shop 走 `tsf`(Turso) 还是 `legacy`(Spring)。

- 额度出入口 `app/server/billing/quota/quotaRouter.server.ts`：`tsf` 读写 Turso `Account`，`legacy` 转发 Spring `/quota`。
- 续费入口 `app/routes/webhooks.tsx`：`isTsfBillingShop` 为真时走 Turso（`handleBillingWebhook`），不再回调 Java。

迁移动作 = 把选定 shop 的 binding 从 `legacy` 翻转成 `tsf`，同时把余额/订阅写进 Turso。翻转后该店的额度扣减、续费 webhook 自动改走 tsf。

**守恒保证**：迁移后 tsf 的 `remaining` 与 legacy `/quota/query` 完全一致。

| Spring（legacy） | TSF（Turso Account） |
| --- | --- |
| `/quota/query` maxToken（Redis 权威 total） | `subscriptionCredits + purchasedCredits + trialCredits` |
| `TranslationCounter.chars`（累加购买池） | `purchasedCredits` |
| maxToken − chars（计划基线） | `subscriptionCredits` |
| `/quota/query` usedToken（Redis 权威已用） | `usedCredits` |
| `UserSubscriptions` + `CharsOrders`(ACTIVE GID) | `AppSubscription`（复用同一 Shopify GID） |
| `UserTrials.trial_end` | `AppSubscription.trialEndsAt` |

## 二、前置条件

1. `.env.prod` 已配置：
   - `SPRING_DB_URL`（或 `SPRING_DB_SERVER`/`SPRING_DB_DATABASE`）+ `SPRING_DB_USER` + `SPRING_DB_PASSWORD`
   - `SERVER_URL`（Spring `/quota` 服务，用于取 Redis 权威额度）
   - `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`（生产库；test 库用 `TURSO_TEST_*`）
2. Turso 已跑过 `npm run turso:migrate:prod`（存在 `Account`/`AppSubscription`/`PlanCatalog` 等表及套餐种子）。
3. 依赖已装（`mssql`、`@libsql/client`，仓库已具备）。

## 三、灰度批次流程（每批重复）

建议先在 **test 库**跑通，再上 prod。每批 10~20 家小店起步。

### 1. 选批次（推荐：下一轮 auto 会跑任务的 legacy 店）

**想在迁移后约 1 小时内用自动翻译验证额度**，用 worker 同款 hash 分槽：

```bash
npm run migration:next-auto-slot
```

会列出：下一轮整点扫描 · 槽位命中 · 已过冷却 · 仍走 legacy 计费 · 且 `migratedToTsf=1` 的店。把输出追加到 `shop.txt`。

若只按 Spring 侧「开过 auto 的小店」选、不关心下小时槽位，仍可用：

```bash
npm run migration:next-shops
```

把输出的域名追加到仓库根的 `shop.txt`（每行一个；本脚本会自动识别、忽略 `#` 注释）。

### 2. dry-run 对账（不写库）

```bash
npm run migration:billing -- --target=test    # 读 shop.txt，逐店打印三池/已用/剩余 + 警告
# 或单店：
npm run migration:billing -- --shop=demo.myshopify.com --target=test
```

重点检查输出的「警告」区：
- `used 漂移`：Redis 与 DB 镜像不一致（以 Redis 为准，正常小差异可接受）。
- `计划基线差异`：Spring 基线额度与 `PlanCatalog.credits` 不同（当前守恒，仅影响下次续费按目录值发放）。
- `有 ACTIVE 订阅订单但无法识别档位` / `像付费档但无 ACTIVE 订单`：需人工确认后再迁。

### 3. 写入

```bash
npm run migration:billing -- --apply --target=test
```

- 幂等：已是 `tsf` 的店自动跳过（`--force` 可覆盖重写）。
- 每店写入后自动回读 Turso 校验 `remaining` 是否与 legacy 一致，不一致会打印 `[verify]`。

### 4. 重启 worker（重要）

worker 进程内有 `bindingCache`（无 TTL）。**不重启的话新迁移的店仍会按 legacy 扣减额度**。在 Render 上 restart worker 服务。

### 5. 验证

- 打开该店 App：`/api/app-bootstrap`、`/api/translate-v4/quota` 显示的套餐/剩余正确。
- 触发一次翻译，确认额度扣减写到 Turso `Account.usedCredits`。
- （可选）等下一个 Shopify 续费周期，确认续费 webhook 走 tsf（`BillingLog` 出现 `SUBSCRIPTION_RENEWED`）。

### 6. 上生产

test 验证无误后，同样步骤把 `--target=test` 换成 `--target=prod`。

## 四、回滚

```bash
npm run migration:billing -- --rollback --apply --target=prod   # 把清单里的店 binding 改回 legacy
```

- 只翻转 binding，保留 Turso `Account`/`AppSubscription`（便于再次前滚）。
- 回滚后同样需**重启 worker** 清缓存。
- 注意：回滚期间在 tsf 上产生的用量**不会回写 Spring**，存在用量缺口（灰度小店、短窗口影响有限）。

## 五、已知事项

- **Spring 每日 cron 仍会给已迁店发放额度**到 Spring 的 `TranslationCounter`（Spring 不知情）。这不影响 tsf 运行（tsf 不读 Spring），只在回滚时造成 Spring 侧多发。彻底收敛前可忽略；如需干净，可在 Spring `BogdaTask/SubscriptionTask` 侧按 binding 跳过已迁店（需改 Spring，另行评估）。
- **纯免费试用用户**（未付费）迁移后不建 `AppSubscription`，试用 UI 状态（`isInFreePlanTime`）会丢失，但额度守恒。灰度批次多为 auto_translate 活跃店，影响有限。
- 迁移瞬间若该店正好有在飞翻译，可能有极小的已用量竞态（Redis 与写入之间）；小店灰度可接受，必要时选低峰执行。

## 六、全量收敛（后续）

当 `ShopBillingBinding` 不再有 legacy 记录后：
1. ~~把 `resolveBillingBinding` 默认改为 tsf、去掉 `/user/exists`~~（已完成：`boundReason=default_tsf`）。
2. 下线 Spring 计费接口与 `SubscriptionTask` cron（保留翻译流水线仍需的 `Users.access_token` 等非计费能力）。
