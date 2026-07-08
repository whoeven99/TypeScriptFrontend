# Shop Profile 驱动的翻译增强与本地化方案

> 目标：把当前的 `ShopProfile` 从“店铺画像展示结果”升级为**翻译上下文引擎**，
> 用于提升整店翻译的术语一致性、风格贴合度与本地化准确性。
>
> 这套能力不只服务 `shop profile` 页面，而是服务整个翻译链路：单条翻译、批量翻译、
> 再翻译、未来自动翻译，都应共享同一套店铺认知、术语规则与 locale 策略。
>
> 文档创建日期：2026-07-08。仓库：`TypeScriptFrontend`。

---

## 1. 目标重新定义：不是“画像页”，而是“翻译前知识层”

当前 `shop profile` 已具备“扫描店铺内容 → 生成行业/关键词/描述/品牌语气 → 展示结果”的基础能力，
但它的真正业务价值不在展示，而在于：

- **更理解商家的店铺**：知道店铺卖什么、面向谁、品牌语气是什么。
- **更早预判关键术语**：在翻译前识别品牌词、系列名、材质词、专有业务词，并提前准备术语库。
- **更贴近原文风格**：翻译不仅对齐字面意思，还要对齐品牌表达方式、营销力度和语气。
- **更适配本地化场景**：不同语言下处理更自然的表达、单位制、日期/数字格式、地区习惯。
- **把这些认知转成可执行的 prompt/context**：进入翻译模型，而不是停留在分析结果页。

一句话：`ShopProfile` 的定位应是“为翻译质量服务的商店知识层”。

---

## 2. 业务目标：我们希望最终改善什么

### 2.1 翻译质量目标

- 译文**更贴近原文真实意图**，不是机械直译。
- 同一术语在整店不同资源中**翻译一致**。
- 译文在目标市场读起来更像**当地商家自然写法**。
- 标题、卖点、说明、SEO 字段、按钮文案等不同字段类型，具备**不同翻译策略**。

### 2.2 本地化目标

- 语言风格更符合目标地区习惯，而不是只有“语言正确”。
- 计量单位、尺寸体系、货币、日期、数字表达等更符合当地认知。
- 保留品牌词、型号词、系列词等不应被随意改写的内容。
- 对“该意译还是该直译”“该保留英文还是应本地表达”有统一策略。

### 2.3 产品层目标

- 降低商家手动修正译文的频率。
- 降低“再翻译”的触发率。
- 让 `Glossary` 从被动维护变为“AI 预判 + 人工确认”的主动机制。
- 让翻译引擎逐渐形成**每个店铺自己的表达习惯**。

---

## 3. 当前现状：已经有什么，还缺什么

### 3.1 已有能力

当前代码库已具备一条完整的 `shop profile scan` 链路：

- 安装或手动触发扫描：`app/server/shopScan/trigger.server.ts`
- 任务状态与阶段管理：`app/server/shopScan/cosmos.server.ts`
- worker 执行扫描：`worker/src/workers/shopScanWorker.ts`
- 采集店铺事实：`worker/src/services/shopScan/shopContext.ts`
- 生成画像：`worker/src/services/shopScan/stageProfile.ts`
- 回写 `ShopProfile` / `ShopTargetLocale` / `Glossary`：`worker/src/services/shopScan/tsfWrite.ts`
- 页面与 API 展示：`app/routes/app.shop-profile/route.tsx`、`app/routes/api.shop-profile.ts`

### 3.2 当前已产出的结果

`ShopProfile` 当前可写入这些结构化字段：

- `shopName`
- `primaryLocale`
- `industry`
- `keywords`
- `description`
- `brandTone`
- `aiModel`
- `lastScanId`
- `lastScannedAt`

同时，扫描流程还能产出：

- 已发布目标语言与语言覆盖率
- AI 术语候选（写入 `Glossary`，默认待确认）
- 内容规模与模块统计

### 3.3 当前主要缺口

最关键的缺口不是“扫描不够”，而是**扫描结果还没有系统性接入翻译执行链路**：

- `ShopProfile` 现在更像“被展示的数据”，还不是“被翻译引擎消费的上下文”。
- 术语、风格、本地化策略尚未统一注入 prompt builder。
- 不同字段类型还没有按上下文做差异化翻译策略。
- 用户后续修正行为还没有有效反哺 `ShopProfile` / `Glossary` / locale policy。

> 结论：当前系统已经具备“店铺理解”的雏形，但还没有形成“翻译增强闭环”。

---

## 4. 核心方案：把 Shop Profile 升级成翻译上下文引擎

### 4.1 总体思路

翻译前统一构建一个“商店知识上下文包”，由三层组成：

1. **店铺认知层**：这家店卖什么、品牌怎么说话、目标客群是谁。
2. **术语规则层**：哪些词不能乱翻，哪些词必须统一翻，哪些词允许按语境调整。
3. **本地化策略层**：不同目标语言下，单位、货币、表达方式、地区习惯如何处理。

随后由统一的 prompt builder 将这三层信息与当前翻译字段的上下文合并，产出最终翻译提示词。

### 4.2 目标闭环

理想闭环应当是：

1. 扫描店铺内容，生成 `ShopProfile`
2. 从店铺内容和现有译文中提炼 `Glossary`
3. 基于目标语言生成 `Locale Policy`
4. 翻译前统一注入 `profile + glossary + locale policy + field context`
5. 用户对译文的修改与确认再反哺系统，持续提升结果

---

## 5. 数据模型建议：让 Profile 真正能指导翻译

当前 `ShopProfile` 的字段足够支持展示，但不足以完整指导翻译。建议后续将“翻译增强上下文”拆成以下结构。

### 5.1 Business Profile

用于描述店铺是什么：

- `industry`: 行业/品类
- `subCategories`: 细分类目
- `coreProducts`: 核心商品类型
- `targetAudience`: 目标客群
- `pricePositioning`: 价格带/定位
- `brandPositioning`: 品牌定位

### 5.2 Brand Voice

用于描述店铺怎么说话：

- `tone`: 专业 / 轻奢 / 活泼 / 极简 / 技术型 / 亲和 等
- `styleKeywords`: 风格关键词
- `marketingIntensity`: 营销强度，保守 / 中性 / 强销售
- `preferredSentenceStyle`: 偏简洁、偏说服、偏解释、偏 SEO
- `bannedStyles`: 不希望出现的表达风格

### 5.3 Terminology Policy

用于描述哪些词如何翻：

- `doNotTranslateTerms`: 品牌名、系列名、型号、专有名词
- `mustTranslateTerms`: 必须统一翻译的业务术语
- `preferredTranslations`: 推荐译法
- `termPriority`: P0 / P1 / P2 分级
- `termSources`: 人工、AI 历史归纳、AI 内容预判

### 5.4 Localization Policy

用于描述如何更像本地化表达：

- `unitSystem`: metric / imperial
- `sizeSystem`: 欧码 / 美码 / 通用尺寸
- `currencyDisplay`: 货币符号和数字习惯
- `dateFormat`: 日期格式
- `numberFormat`: 数字与千分位
- `localeTone`: 每个语言地区的语气倾向
- `marketSpecificVocabulary`: 地区常用词偏好

### 5.5 Field Strategy

用于描述不同字段类型的翻译策略：

- `title`: 简洁、突出卖点、不冗长
- `description`: 保留原文意图，兼顾可读性
- `seoTitle` / `metaDescription`: 更偏搜索语言
- `option` / `spec`: 更偏术语一致性与准确性
- `cta` / `button`: 采用目标市场常见短语，避免生硬直译

> 实现上不一定全部落同一张表，也可以拆为 `ShopProfile + ShopLocalePolicy + ShopPromptProfile`
> 等结构，但语义上要把这些维度明确下来。

---

## 6. 术语策略：让 Glossary 从“表”升级为“机制”

### 6.1 为什么术语要前置

翻译质量的很多问题，本质不是模型能力不足，而是模型在没有足够上下文时只能“临场发挥”。
尤其对于品牌名、材质词、商品系列、规格词、营销词，一旦第一次翻错，后面会整店漂移。

### 6.2 术语来源建议拆成三路

- **人工术语**：商家手动创建/确认，优先级最高。
- **历史译文归纳术语**：从已有稳定译文中提炼，可信度次高。
- **内容预判术语**：从商品、集合、页面、metafield 等内容中提前识别出的候选术语。

### 6.3 术语分级

- `P0`：绝对不能翻错或不应翻译，如品牌名、系列名、型号
- `P1`：高频核心业务词，必须整店一致
- `P2`：建议统一，但允许按语境微调

### 6.4 翻译时的注入优先级

1. 人工确认术语
2. 已确认 AI 术语
3. 高置信候选术语
4. 仅供参考的 profile 关键词

> 目标不是“把所有关键词都塞进 prompt”，而是把最关键、最容易翻漂的词稳定下来。

---

## 7. 本地化策略：不仅译对，还要译得像当地商家

### 7.1 本地化不是语种切换

单纯把英文翻成法文/德文/日文，只解决了“能看懂”；真正的商家价值来自“更像当地在卖货”。

### 7.2 `Locale Policy` 需要覆盖的内容

- 单位制：`cm / inch`、`kg / lb`、`ml / oz`
- 尺寸体系：服装码、鞋码、儿童码
- 货币表达：货币符号位置、小数位、千分位
- 日期与时间：`MM/DD/YYYY`、`DD/MM/YYYY` 等
- 市场用词：同一语言在不同地区的惯用法差异
- 风格差异：如德语更精确、日语更克制、英文营销表达更直接

### 7.3 本地化策略的来源

- 显式规则：根据目标 locale 固定配置
- 店铺偏好：根据店铺内容与目标市场推断
- 用户修正：商家对结果的手动更改与确认

> 设计原则：`Locale Policy` 应集中管理，而不是散落在每个翻译函数中各自处理。

---

## 8. Prompt Builder：把 Profile 真正接进翻译执行链路

### 8.1 需要一个统一的 Prompt Builder

当前系统下一阶段最关键的工作，不是继续堆扫描字段，而是建立一层统一的 prompt builder。

它的输入建议至少包括：

- `shopProfile`
- `glossary`
- `localePolicy`
- `resourceType`
- `fieldKey`
- `fieldType`
- `sourceLocale`
- `targetLocale`
- `sourceText`
- `neighborContext`

输出是一份统一的“翻译上下文”，供单条翻译、批量翻译、再翻译共用。

### 8.2 Prompt Builder 应做的事

- 注入品牌行业与业务背景
- 注入必须遵守的术语规则
- 注入目标语言的本地化策略
- 根据字段类型切换不同提示模板
- 根据资源类型补充额外上下文

### 8.3 字段类型差异化策略

- `title`：短、准、读起来像商品标题
- `body_html` / `description`：保留品牌语气与说服性
- `seoTitle` / `metaDescription`：兼顾搜索与点击
- `option` / `variant` / `spec`：优先术语准确性
- `cta` / `button`：遵循目标市场常见表达，不生硬

> 目标是“同一个翻译模型，不同字段获得不同上下文与策略”，而不是所有字段都共用一套通用 prompt。

---

## 9. 反馈闭环：让系统持续变准

### 9.1 可以回流的信号

- 商家手动修改译文
- 商家新增/修改 glossary
- 某些字段频繁触发“再翻译”
- 某些语言下反复被修正的表达
- 某些候选术语被反复确认或拒绝

### 9.2 可以被更新的对象

- `ShopProfile` 的风格标签与描述
- `Glossary` 的优先级与可信度
- `Locale Policy` 的表达偏好
- prompt 模板中的策略权重

### 9.3 长期价值

长期最重要的不是“一次扫描生成很聪明的 profile”，而是让系统逐渐学会：

- 这个店喜欢怎么说话
- 这个店哪些词最重要
- 这个店在不同语言下希望呈现什么样的本地化风格

---

## 10. 分阶段落地建议

### Phase 1 — 定义可执行的数据结构

**目标**：先把“要给翻译用的上下文”定义清楚。

- 明确 `ShopProfile` 的翻译增强目标，而不是继续只围绕页面展示定义字段。
- 明确 `Glossary` 的来源、优先级和状态机。
- 新增或定义 `Locale Policy` 结构。
- 明确不同字段类型的 `Field Strategy`。

**产出**

- 数据结构草案
- 字段语义说明
- 数据来源说明

### Phase 2 — 增强扫描与归纳

**目标**：让扫描能产出足够指导翻译的信息。

- 扩大扫描素材来源：商品描述、页面、博客、metafield、历史译文、已有 glossary
- 识别候选术语、不可翻词、品牌表达习惯
- 补充本地化偏好信号

**产出**

- 更完整的 `ShopProfile`
- 候选术语集合
- locale 级提示信息

### Phase 3 — 接入 Prompt Builder

**目标**：把 profile 真正接入翻译链路。

- 建立统一的 prompt builder
- 对接单条翻译、批量翻译、再翻译
- 按字段类型做差异化 prompt 组装

**产出**

- 统一翻译上下文构建层
- 翻译前上下文注入能力

### Phase 4 — 建立人工确认与反馈闭环

**目标**：让系统随着商家使用而变准。

- 让 AI 术语可被人工确认/拒绝
- 记录商家对译文的修改行为
- 把高频修改反哺到 profile / glossary / locale policy

**产出**

- 可持续校准的知识层
- 更稳定的店铺个性化翻译能力

---

## 11. 推荐实施顺序：先打通最小闭环，不先追求大而全

建议按以下顺序推进：

1. **先定义结构**：`ShopProfile + Glossary + Locale Policy + Field Strategy`
2. **再建统一 Prompt Builder**
3. **优先接入主翻译链路**：单条翻译、批量翻译、再翻译
4. **再补扫描的广度和深度**
5. **最后做反馈回流与自学习**

原因：

- 如果不先接入 prompt builder，继续增强扫描只会产生更多“暂时没人消费”的字段。
- 如果不先统一结构，后续会把风格、术语、本地化规则散落在多个模块中，越做越碎。

---

## 12. 成功标准：如何判断这件事做成了

### 12.1 翻译效果指标

- 同一术语跨商品、页面、集合翻译一致性明显提升
- 译文更贴近原文意图，尤其是营销表达和品牌语气
- 本地化错误减少：单位、尺寸、货币、日期、地区用词

### 12.2 使用行为指标

- 商家手动修正次数下降
- “再翻译”触发率下降
- 人工确认术语的命中率提升
- 同店铺后续翻译稳定性提升

### 12.3 产品感知指标

- 商家感受到“系统更懂我的店”
- 不同语言结果更像当地真实商家文案
- 高价值页面（产品、集合、SEO、导航）质量显著提升

---

## 13. 与当前代码的衔接建议

当前可以直接复用的基础设施已经不少：

- `shopScanWorker` 的任务框架
- `stageProfile` 的画像生成能力
- `stageGlossary` 的 AI 术语提炼能力
- `ShopProfile` / `Glossary` / `ShopTargetLocale` 的落库链路
- `app.shop-profile` 页面和 `/api/shop-profile` 接口

下一阶段更值得优先投入的，不是重写这些，而是：

- 增加 `Locale Policy` 与 `Field Strategy` 的定义
- 建立 prompt builder
- 找到并改造当前翻译执行链路的 prompt/context 组装点
- 让 `ShopProfile` 从“结果页数据”变成“翻译时真实被消费的数据”

---

## 14. 开放项

1. `ShopProfile` 最终是一张表扩展，还是拆成 `ShopProfile + ShopLocalePolicy + ShopPromptProfile`？
2. `Locale Policy` 以“每店一份”为主，还是“每店 × 每目标语言一份”？
3. 候选术语是否需要引入“可信度/来源/确认状态”三元信息？
4. 单条翻译、批量翻译、再翻译目前的 prompt 组装入口分别在哪里，能否统一？
5. 用户修正行为的采集粒度做到什么程度，是否需要独立的反馈表？

---

## 15. 建议的下一步

这份文档确认后，建议紧接着产出一份更偏技术落地的设计稿，聚焦三件事：

1. `ShopProfile / Locale Policy / Prompt Context` 数据结构设计
2. 当前翻译链路中 prompt 组装点的代码定位与接入方案
3. Phase 1 的最小可落地改造清单

> 目标不是一次性把系统做满，而是优先打通“店铺知识层 → 翻译提示词 → 结果变好”的最小闭环。
