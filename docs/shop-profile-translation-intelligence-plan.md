# Shop Profile 驱动的翻译增强与本地化方案

> 目标：把当前的 `ShopProfile` 从“店铺画像展示结果”升级为**翻译上下文引擎**，
> 用于提升整店翻译的术语一致性、风格贴合度与本地化准确性。
>
> 这套能力不只服务 `shop profile` 页面，而是服务整个翻译链路：单条翻译、批量翻译、
> 再翻译、未来自动翻译，都应共享同一套店铺认知、术语规则与 locale 策略。
>
> 文档创建日期：2026-07-08。仓库：`TypeScriptFrontend`。

---

## 1. 文档结论

这件事的本质不是再做一个“画像页”，而是建立一层**翻译前知识层**：

- 它要理解店铺卖什么、怎么组织商品、如何表达品牌。
- 它要理解店铺面向哪些市场、这些市场的语言和货币配置是什么。
- 它要从真实店铺内容中提取关键词、品牌词、卖点词、SEO 词、风格信号。
- 它要把这些信号转成术语建议、本地化策略和模块级翻译策略。
- 它最终要进入翻译执行链路，而不是停留在展示页。

一句话：`ShopProfile` 的定位应是“为翻译质量服务的商店知识与策略中心”。

---

## 2. 最终目标

### 2.1 翻译效果目标

- 译文更贴近原文真实意图，而不是机械直译。
- 同一术语在整店不同资源中保持一致。
- 不同模块的译文更符合该模块的用途与限制。
- 品牌语气、卖点表达、SEO 表达在多语言下更稳定。

### 2.2 本地化目标

- 语言风格符合目标市场习惯，而不是只有“语言正确”。
- 计量单位、尺寸体系、货币、日期、数字表达更符合当地认知。
- 能根据 `markets` 配置生成市场级本地化策略，而不只靠 locale 猜测。
- 对“该直译、该意译、该保留品牌词”有稳定规则。

### 2.3 产品目标

- 降低商家手动修正译文的频率。
- 降低“再翻译”的触发率。
- 让 `Glossary` 从被动维护变成“AI 预判 + 人工确认”的主动机制。
- 让系统逐渐形成“更懂这个店”的长期能力。

---

## 3. 当前现状

### 3.1 已有基础设施

当前代码库已具备一条完整的 `shop profile scan` 链路：

- 安装或手动触发扫描：`app/server/shopScan/trigger.server.ts`
- 任务状态与阶段管理：`app/server/shopScan/cosmos.server.ts`
- worker 执行扫描：`worker/src/workers/shopScanWorker.ts`
- 采集店铺事实：`worker/src/services/shopScan/shopContext.ts`
- 生成画像：`worker/src/services/shopScan/stageProfile.ts`
- 回写 `ShopProfile` / `ShopTargetLocale` / `Glossary`：`worker/src/services/shopScan/tsfWrite.ts`
- 页面与 API 展示：`app/routes/app.shop-profile/route.tsx`、`app/routes/api.shop-profile.ts`

### 3.2 当前能产出的信息

当前系统已经能得到：

- 店铺基础信息：`shopName`、`primaryLocale`、`currencyCode`、`primaryDomain`
- 初步画像：`industry`、`keywords`、`description`、`brandTone`
- 翻译覆盖率：按目标语言统计 `translated / total`
- AI 术语候选：写入 `Glossary`，默认待确认
- 内容规模：按模块统计 `items / chars`

### 3.3 当前核心缺口

当前最关键的问题不是“数据完全没有”，而是**数据结构和加工链路还不够支持翻译增强**：

- 缺 `markets` 维度的本地化策略输入。
- 缺 `theme / collection / menu / article summary` 等更适合做归纳的信号输入。
- 缺从翻译数据中做清洗、抽样、词频、聚类、来源加权的信号提取层。
- 缺模块级翻译策略。
- 缺统一的 prompt builder，把这些信息真正注入翻译执行链路。

---

## 4. 目标方案总览

建议将整条链路统一定义为：

1. **采集数据**：从 Shopify 和现有翻译数据中取得结构化输入
2. **信号提取**：清洗、归一化、抽样、统计、聚类、归类
3. **AI 归纳**：基于高质量样本归纳行业、卖点、风格、术语和策略方向
4. **策略产出**：形成 `Shop Intelligence / Terminology / Market Policy / Module Policy`
5. **翻译注入**：统一进入单条翻译、批量翻译、再翻译链路
6. **反馈回流**：根据人工修正与确认持续校准

### 4.1 为什么要分层

不建议直接把全量原始文本扔给 AI，原因是：

- 噪音太大
- 成本太高
- 稳定性差
- 难以解释 AI 为什么会给出某个判断
- 后续难以通过工程手段持续优化

因此建议由：

- 规则和统计负责降噪、抽样、排序
- AI 负责理解、归纳、定方向
- 翻译链路负责把结果落实到 prompt 和模块策略里

---

## 5. 输入数据范围

### 5.1 Shopify 结构化数据

这部分不是翻译文本本身，但对本地化策略很关键：

- `shop meta`
  - 用于判断行业、品牌定位、业务类型、店铺基础认知
- `markets`
  - 用于判断店铺启用了哪些市场
  - 每个市场有哪些语言、货币、本地化配置
  - 是制定市场级本地化策略的核心输入

### 5.2 可从翻译数据获得的内容样本

除 `markets` 外，大部分高价值信号都可以从现有可翻译内容中获得。建议重点覆盖：

- `theme json template` 文本
- `product.title`
- `article.title`
- `article.summary`
- `collection.title`
- `collection.description`
- `menu.title`
- `menu item title`
- 后续可扩展：
  - `product.description`
  - `page.title / body`
  - `seo title`
  - `meta description`

### 5.3 为什么这些来源重要

- `theme`
  - 最能体现品牌主叙事、视觉文案、CTA 和品牌语气
- `product`
  - 最能体现具体售卖商品、商品命名方式、规格词和卖点词
- `article`
  - 最能体现 SEO 和内容营销方向
- `collection`
  - 最能体现店铺如何组织品类、分类词和类目层级
- `menu`
  - 最能体现高优先级导航词、信息架构和商家主动暴露给用户的核心表达

---

## 6. 目标输出对象

建议后续不要把所有结果都塞进一个 `ShopProfile` 表，而是按语义拆成几个对象。

### 6.1 Shop Intelligence

描述“这是什么店”：

- `industry`
- `subIndustry`
- `businessModel`
- `brandPositioning`
- `priceRange`
- `coreProductTypes`
- `brandTraits`
- `voiceStyle`

### 6.2 Market Profile

描述“这家店面向哪些市场”：

- `marketId`
- `marketName`
- `languages`
- `currencies`
- `primaryLocale`
- `primaryCurrency`
- `regionalNotes`
- `localizationPolicy`

### 6.3 Content Signals

描述“这家店实际怎么写内容、卖什么”：

- `topKeywords`
- `brandTerms`
- `categoryTerms`
- `sellingPoints`
- `seoTerms`
- `styleSignals`
- `themeMessaging`
- `siteStructureSignals`

### 6.4 Terminology Profile

描述“哪些词必须控制”：

- `doNotTranslateTerms`
- `preferredTerms`
- `seoTerms`
- `marketSpecificTerms`
- `aiSuggestedTerms`
- `confidence`
- `reviewStatus`

### 6.5 Module Translation Policy

描述“不同模块该怎么翻”：

- `module`
- `lengthLimit`
- `seoPriority`
- `tonePolicy`
- `keywordPolicy`
- `literalVsAdaptive`
- `shopifyConstraints`

> 实现上可以落成 `ShopProfile + ShopMarketProfile + ShopPromptProfile + GlossarySignals`
> 等结构；重点不是表名，而是语义边界清楚。

---

## 7. 关键设计：如何从原始翻译数据提取可供 AI 使用的高质量样本

这一节是整条链路里最关键的部分。

难点不在“拿不到数据”，而在于：

- 如何从大量翻译数据中提取有效样本
- 如何抽样，避免噪音和重复
- 如何判断哪些词值得进入 AI 归纳
- 是否要做词频、共现、聚类、来源加权

结论是：**要做词频，但不能只做词频。**

建议采用：

- `词频 + 来源权重 + 字段类型 + 共现关系 + 结构位置 + AI 判断`

而不是只做一个简单的高频词表。

---

## 8. 信号提取链路

建议将原始内容样本的加工分为 6 步。

### 8.1 建立原始文本池

先按来源分桶，而不是把所有文本混在一起：

- `theme_texts`
- `product_titles`
- `article_titles`
- `article_summaries`
- `collection_titles`
- `collection_descriptions`
- `menu_titles`
- `menu_item_titles`
- `seo_titles`
- `meta_descriptions`

每条样本都应带 metadata，例如：

- 来源
- 模块
- 字段类型
- 资源类型
- 资源 id
- locale
- 原始文本
- 权重

### 8.2 清洗与归一化

目标是把“脏文本”变成“可分析样本”：

- 去 HTML、去模板变量、去多余空格
- 去重
- 统一大小写和基础格式
- 过滤纯噪音文本
- 过滤过短且无业务意义文本
- 识别并保留品牌名、系列名、型号、材质、单位、数值规格等特殊实体

### 8.3 来源加权

不同来源的业务价值不同，不应该一视同仁。

第一版建议权重思路：

- `menu / menu item`：高权重
- `collection title`：高权重
- `theme 文案`：高权重
- `product title`：高权重
- `article title / summary`：中高权重
- `seo title / meta description`：中高权重
- `description` 类长文本：中权重

原因：

- `menu` 代表商家主动暴露的核心入口
- `collection` 代表品类组织方式
- `theme` 代表品牌表达
- `product title` 代表商品命名与卖点压缩
- `article` 代表内容营销和 SEO 语境

### 8.4 统计与结构化提取

建议至少做 4 类信号提取。

#### 8.4.1 加权词频

- 统计 unigram / bigram / trigram
- 使用加权频次，而不是裸频次
- 更适合提取类目词、卖点词、SEO 词苗子

#### 8.4.2 实体识别

重点识别：

- 品牌词
- 产品线 / 系列词
- 型号词
- 材质词
- 功能词
- 规格词
- 单位词
- 地区词

#### 8.4.3 共现分析

看哪些词经常一起出现，例如：

- 材质 + 商品类型
- 风格词 + 商品类型
- 功能词 + 场景词

它有助于判断：

- 真正的商品类型
- 卖点组合
- 品牌常用表达
- 可能需要固定搭配翻译的术语组合

#### 8.4.4 结构位置信号

同一个词出现在不同位置，业务价值不同：

- 出现在 `menu`：高优先级导航词
- 出现在 `collection title`：分类词
- 出现在 `product title`：商品命名词
- 出现在 `theme hero`：品牌表达词
- 出现在 `meta description`：SEO 导向词

因此每个词项都应保留来源分布。

### 8.5 抽样策略

不建议随机抽样，建议采用**分层抽样 + 代表性抽样**：

- 按来源抽样：theme / product / article / collection / menu
- 按词项覆盖抽样：优先覆盖高权重高分词
- 按相似度去重：避免大量近似商品标题淹没 AI
- 按业务价值抽样：首页文案、主导航、核心集合优先

建议第一版做法：

- `menu`：接近全量
- `collection`：高权重集合标题接近全量
- `theme`：取 hero、banner、核心 section 文案
- `product title`：去重后按类聚合，每类取代表
- `article`：取标题和 summary 的代表样本

### 8.6 结构化中间结果

在进入 AI 前，先生成一个中间对象，例如：

- `coreCategoryTerms`
- `brandTerms`
- `productTypeTerms`
- `sellingPointTerms`
- `seoTerms`
- `stylePhrases`
- `unitTerms`
- `priceSignals`
- `weightedTopTerms`
- `representativeSamples`

这一步的价值在于：

- AI 看的是高质量样本，而不是混乱原始文本
- 工程侧可以解释 AI 的输入依据
- 后续可以调权重、调抽样，而不必频繁改 AI prompt

---

## 9. AI 归纳链路

建议 AI 不要一次性同时完成“店铺理解 + 术语生成 + 模块策略”。

更稳妥的做法是拆成两步。

### 9.1 第一步：店铺理解归纳

输入：

- `shop meta`
- `markets`
- `Content Signals`
- 分层代表样本

输出：

- 行业判断
- 核心商品类型
- 品牌定位
- 卖点归纳
- 价格区间判断
- 语言风格判断
- SEO 导向判断
- 市场级本地化关注点

### 9.2 第二步：术语与策略归纳

基于第一步结果，再输出：

- 品牌词
- 不翻译词
- 建议固定译法
- SEO 关键词建议
- 市场相关术语建议
- 模块级翻译建议

这样可以把“理解”和“决策”分开，提升稳定性和可控性。

---

## 10. 术语策略

### 10.1 术语来源

术语来源建议拆成三路：

- 人工术语：商家手动创建/确认，优先级最高
- 历史译文归纳术语：从已有稳定译文中提炼
- 内容预判术语：从 `theme / product / article / collection / menu` 中提前识别

### 10.2 术语分级

- `P0`：绝对不能翻错或不应翻译，如品牌名、系列名、型号
- `P1`：高频核心业务词，必须整店一致
- `P2`：建议统一，但允许按语境微调

### 10.3 术语注入优先级

1. 人工确认术语
2. 已确认 AI 术语
3. 高置信候选术语
4. 仅供参考的 profile 关键词

目标不是把所有词都塞进 prompt，而是把最关键、最容易漂移的词稳定下来。

---

## 11. 市场与本地化策略

### 11.1 为什么 `markets` 是核心输入

本地化策略不能只靠 `targetLocale` 猜测。

必须知道：

- 店铺启用了哪些市场
- 每个市场对应哪些语言
- 每个市场使用什么货币
- 商家实际配置的市场边界是什么

这决定了：

- 语言风格是按语言还是按市场区分
- 货币、单位、尺寸是否要做本地化处理
- 哪些词需要市场级差异表达

### 11.2 Locale Policy 应覆盖的内容

- 单位制：`cm / inch`、`kg / lb`、`ml / oz`
- 尺寸体系：服装码、鞋码、儿童码
- 货币表达：符号位置、小数位、千分位
- 日期和数字格式
- 地区用词偏好
- 风格偏好：正式、自然、营销导向、克制等

### 11.3 Policy 的来源

- 市场配置：`markets`
- 店铺内容信号：主题文案、集合、导航、文章
- 用户修正行为：后续反馈回流

---

## 12. 模块级翻译策略

系统最终不能只有一套通用翻译策略，而需要按模块做差异化。

### 12.1 为什么要做模块策略

不同模块的要求不同：

- 有些字段更重 SEO
- 有些字段更重字数限制
- 有些字段更重品牌语气
- 有些字段更重术语准确性

### 12.2 第一批建议覆盖的模块

- `PRODUCT_TITLE`
- `ARTICLE_TITLE`
- `ARTICLE_SUMMARY`
- `COLLECTION_TITLE`
- `MENU_ITEM`
- `SEO_TITLE`
- `META_DESCRIPTION`
- `THEME_JSON_TEXT`

### 12.3 每个模块建议定义的策略项

- `lengthLimit`
- `seoPriority`
- `tonePolicy`
- `keywordPolicy`
- `literalVsAdaptive`
- `brandPreservation`
- `shopifyConstraints`

### 12.4 设计原则

翻译时要同时考虑：

- Shopify 模块本身的限制
- 原文风格
- SEO 思路
- 店铺品牌语气
- 市场本地化要求

---

## 13. Prompt Builder：把这些结果真正接入翻译链路

下一阶段最关键的工作，不是继续堆扫描字段，而是建立统一的 prompt builder。

### 13.1 输入建议

- `shopIntelligence`
- `marketProfile`
- `terminologyProfile`
- `modulePolicy`
- `resourceType`
- `fieldKey`
- `fieldType`
- `sourceLocale`
- `targetLocale`
- `sourceText`
- `neighborContext`

### 13.2 输出目标

输出统一的翻译上下文，供：

- 单条翻译
- 批量翻译
- 再翻译

共用同一套上下文构造逻辑。

### 13.3 Prompt Builder 负责的事

- 注入行业与业务背景
- 注入品牌和风格信息
- 注入必须遵守的术语规则
- 注入市场级本地化策略
- 注入模块级约束与提示

---

## 14. 反馈闭环

### 14.1 可回流的信号

- 商家手动修改译文
- 商家新增 / 修改 glossary
- 某些字段频繁触发再翻译
- 某些候选术语被确认或拒绝
- 某些语言市场下反复修正的表达

### 14.2 可被更新的对象

- `Shop Intelligence`
- `Terminology Profile`
- `Market Profile`
- `Module Policy`
- prompt 模板中的策略权重

### 14.3 长期目标

长期最有价值的不是“一次扫描生成很聪明的 profile”，而是让系统逐渐学会：

- 这个店喜欢怎么说话
- 这个店哪些词最重要
- 这个店在不同市场下希望呈现什么样的风格

---

## 15. 推荐实施顺序

### Phase 1 — 先定义结构

目标：先把要服务翻译的上下文定义清楚。

- 明确 `Shop Intelligence / Market Profile / Terminology / Module Policy`
- 明确字段语义、状态和来源
- 明确哪些结果是“系统自动生成”，哪些允许人工确认

### Phase 2 — 增加输入源

目标：补齐关键输入。

- 增加 `markets`
- 增加 `theme`
- 增加 `collection`
- 增加 `menu`
- 增加 `article summary`

### Phase 3 — 建立信号提取层

目标：不是直接喂 AI，而是先做工程化提纯。

- 文本清洗
- 去重与归一化
- 来源加权
- 词频与共现
- 聚类与分层抽样
- 中间信号对象产出

### Phase 4 — 建立 AI 归纳层

目标：基于高质量样本输出方向而不是直接翻译。

- 先做店铺理解归纳
- 再做术语和策略归纳
- 输出结构化结果

### Phase 5 — 接入 Prompt Builder

目标：把这些结果真正接进翻译执行链路。

- 单条翻译接入
- 批量翻译接入
- 再翻译接入
- 模块级策略生效

### Phase 6 — 建立反馈闭环

目标：让系统随使用越来越准。

- 人工确认术语
- 记录译文修正
- 回流到知识层与策略层

---

## 16. 成功标准

### 16.1 翻译质量

- 同一术语跨商品、集合、导航、页面翻译一致性明显提升
- 译文更贴近原文意图，尤其是营销表达与品牌语气
- 不同模块的翻译更符合模块用途和限制

### 16.2 本地化质量

- 单位、尺寸、货币、日期、地区用词错误显著减少
- 不同市场的结果更符合当地商家语言习惯

### 16.3 使用行为

- 商家手动修正次数下降
- “再翻译”触发率下降
- 人工确认术语的命中率提升

---

## 17. 与当前代码的衔接建议

当前可以直接复用的基础设施已经不少：

- `shopScanWorker` 的任务框架
- `stageProfile` 的画像生成能力
- `stageGlossary` 的 AI 术语提炼能力
- `ShopProfile` / `Glossary` / `ShopTargetLocale` 的落库链路
- `app.shop-profile` 页面和 `/api/shop-profile` 接口

下一阶段更值得优先投入的，不是重写这些，而是：

- 扩展输入源
- 建立信号提取层
- 建立 prompt builder
- 找到并改造当前翻译执行链路的 prompt/context 组装点
- 让 `ShopProfile` 从“结果页数据”变成“翻译时真实被消费的数据”

---

## 18. 开放项

1. `ShopProfile` 最终是一张表扩展，还是拆成多个对象表？
2. `Market Profile` 应按“每店一份”还是“每店 × 每市场一份”保存？
3. 候选术语是否需要引入“可信度 / 来源 / 确认状态”三元信息？
4. 词频、共现、聚类的第一版做到多深，哪些放到二期？
5. 单条翻译、批量翻译、再翻译目前的 prompt 组装入口分别在哪里，能否统一？
6. 用户修正行为的采集粒度做到什么程度，是否需要独立反馈表？

---

## 19. 建议的下一步

这份文档确认后，建议继续产出一份更偏技术落地的设计稿，聚焦 4 件事：

1. `Shop Intelligence / Market Profile / Terminology / Module Policy` 数据结构设计
2. 输入源读取方案，包括 `markets / theme / collection / menu` 的采集方式
3. 信号提取链路设计，包括清洗、加权、词频、聚类、抽样
4. 当前翻译链路中 prompt builder 的接入点与最小可落地改造清单

> 目标不是一次性把系统做满，而是优先打通“输入数据 → 信号提取 → AI 归纳 → 翻译策略注入”的最小闭环。
