# manage 翻译页"保存"改直连 Shopify 方案

> 目标：把 18 个标准文本 manage 页的**保存**从"经 Java 代理写 Shopify"改为
> **前端直接调 Shopify `translationsRegister` / `translationsRemove`**，不再查询 SpringBackend。
>
> **本期范围**：仅"保存"。单条重译（`SingleTextTranslate`）、图片翻译、PageFly、统计**暂留 Java**（Shopify 无此能力）。
>
> 创建日期：2026-06-20。仓库：`TypeScriptFrontend`。

---

## 1. 为什么可行 & 改什么

manage 页的**读取**早已直连 Shopify（`admin.graphql` 查 `translatableResource.translations`），不碰 Java。
还在用 Java 的只有 `updateManageTranslation`（保存）。它的本质是个**代理**：

| confirmData 分支 | 现状 | 改造后 |
|---|---|---|
| value 非空（itemsToUpdate） | POST Java `/shopify/updateShopifyDataByTranslateTextRequest`（普通）或 `/shopify/updateItems`（OnlineStoreTheme），Java 再调 Shopify `translationsRegister` | **前端直接 `admin.graphql(translationsRegister)`** |
| value 为空（itemsToDelete） | **已经是**前端直连 Shopify `translationsRemove`（裸 fetch 到 `/admin/api/2024-10/graphql.json`） | 保持，统一改用 `admin.graphql` |

> 即：删除路径本来就没走 Java，只有"写入"路径绕了一圈 Java。改造就是把这一圈去掉。

### confirmData 数据形状（已满足 Shopify 入参）
每项：`{ id, resourceId, locale, key, value, translatableContentDigest, target }`
正好对应 Shopify `TranslationInput { locale, key, value, translatableContentDigest }`（按 `resourceId` 分组注册）。

---

## 2. 受影响页面（18 个 · A 类）
product, collection, page, article, blog, email, navigation, delivery, shop,
metaobject, metafield, filter, locale_content, json_template, policy,
settings_category, section_group, settings_data_sections

**不在本期**（保留 Java）：
- `manage_translation`（汇总页）：`GetTranslationItemsInfo` + `TranslateImage` + `storageTranslateImage`
- `productImage`：`GetProductImageData` + `DeleteProductImageData`
- `productImageAlt`：`GetProductImageData` + `UpdateProductImageAltData` + `SingleTextTranslate`
- `pagefly`：`SingleTextTranslate`
- 以上 18 页里的 `SingleTextTranslate`（单条重译）调用**全部保留**。

---

## 3. 设计：一个共享 helper

新建 `app/server/shopify/translations.server.ts`，导出与现有调用**同形状**的保存函数，
最大限度减少页面改动：

```ts
// 入参与 updateManageTranslation 一致，但用 admin（GraphQL 客户端）替代裸 accessToken
export async function registerManageTranslations({
  admin,
  confirmData,
}: {
  admin: AdminApiContext;     // 来自 authenticate.admin(request)
  confirmData: TranslationItem[];
}): Promise<SaveResult[]> { … }
```

行为：
1. **拆分**：与现逻辑一致——按"去 HTML 后是否为空"拆 `itemsToUpdate` / `itemsToDelete`。
   - 注意修掉现有 Java 实现的一个隐患：register 分支里 `confirmData.map(...)`（含空项），应改为遍历 `itemsToUpdate`。
2. **register**：按 `resourceId` 分组，每组 ≤250 条一批，调
   ```graphql
   mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
     translationsRegister(resourceId: $resourceId, translations: $translations) {
       userErrors { field message }
       translations { key locale value }
     }
   }
   ```
   `TranslationInput = { locale, key, value, translatableContentDigest }`。
3. **remove**：按 `resourceId` 分组，调 `translationsRemove(resourceId, translationKeys, locales)`（复用现删除路径，改用 `admin.graphql`）。
4. **返回**：保持 `{ success, errorCode, errorMsg, response }[]` 形状，把 `userErrors` 映射成 `success:false`，页面 UI 逻辑无需改。

> 用 `admin.graphql` 而非裸 fetch：自动带 API 版本与鉴权，去掉硬编码的 `2024-10` 和 `X-Shopify-Access-Token`。

### 每页改动（机械、统一）
```diff
- import { SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
+ import { SingleTextTranslate } from "~/api/JavaServer";
+ import { registerManageTranslations } from "~/server/shopify/translations.server";
  …
  case !!confirmData:
-   const data = await updateManageTranslation({ shop, accessToken: accessToken as string, confirmData });
+   const data = await registerManageTranslations({ admin, confirmData });
    return { success: true, errorCode: 0, errorMsg: "", response: data };
```
`admin` 在各页 action 里已有（`const { admin } = adminAuthResult`）。`SingleTextTranslate` 保留不动。

---

## 4. 兼容性 / 风险点

1. **`translatableContentDigest` 必须新鲜**：digest 来自同一次页面读取（Shopify），过期会触发 `userErrors`。页面读写在同一会话，正常无碍；helper 要把 userErrors 透出，避免"假成功"。
2. **OnlineStoreTheme**：Java 之所以分批走 `/shopify/updateItems`，多半只是批量策略。`translationsRegister` 对 theme 资源同样有效，按 resourceId+250 上限分批即可——**需用一个 theme JSON 模板页（如 `json_template`/`settings_data_sections`）实测确认**。
3. **批量上限**：`translationsRegister` 单次每 resourceId ≤250 条。大资源（产品多 metafield、theme 多 key）必须分批。
4. **错误语义对齐**：现页面只看 `success`。helper 任一条 userError → 该条 `success:false`，整体可返回部分失败明细，UI 行为与现状一致。
5. **额度无关**：保存不消耗额度（只有翻译消耗），无额度联动。
6. **并发**：现 Java 实现用 `pLimit(7)`。直连后按 resourceId 分组本就把请求数压下来了，必要时对分组调用同样加 `pLimit`。
7. **不动删除语义**：空值 = 删除该 key 译文，保持。

---

## 5. 落地步骤

1. **写 helper** `translations.server.ts` + 类型，单测覆盖：register / remove / 分批 / userError 映射。
2. **试点 1 页**：`product`（字段最杂：标题、metafield、option、variant），跑通保存 + 删除 + theme 无关项。
3. **试点 1 个 theme 页**：`json_template` 或 `settings_data_sections`，验证 OnlineStoreTheme 直连可行（对应风险点 2）。
4. **推广其余 16 页**：统一 diff 套用。
5. **回归**：每类资源各存一次/删一次，对照 Shopify 后台译文，确认与改造前一致。
6. **清理**：确认 18 页不再引用后，`updateManageTranslation` 可从 `JavaServer.ts` 移除（**但 `SingleTextTranslate` 及图片相关保留**）。

---

## 6. 待确认
1. theme 资源（OnlineStoreTheme）直连 `translationsRegister` 实测是否与 Java 路径等效（风险点 2）。
2. 是否要顺手统一删除路径到 `admin.graphql`（建议是，去掉硬编码 API 版本）。
3. 试点范围：先 `product` 1 页评审，还是 `product` + 1 theme 页一起？
