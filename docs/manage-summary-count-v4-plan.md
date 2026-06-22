# 汇总页"已翻译项"统计改为 v4 口径（去 Java）方案

> 目标：把管理翻译**汇总页**的 "已翻译/总数"（如 `208/232`）从 Java
> `getTranslationItemsInfo` 改为 **TSF 本地计算**，且口径与 v4 一致。
>
> 解决两件事：①去掉这条 Java 依赖；②修掉"v4 翻完仍显示 208/232"的不一致。
>
> 创建日期：2026-06-20。仓库：`TypeScriptFrontend`（改动主体）、`Spark/worker`（规则来源）。

---

## 1. 根因：两套"可翻译字段"规则漂移

- Java `getTranslationItemsInfo` 用**它自己**的计数规则数 Shopify。
- v4 worker 用 `translationFilter`（`shouldIncludeFieldV2` 等）决定**翻不翻**某字段。
- 两套规则对"哪些字段算可翻译"判定不同 → Java 认为总数 232、v4 只翻它认可的 208 →
  **v4 翻完，Java 永远显示 208/232**。

> 数据源其实都是 Shopify（Java 也是现查 Shopify，仅有一个 `status==1` 的 DB 快捷位）。
> 所以问题不在数据源，而在**计数用的尺子**。

---

## 2. 方案：TSF 本地算，用 v4 的尺子

> 汇总页统计改为：**读 Shopify** 枚举各类型资源 → 用 **worker 的 `translationFilter`**
> 过滤出"应翻字段"集合 → 数其中"有当前（未过期）译文"的数量 → `translated / total`。

一致性**按构造成立**：数总数的尺子 = v4 翻译的尺子，v4 翻完每个应翻字段都有译文 → 必然 `232/232`。

### 计数算法（镜像 worker `shopifyFetch.ts`）
worker 枚举逻辑已成熟，TSF 照搬其结构、改用 `admin.graphql`：
1. module → Shopify `TranslatableResourceType` 映射（同 worker）。
2. 两种拉取：PRODUCT/ARTICLE/PAGE/COLLECTION 先拉 ID 再 `translatableResourcesByIds`；
   其余直接 `translatableResources(resourceType:)`。分页到底。
3. 对每个资源的每个 `translatableContent` 字段：
   - `shouldIncludeFieldV2(...)` 判定是否"应翻" → 计入 **total**。
   - 该字段在 `translations(locale: target)` 有值，且**未过期**（`passesCoverAndOutdatedRules` / digest 比对）→ 计入 **translated**。
4. 输出沿用现有形状：`{ language, type, translatedNumber, totalNumber }[]`，汇总页 UI 不改。

> **"已翻译"必须是"有当前译文"**（digest 未过期），与 v4 的 done 语义一致；
> 否则过期译文被数成已翻译，又会对不齐。

---

## 3. 规则共享：拷贝进 TSF + 同步检查（已选定）

`translationFilter` = 601 行纯逻辑、9 文件、**零外部依赖**，可直接拷贝。
**但拷贝的代价就是漂移风险**（正是 208/232 的根因），必须用同步检查兜住。

### 3.1 落地
- **来源（唯一真相）**：`Spark/worker/src/services/translationFilter/`
- **TSF 副本**：`app/server/translateV4/translationFilter/`（9 个文件原样）
- **import 转换**：worker 用 ESM `.js` 后缀（`./types.js`）。拷贝时按 TSF 解析策略统一处理
  （去掉 `.js` 或保留，取决于 Vite/tsconfig；由同步脚本机械完成，不手改）。

### 3.2 同步脚本 + 守卫
- `scripts/sync-translation-filter.mjs <spark-repo-path>`：从 Spark 复制目录 → 套 import 转换 →
  写入 TSF 副本 → 生成内容哈希写入 `app/server/translateV4/translationFilter/.synced-from-spark.json`
  （记录来源 commit/hash）。
- **TSF CI 守卫**：校验 TSF 副本与 `.synced-from-spark.json` 记录一致——**禁止手改副本**
  （只能通过同步脚本更新），杜绝 TSF 侧偷偷改规则。
- **Spark CI 提醒**（关键，防"worker 改了 TSF 没跟"）：worker 改动 `translationFilter/` 时，
  CI 检查其内容哈希是否等于某处登记的"已同步哈希"，不等则**红灯提示去 TSF 跑同步脚本**。
  > 这是拷贝方案的残余风险点，靠这条 Spark 侧守卫把"漂移"变成"CI 报错"。

---

## 4. 资源类型映射（待补全 · 风险点）

汇总页 15 个类型 ↔ v4 的 21 个 module ↔ Shopify ResourceType，**不是一一对应**，需建映射表并逐个核对：

| 汇总页 type | 推测 v4 module / Shopify | 备注 |
|---|---|---|
| Products | PRODUCT (+OPTION/VALUE/METAFIELD) | 含 variant/option/metafield，注意子项计数 |
| Collection | COLLECTION | |
| Article / Blog titles | ARTICLE / BLOG | |
| Pages | PAGE | |
| Navigation | MENU / LINK | |
| Filters | FILTER | |
| Metaobjects | METAOBJECT | |
| Store metadata | METAFIELD | 计数规则特殊（worker 有 metafieldRules） |
| Shop | SHOP | |
| Notifications | ？（疑似 EMAIL 模板） | **v4 module 待确认** |
| Delivery / Shipping | DELIVERY_METHOD_DEFINITION | 两个标签是否合一待确认 |
| Policies | （SHOP_POLICY？） | **v4 是否覆盖待确认** |
| Theme | 4×ONLINE_STORE_THEME_* | 多 module 合并成一行；计数规则特殊（themeRules） |

> **开放项**：Notifications / Policies / Delivery+Shipping 是否都有对应 v4 module 与 Shopify 查询；
> 没覆盖的类型本期是"保留 Java 数" 还是"标 N/A"，需定。

---

## 5. 改动文件
- 新增 `app/server/translateV4/translationFilter/`（拷贝，9 文件）+ `.synced-from-spark.json`
- 新增 `app/server/translateV4/itemsCount.server.ts`（枚举 Shopify + 套 filter + 计数）
- 改 `app/routes/app.manage_translation/route.tsx`：`case !!itemsCount` 从
  `GetTranslationItemsInfo`（Java）改调本地 `itemsCount.server.ts`；移除该 Java import。
- 新增 `scripts/sync-translation-filter.mjs` + CI 守卫（TSF 侧 + Spark 侧）
- 确认无引用后，Java `GetTranslationItemsInfo`（JavaServer.ts）可移除。

---

## 6. 注意 / 取舍
1. **速度不变**：仍要翻页拉 Shopify（和 Java 现在一样）。本方案目标是"去 Java + 一致"，
   **不是提速**。要快是另一件事（缓存 / 预计算 / 读 v4 job metrics），别混做。
2. **丢弃 `status==1` 快捷位**：改为始终实算。如需保留"已完成则秒出"，可叠加：
   该 target 有 COMPLETED 的 v4 job 时直接判满（可选优化，非必需）。
3. **子项计数**：Products 含 option/variant/metafield，worker 枚举已处理，镜像时别漏。
4. **并发**：汇总页本就每类型一个 fetcher 并发；TSF 内部每类型分页注意 Shopify 限流
   （worker 有 bucket 节流，TSF 版按需加 pLimit）。

---

## 7. 落地步骤
1. 同步脚本 + 拷贝 `translationFilter` 进 TSF，跑通 import/类型。
2. 写 `itemsCount.server.ts`，**先只做 Products**：与 Java 旧值、与 Shopify 实际、与一次 v4 全量后对照，确认翻完 = `232/232`。
3. 补全映射表，逐类型铺开；Notifications/Policies/Delivery 等未覆盖项按第 4 节决策处理。
4. 接 CI 守卫（TSF + Spark）。
5. 汇总页切换数据源，回归 15 个类型。
6. 移除 Java `GetTranslationItemsInfo`。

---

## 8. 开放项
1. 映射表中 Notifications / Policies / Delivery+Shipping 的 v4 module 与 Shopify 查询确认。
2. import `.js` 后缀在 TSF 的处理方式（去掉 vs 保留）——同步脚本据此固定。
3. Spark 侧同步守卫的具体接法（两仓库 CI 是否同管线 / 用哈希登记）。
4. 是否叠加 "COMPLETED job 秒出" 优化。
