# 翻译 v4 切换落地计划（TsFrontend）

> 目标：把**批量翻译执行链路**从 v2（SpringBackend / Java）切到 v4（Spark worker），
> 额度继续用 Java `/quota/query`。manage 编辑页、订阅计费、词汇表、货币、语言、
> IP 切换/重定向、用户初始化等**本期全部保留在 Java**，留待二期。
>
> 文档创建日期：2026-06-20。涉及仓库：`TypeScriptFrontend`（前端，改动主体）、
> `Spark/worker`（v4 执行器，已就绪）、`SpringBackend`（Java，保留额度等）。

---

## 1. 现状快照

### 1.1 v4 链路已基本就绪（不要重复造）

| 环节 | 位置 | 状态 |
|---|---|---|
| 建任务 API | `app/routes/api.translate-v4.tasks.ts` | ✅ 写 Cosmos + 推 Redis hint |
| 任务控制（暂停/恢复/取消） | `app/routes/api.translate-v4.task-action.ts` | ✅ |
| 进度查询 | `app/routes/api.translate-v4.task-progress.ts` | ✅ 读 Cosmos |
| 额度查询 | `app/routes/api.translate-v4.quota.ts` → `server/translateV4/quota.server.ts` | ✅ 调 Java `/quota/query`（走 `SERVER_URL`） |
| v4 UI 入口 | `app/routes/app.translate-v4/route.tsx`（653 行） | ✅ 已实现 |
| v4 服务层 | `app/server/translateV4/*`（cosmos/redis/progress/token/quota/resumeStatus/locale/types） | ✅ 与旧链路完全解耦 |
| 执行器 | `Spark/worker`：stage = `init→translate→writeback→verify→analysis` | ✅ 直接回写 Shopify |
| 额度实扣 | `worker/src/services/tsfQuota.ts` | ✅ 仅对 `taskSource==="TsFrontend"` 生效，读 + 每批实扣 + 按额度动态调并发 |

**结论**：v4 主链路是通的，本期工作重心是**前端入口切换 + v2 触发下线**，而非新功能开发。

### 1.2 v4 模块覆盖

`app/server/translateV4/types.ts` 的 `TRANSLATION_V4_MODULES` 共 21 种：
PRODUCT / PRODUCT_OPTION / PRODUCT_OPTION_VALUE / COLLECTION / 4×ONLINE_STORE_THEME_* /
MENU / LINK / DELIVERY_METHOD_DEFINITION / FILTER / METAFIELD / METAOBJECT /
PAYMENT_GATEWAY / SELLING_PLAN(_GROUP) / SHOP / ARTICLE / BLOG / PAGE。

基本覆盖 `manage_translation_.*` 资源类型。**待确认**：v2 是否还有 v4 未覆盖的类型（如 `productImageAlt`、`locale_content`、`custom_liquid`/PageFly 等特殊项）。

### 1.3 v2 链路与入口

- v2 翻译 UI：`app/routes/app.translate/route.tsx`（697 行）
- 续跑/停止：`app/routes/app._index/components/progressBlock.tsx` → `ContinueTranslating` / `StopTranslatingTask`
- 进度：`GetProgressData` / `GetAllProgressData`（JavaServer）
- **进入 v2 翻译页的入口**（需改向 v4）：
  - `app/routes/app.language/route.tsx`：选完目标语言后 `navigate("/app/translate")`（**主入口**，3 处）
  - `app/routes/app._index/components/progressBlock.tsx:99`、`progressingCard.tsx:29`：首页进度卡
  - `app/routes/app.apikeySetting/route.tsx:555,577`：面包屑
- `app/routes/app.tsx:692` 导航已有 `<Link to="/app/translate-v4">智能翻译 (v4)</Link>`

---

## 2. 范围边界（本期）

### ✅ 在范围内（切到 v4）
- 批量翻译的发起、进度、暂停/恢复/取消
- 翻译执行与回写 Shopify（worker 完成）
- 额度按 v4 口径实扣（worker 已实现）

### ❌ 不在范围内（保留 Java，勿动）
- 额度服务本身（`/quota/query`，继续由 Java 提供）— 仅"被使用"
- `manage_translation_.*` 30+ 编辑页：读译文 / 保存(`updateManageTranslation`) / 单条重译(`SingleTextTranslate`) — **二期**
- 订阅计费（`pricing`/`GetUserSubscriptionPlan`）、词汇表（`glossary`）、货币（`currency`/`conversion_rate`）、语言配置（`language`）、IP 切换与自定义重定向（`switcher`）、用户初始化（`app.tsx` 的 `UserInitialization`/`InitializationDetection`）、webhooks
- `api/JavaServer.ts` 中除翻译执行外的所有导出

---

## 3. 分阶段落地

### Phase 0 — 验证 v4 主链路（不动用户可见入口）
**目的**：确认 v4 与 v2 产出一致，额度实扣正确。
- 用测试店从 `/app/translate-v4` 建一个 `target` 任务（先小 `limitPerType`，`testMode` 视情况）。
- 跟踪 Cosmos job 状态走完 `init→translate→writeback→verify`，确认译文回写 Shopify。
- 核对额度：Java `/quota/query` 的 `usedToken` 随翻译增加；`QUOTA_ENFORCE`、`QUOTA_TOKEN_MULTIPLIER` 行为符合预期。
- **退出标准**：一个完整任务跑通、结果与 v2 同店同语言抽样一致、额度扣减正确。

**前置环境检查清单**
- 前端：`SERVER_URL`（Java 额度）、`COSMOS_*_V4`、`REDIS_*_V4` 已配（见 `.env`）。
- worker：`TSF_SERVER_URL`（= Java 额度 base）、Cosmos/Redis 同一套、`WORKER_STAGES` 默认全开。
- 确认前端写入的 Cosmos 容器 = worker `cosmosV4.ts` 读取的容器（同 `COSMOS_TRANSLATION_V4_JOBS_CONTAINER_V4`）。

### Phase 1 — 翻译入口切到 v4（核心）
**改动点**：
1. **入口重定向**：把以下跳转从 `/app/translate` 改为 `/app/translate-v4`
   - `app/routes/app.language/route.tsx`（3 处 `navigate("/app/translate", …)`）—— 注意保留其携带的 `state`（目标语言等），需在 v4 页 loader/读取处对齐参数协议。
   - `app/routes/app._index/components/progressBlock.tsx`、`progressingCard.tsx`
   - `app/routes/app.apikeySetting/route.tsx`（面包屑 2 处）
2. **导航**：`app.tsx` 把主翻译菜单指向 v4（移除/降级 "v4" 后缀，v2 入口保留为灰度回滚临时项或加 feature flag）。
3. **首页进度卡**：`progressBlock` 当前调 `ContinueTranslating`/`StopTranslatingTask`（v2）。改为读 v4 进度（`api.translate-v4.task-progress`）+ 控制（`api.translate-v4.task-action`）。这是 Phase 1 里最实的一块——首页进度展示要切到 Cosmos 数据源。

**建议**：用一个开关（env 或 shop 维度灰度）控制 `translate` 入口走 v2 还是 v4，便于回滚。

**待确认项**：
- v2 实际的"开始翻译"触发链路（`app.translate` 的 `translateFetcher` 提交目标）。grep 显示 `ContinueTranslating` 仅在 `progressBlock`；初次翻译触发疑似经 `/app`（`app.tsx` action）或 `app.language` action，需在动手前 5 分钟跟一遍，确保切换时不遗漏触发点。
- `app.language` → translate 传的 `state` 字段，v4 页是否已消费。

### Phase 2 — v2 翻译执行下线
- 删除/停用 `app.translate`（v2 路由），或保留为 410/重定向到 v4。
- `JavaServer.ts` 中纯翻译执行函数（`ContinueTranslating`、`GetProgressData`、`GetAllProgressData`、`StopTranslatingTask` 等）确认无引用后移除。
- **保留** `GetGlossaryByShopName`、`GetLanguageList`、额度、计费、用户初始化等。

### Phase 3 — 清理与回归
- 删 `app.translate-new`（已空）。
- 文案：把 "v4" 字样去掉（对用户就是"翻译"）。
- 回归：进度展示、暂停/恢复/取消、额度耗尽时 worker 行为、多语言并发。

---

## 4. 二期预告（不在本期实施）
- `manage_translation_.*` 解耦 Java：读改 Shopify GraphQL、存改 `translationsRegister`、单条重译接 worker `llmTranslate` 的轻量同步端点。
- 评估词汇表（worker 有 `glossary.ts`）数据源是否要脱离 Java。
- 评估是否最终下线 SpringBackend 的非额度模块。

---

## 5. 风险与依赖
- **数据源一致性**：v4 进度在 Cosmos、v2 在 Java。切换期间首页/语言页若混用两套进度，会出现"任务看不到"。Phase 1 必须把进度展示一并切到 Cosmos。
- **回写 token**：v4 用 offline token（`token.server.ts` 的 `resolveOfflineAccessToken`）。需确认存量店铺都有有效 offline token，否则 worker 写回失败。
- **额度口径差异**：v2 与 v4 的 token 计量/系数可能不同（`QUOTA_TOKEN_MULTIPLIER` 默认 1.5），切换前对账，避免用户额度突然跳变。
- **模块覆盖缺口**：若 v2 支持而 v4 未覆盖的资源类型存在，需在 Phase 1 前明确"这些类型暂仍走 v2 / 或不支持"。
- **灰度与回滚**：保留 v2 入口 + 开关，至少观察一个发布周期。

---

## 6. 待你确认的开放项
1. v2 初次翻译触发的确切路径（见 Phase 1 待确认项）。
2. v4 未覆盖的资源类型清单（productImageAlt / locale_content / custom_liquid / pagefly 等）。
3. 灰度方式：env 全局开关，还是按 shop 维度灰度？
4. v2 入口下线时机：Phase 2 直接删，还是长期保留重定向。
