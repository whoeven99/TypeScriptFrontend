# Shopify 翻译 App 视觉优化计划

## Summary

本次优化的目标不是单纯“让页面更好看”，而是把当前项目收敛为一套更符合 Shopify Admin 语境的专业工作台视觉体系：简单好用、专业可信，并通过更清晰的信息结构强调“翻译对商店转化率的价值”。

本计划聚焦两个页面与其共享底座：

- `app/routes/app.translate-v4/*`
- `app/routes/app.pricing/*`
- `app/ui/theme.ts`
- `app/ui/components/*`
- `app/styles.css`

总体策略：

- 以 Polaris 语义 token 作为唯一视觉源，避免 `translate-v4` 和 `pricing` 继续维护独立视觉系统。
- 明确整体视觉气质为“Shopify Admin 中性的专业底色 + AI 翻译工具的冷静智能感 + 对增长价值的低饱和强调”，避免只有规则没有气质，也避免重新走向营销页。
- 在正式落地到现有页面前，先产出一个独立 HTML 视觉预览页，用来验证风格方向、配色层级和页面气质。
- 将 `translate-v4` 重构为“翻译任务工作台”，突出状态、覆盖率、下一步动作与结果反馈。
- 将 `pricing` 重构为“Billing / Plan 管理页”，突出当前计划、额度状态、升级与加购的决策路径，而不是延续营销落地页式强调。
- 用更克制的信息表达方式承载“翻译提升转化”的价值，不依赖高饱和装饰、过大字号或多个竞争型 CTA。
- 不把配色方案写死成少数固定颜色值，而是建立“中性底 + 品牌强调 + 场景强调”的柔性配色层，保证后续能调性统一、局部可调。

本计划基于以下已读材料与现状文件：

- `design.md`
- `ui-refactor-audit.md`
- `ui-execution-plan.md`
- `app/routes/app.translate-v4/route.tsx`
- `app/routes/app.translate-v4/v4Styles.ts`
- `app/routes/app.translate-v4/components/SummaryAndHeader.tsx`
- `app/routes/app.translate-v4/components/CreateTaskCard.tsx`
- `app/routes/app.translate-v4/components/CoverageCard.tsx`
- `app/routes/app.pricing/route.tsx`
- `app/routes/app.pricing/style.css`
- `app/routes/app.pricing/components/acountInfoCard.tsx`
- `app/ui/theme.ts`
- `app/ui/components/AppPageHeader.tsx`
- `app/ui/components/AppSectionCard.tsx`
- `app/ui/components/AppStatusBadge.tsx`

同时参考了 Shopify 官方设计与计费原则：

- Shopify App Design Guidelines：嵌入式 App 应尽量贴近 Shopify Admin 体验，使用 Polaris 组件与最佳实践。
- Polaris Layout Density：高密度信息页强调效率与清晰分区，低密度编辑页强调上下文切换与卡片分组。
- Shopify Billing Best Practices：定价应简单清晰、计划数量可比较，升级降级路径明确，价格规则易懂。

## Current State Analysis

### 1. 全局底座已经存在，但页面层仍在“各自定义风格”

当前项目已经有一套可复用的设计底座：

- `app/ui/theme.ts` 已把 Ant Design 的 `colorPrimary`、`colorText`、`colorBorder`、`colorBgContainer` 等映射到 Polaris token。
- `app/styles.css` 已定义 `--app-color-*`、`--app-font-size-*`、`--app-space-*` 等全局变量。
- `AppPageHeader`、`AppSectionCard`、`AppStatusBadge` 已提供统一头部、卡片、状态标签雏形。

但页面层并未完全回到这套底座，导致“有主题但没有统一风格”：

- `translate-v4` 使用 `v4Styles.ts` 维护独立蓝色系、状态色与文字灰阶。
- `pricing` 已开始接入共享组件，但仍保留部分营销式标签、价格放大表达和局部强强调逻辑。

### 2. `translate-v4` 的核心问题是“专业，但不像 Shopify Admin”

从 `app/routes/app.translate-v4/v4Styles.ts` 与相关组件可见：

- 存在大量自建十六进制颜色，如 `#1677ff`、`#52c41a`、`#faad14`、`#ff4d4f`、`#1f1f1f`。
- `SummaryDonutCard`、`CoverageCard`、`TaskQueueSection` 采用浅蓝渐变、亮蓝进度、强调描边等产品工具风格。
- `PageHeaderBar` 更像“店铺信息条 + 计划/积分信息条”，而不是清晰的页面头部。
- `CreateTaskCard`、`CoverageCard`、任务列表都能工作，但信息密度偏高，且多个区域的视觉重心较接近。
- `SupportChatWidget.tsx` 使用完全自定义固定悬浮面板，容易与页面主任务抢焦点。

这与 `design.md` 的以下原则不一致：

- 视觉标准来自 Polaris，页面不要自建第二套品牌体系。
- 标题、正文、辅助信息应主要依赖字级、字重和间距区分，而不是通过更重颜色和更强装饰区分。
- 同一页面保持一致的信息密度。

### 3. `pricing` 的核心问题是“内容完整，但表达仍偏营销页”

从 `app/routes/app.pricing/route.tsx`、`style.css`、`acountInfoCard.tsx` 可见：

- 页面已接入 `AppPageHeader`、`AppSectionCard`、`AppStatusBadge`，说明结构收敛已经开始。
- 但套餐卡仍用 `Tag color="blue"`、`Tag color="gold"` 表达“当前计划 / 推荐计划”。
- `pricing-plan-card__price` 使用 `36px` 价格字号，视觉强度偏高。
- 年付优惠 `Save 20%`、推荐标签、不同按钮强度共同存在，页面同时出现多个“视觉重点”。
- Credits 购买、套餐升级、FAQ 是三条相邻线索，但主决策路径还不够清晰。
- Pricing 页面虽然比旧营销式设计克制很多，但仍残留“落地页思路”，与 `design.md` 所要求的“后台应用内的冷静、可信 Billing 页”仍有距离。

### 4. 设计目标与业务目标之间还缺一个“价值表达层”

用户给出的业务目标是：

- 这是一个 Shopify 翻译 App
- 要简单好用
- 要体现专业度
- 要强调翻译带来的商店转化率价值

当前实现存在两个问题：

- `translate-v4` 强调的是“能力面板”，但还没有把“翻译覆盖率为什么重要”表达清楚。
- `pricing` 强调的是“计划与价格”，但还没有把“升级计划为何能减少商家运营摩擦、提升跨语言成交效率”表达清楚。

因此这次优化不仅是视觉清理，还需要把价值表达嵌入信息结构与说明文案层。

### 5. 风格方向与配色策略目前“不明确且过硬”

从 `design.md` 和现有代码的组合来看，当前系统已经明确“不要乱用颜色”，但还没有给出一套足够清晰的视觉气质和柔性配色策略：

- 文档对 token 约束较清楚，但对“这个产品究竟该呈现什么视觉氛围”描述不足。
- 当前配色原则更偏“防止出错”，而不是“指导做出有辨识度但不过度张扬的界面”。
- 页面一旦不再使用硬编码色，容易退化成“纯灰白后台”，缺少产品感。
- 页面一旦自行补强颜色，又容易回到 `translate-v4` 的独立蓝色体系或 `pricing` 的半营销式强调。

因此，本次计划必须补上一层明确决策：

- 要有清晰视觉风格。
- 但这个风格不能通过写死几十个颜色值来实现。
- 应通过“角色化配色系统”和“页面级强调边界”来落地。

## Proposed Changes

### 变更组 A：建立明确但不僵硬的视觉方向与配色机制

#### 文件

- `design.md`
- `app/ui/theme.ts`
- `app/styles.css`
- `app/routes/app.translate-v4/v4Styles.ts`
- `app/routes/app.pricing/style.css`

#### What

- 补齐一套明确的视觉风格方向说明和可执行的柔性配色体系。
- 不再只说“用 Polaris token”，而是明确“哪些地方应该中性、哪些地方可以强调、强调应该长什么样”。

#### Why

- 当前文档更像底线约束，缺少风格方向，导致执行时容易两极化：要么太灰、太保守，要么回到局部强营销和独立色盘。
- Polaris 官方配色原则强调：Admin 应以中性黑白为底，让真正重要的彩色信息更有力量；彩色应用于重点区域、状态和强调，不应铺满大面积界面。
- 用户明确指出当前颜色配置会比较死板，因此需要把“可调性”纳入方案，而不是继续增加固定色值。

#### How

1. 在 `design.md` 增补“视觉风格方向”章节，明确本产品的基调：
   - 关键词：`专业`、`克制`、`智能`、`全球增长`
   - 气质定义：像 Shopify Admin 内的一款高可信效率工具，而不是外部 SaaS 营销页
   - 表达方式：通过布局秩序、信息层级、轻强调表面和少量关键色建立辨识度
2. 在 `design.md` 增补“柔性配色框架”而不是继续列死颜色：
   - `中性底色层`：页面背景、卡片背景、表格、输入框，完全由 Polaris surface/text/border 体系承担
   - `主强调层`：用于当前选中、主要进度、主要 CTA、编辑器 focus，选择冷静的品牌强调色
   - `辅助强调层`：用于价值摘要、推荐计划、轻提示，只允许低饱和染色和弱渐变
   - `语义状态层`：success / caution / critical / info 仅表达状态，不承担装饰
3. 将默认视觉方案明确为一套“角色化配色”，而不是单点 hex：
   - `Base Neutral`：保持 Shopify Admin 的中性底
   - `Primary Emphasis`：偏冷静的 indigo-blue，用于翻译工作流、选中态、关键编辑反馈
   - `Positive Accent`：偏 restrained teal/green，仅用于成功、增长正向反馈和可用额度等正向状态
   - `Warm Utility Accent`：偏 muted amber，仅用于 saving、年付优惠、提醒，不进入大面积主视觉
4. 约束页面级用色边界：
   - `translate-v4` 可以更偏冷静智能感，但不能整页蓝化
   - `pricing` 可以有轻度价值强化，但不能走高饱和促销
   - 大面积容器使用 surface 或透明度很低的 tint，不使用重 fill
5. 在 `app/ui/theme.ts` 与 `app/styles.css` 中落地为可替换的语义变量，而不是页面里继续写十六进制：
   - 新增或整理 `--app-accent-primary`、`--app-accent-soft`、`--app-accent-muted`、`--app-growth-soft`、`--app-savings-soft` 等角色变量
   - 页面只消费角色变量，不直接消费固定颜色
6. 在 `app/routes/app.translate-v4/v4Styles.ts` 与 `app/routes/app.pricing/style.css` 中接入这些角色变量，避免单页自行定义色彩个性。

### 变更组 A.1：先输出独立 HTML 视觉预览页

#### 文件

- 新增一个预览文件，建议放在工作区可直接打开的位置，例如：
  - `preview/shopify-translation-visual-preview.html`
  - 或 `docs/shopify-translation-visual-preview.html`

#### What

- 先做一个独立 HTML 预览页，不直接改现有业务页面。
- 这个预览页用于展示拟定的新视觉风格在两个关键场景中的效果：
  - `translate-v4` 工作台首屏
  - `pricing` / Billing 页首屏

#### Why

- 当前需求的核心不只是代码改造，而是先确认“视觉风格是不是对的”。
- 直接在现有页面里边改边看，成本高，也不利于快速比较风格方向。
- 先看 HTML 预览，可以更快确认：
  - 气质是否够专业
  - 配色是否不死板
  - 是否既有 Shopify Admin 感，又有产品辨识度

#### How

1. 预览页采用单文件 HTML 形式，便于快速打开查看。
2. 页面内容至少包含两个区块：
   - `Translate V4 Preview`
   - `Pricing Preview`
3. `Translate V4 Preview` 需要展示：
   - 页面头部
   - 状态摘要卡
   - 覆盖率卡
   - 任务创建卡
   - 任务列表卡片
4. `Pricing Preview` 需要展示：
   - 页面头部
   - 当前计划 / credits 摘要卡
   - 套餐卡片组
   - 年付切换和优惠表达
5. 预览页重点验证：
   - 色彩气质
   - 字体层级
   - 卡片密度
   - 强调方式是否克制
   - “翻译与转化价值”是否被看见
6. 在预览确认后，再把视觉方案落到真实代码文件中，减少返工。

### 变更组 B：统一视觉源与组件契约

#### 文件

- `design.md`
- `app/ui/theme.ts`
- `app/styles.css`
- `app/ui/components/AppPageHeader.tsx`
- `app/ui/components/AppSectionCard.tsx`
- `app/ui/components/AppStatusBadge.tsx`
- `app/routes/app.translate-v4/v4Styles.ts`

#### What

- 扩充共享 token 与组件约束，让 `translate-v4` 和 `pricing` 都能完全回到 Polaris 语义之上。
- 把 `v4Styles.ts` 从“自建色盘”改成“全局 token 别名层”。
- 统一字级、状态色、边框、卡片密度、辅助说明样式。

#### Why

- 当前底座已经存在，最佳路径不是推翻，而是让页面全面接入。
- 只改页面结构但不先收口视觉源，会继续放大局部样式差异。
- Shopify 官方对嵌入式 App 的建议是贴近 Shopify Admin 体验，而不是在嵌入式页面里建立第二套产品品牌视觉。

#### How

1. 在 `app/ui/theme.ts` 内补齐 `translate-v4` 与 `pricing` 实际需要的语义层：
   - `info/success/caution/critical` 的 surface、text、border
   - subdued surface / selected surface / progress track / inset surface
   - Table、Tag、Collapse、Alert、Statistic 等组件的统一 token
2. 将 `app/routes/app.translate-v4/v4Styles.ts` 中的独立颜色映射为全局 token：
   - `primary` → `var(--p-color-bg-fill-brand)` 或对应语义品牌色
   - `primarySoft` → `var(--p-color-bg-surface-selected)`
   - `successBg` / `warningBg` / `dangerBg` → Polaris 语义 surface
   - `text` / `textMuted` / `textFaint` → `--p-color-text` 系列
3. 把文字层级固定为：
   - 页面标题：`24px / 700`
   - 区块标题 / 卡片标题：`14px / 600`
   - 正文：`14px / 400`
   - 辅助说明：`13px / 400`
   - 标签 / 状态补充 / 元信息：`12px`
   - `11px` 仅保留给极弱元信息，不再扩散
4. 固化卡片密度：
   - 标准卡片：`padding: 16px`
   - 紧凑卡片：`padding: 12px 16px`
   - 摘要型指标卡：允许 `20px 22px`，仅用于成组摘要区
5. 保持 `AppPageHeader`、`AppSectionCard`、`AppStatusBadge` 作为两个目标页的基础骨架，不新增平行风格组件。

### 变更组 C：把 `translate-v4` 重构为“翻译任务工作台”

#### 文件

- `app/routes/app.translate-v4/route.tsx`
- `app/routes/app.translate-v4/components/SummaryAndHeader.tsx`
- `app/routes/app.translate-v4/components/CreateTaskCard.tsx`
- `app/routes/app.translate-v4/components/CoverageCard.tsx`
- `app/routes/app.translate-v4/components/TaskQueueSection.tsx`
- `app/routes/app.translate-v4/components/V4JobCardParts.tsx`
- `app/routes/app.translate-v4/components/JobExpandedDetail.tsx`
- `app/routes/app.translate-v4/components/AutoTranslateMarkers.tsx`
- `app/routes/app.translate-v4/SupportChatWidget.tsx`

#### What

- 重新组织页面主线：状态摘要 → 创建任务 → 查看/管理任务 → 获取支持。
- 降低自定义工具面板感，回到 Shopify Admin 工作台气质。
- 用信息结构表达“翻译覆盖率与转化效率的关系”，而不是依赖重装饰。

#### Why

- 当前页面能力很强，但新用户需要在一个页面内同时理解店铺状态、语言覆盖、任务创建、任务队列与帮助入口，理解成本偏高。
- Shopify Density 原则强调高密度页面要通过清晰分区、表面层级与一致动作体系提升效率，而不是简单堆更多模块。
- 这个页面最适合承接“翻译带来的价值”表达，因为它直接承接商家实际操作。

#### How

1. 顶部头部重构：
   - 将当前 `PageHeaderBar` 重构为基于 `AppPageHeader` 的标准页面头部。
   - 左侧保留页面标题与一句价值说明。
   - 右侧以较弱视觉显示“当前计划 + 可用积分”，作为上下文信息，不再作为主视觉中心。
2. 摘要区重构：
   - 保留“双卡”结构，但去掉明显浅蓝渐变和高饱和强调。
   - `SummaryDonutCard` 改为 surface 基础上的轻染色摘要卡，数字层级控制在 `20px - 28px`。
   - `CoverageCard` 继续承担“语言覆盖 + 自动翻译状态”，但按钮与标签回到共享状态体系。
   - 摘要文案增加一条克制的价值解释：强调覆盖更多语言能减少理解障碍、帮助用户完成购买决策，但不做结果承诺型表述。
3. 任务创建区重构：
   - `CreateTaskCard` 保持一个主按钮。
   - “目标语言”“翻译内容”是主任务区。
   - `AI 模型` 和“高级选项”降为次级区域，可折叠或视觉弱化。
   - 为每组配置补一句 13px 帮助说明，把“为什么要做这个选择”讲清楚。
4. 任务列表重构：
   - 统一状态标签，全部走共享语义色，不再使用独立十六进制边框和底色。
   - 卡片展开态通过轻背景差异和分隔层次表达，不再靠亮蓝描边成为强视觉。
   - 列表中的操作全部收敛为 secondary / text，只有真正的恢复型关键动作允许更强强调。
   - 错误信息和进度信息统一层级，避免局部红字突然抢焦点。
5. 支持入口降级：
   - `SupportChatWidget` 从页面主元素降为次级支持入口。
   - 优先改成页面内 help card 或轻量浮层入口，不让固定悬浮组件与“创建任务”竞争。
   - 保留帮助能力，但回到产品支持语境，而不是自成一套视觉系统。

### 变更组 D：把 `pricing` 重构为“Billing / Plan 管理页”

#### 文件

- `app/routes/app.pricing/route.tsx`
- `app/routes/app.pricing/style.css`
- `app/routes/app.pricing/components/acountInfoCard.tsx`
- `app/routes/app.pricing/components/hasPayForFreePlanModal.tsx`

#### What

- 重新梳理页面主决策路径：当前状态 → 计划选择 → credits 加购 → 辅助比较/FAQ。
- 降低营销页表达，回到嵌入式 Billing 页的可信和可比较。
- 用更清楚的“适合谁 / 为什么升级 / 升级后减少什么摩擦”来表达转化价值。

#### Why

- Shopify Billing Best Practices 强调定价应简单清晰、易比较。
- 当前页面内容完整，但多个重点并列：当前计划、推荐计划、年付优惠、加购额度、FAQ，导致视觉注意力被分散。
- Pricing 页面承载的是“付费决策”，不是“获客营销”，因此应优先建立信任、清晰与可比较性。

#### How

1. 页面头部重构：
   - `AppPageHeader` 需要加入更清晰的价值型副标题，不再只有“Pricing”。
   - 标题表达强调预算与增长阶段匹配，例如“让翻译投入更可预测”这一类价值表达。
   - `extra` 区放当前计划状态与次级支持入口，不在头部并列多个强 CTA。
2. Credits 概览区重构：
   - `AcountInfoCard` 从“单功能购买卡”升级为“账单概览卡”。
   - 在同一卡片内整合：当前计划、剩余额度、刷新时间、一个主动作。
   - 主动作根据状态二选一：
     - 额度紧张优先 `Buy credits`
     - 套餐不匹配优先 `Upgrade plan`
   - 另一个动作降为 secondary。
3. 套餐卡重构：
   - 统一三层结构：计划名称与适用场景 → 价格 → 核心权益摘要。
   - 价格字号控制在 `32px - 36px`，不再继续放大。
   - `Current plan` 和 `Recommended` 不再使用 AntD 预设蓝/金标签，而改为项目统一状态/强调样式。
   - 每张卡只保留一个主 CTA。
   - 免费试用说明并入价格或说明区，不再形成第二个强主按钮体系。
4. 年付与优惠表达重构：
   - 仅在 billing toggle 周边和价格区域重复强调年付收益。
   - 优惠表达采用轻标签 + 清楚文案，不使用强刺激色块。
   - 价格说明里明确“年付月均 / 年总额”，减少理解成本。
5. Credits 加购区与计划升级统一语言：
   - Credits 选项卡的选中态、边框、价格层级全部回到共享 token。
   - 文案上明确“什么时候该升级计划，什么时候该购买 credits”，帮助商家做选择。
6. 对比表与 FAQ 降级：
   - `Compare plans` 保留，但作为辅助决策区，减少过强标题和视觉对抗。
   - FAQ 更像帮助区，而不是营销落地页尾部模块。
   - FAQ 顶部可加入“需要帮助选择方案？”的轻量支持入口，但视觉弱于套餐主区。

### 变更组 E：统一“翻译与转化率价值”的表达方式

#### 文件

- `app/routes/app.translate-v4/components/SummaryAndHeader.tsx`
- `app/routes/app.translate-v4/components/CreateTaskCard.tsx`
- `app/routes/app.pricing/route.tsx`
- `app/routes/app.pricing/components/acountInfoCard.tsx`
- 相关 i18n 文案来源（执行阶段按实际文案文件补充修改范围）

#### What

- 将“翻译帮助提升转化”的业务价值表达，嵌入摘要文案、计划说明、卡片副标题和帮助说明中。

#### Why

- 用户明确要求页面不仅要专业，还要传达翻译的业务价值。
- 当前页面要么强调功能，要么强调价格，但“为什么这对商家业务有价值”表达还不够清晰。

#### How

1. 在 `translate-v4`：
   - 通过“覆盖语言数、覆盖率、待处理条目、自动翻译状态”解释翻译工作对商店理解效率的影响。
   - 强调“优先翻译高价值内容”“减少语言摩擦”“帮助海外访客更快理解商品与政策”。
2. 在 `pricing`：
   - 每个计划增加“适合谁 / 适合哪类增长阶段”的一句话摘要。
   - 强调升级或加购带来的结果是“更稳定覆盖更多语言内容”“减少因额度不足中断翻译”。
3. 文案风格约束：
   - 不使用夸张促销语气。
   - 不使用无法验证的承诺式转化口号。
   - 以“可信、专业、明确动作结果”为核心语气。

## Assumptions & Decisions

### Assumptions

- 当前项目已接受“Polaris 为视觉基准、Ant Design 为复杂能力补充”的总体方向，因为 `design.md`、`ui-execution-plan.md`、`app/ui/theme.ts` 都已经围绕这一原则建立。
- 这次优化以现有页面与共享组件为基础，不做整站重新设计，不新增独立风格系统。
- 当前用户希望优先优化的是 `translate-v4` 和 `pricing` 的视觉方向与实施路径，而不是立即扩展到所有页面。
- 现有 `AppPageHeader`、`AppSectionCard`、`AppStatusBadge` 应继续作为基础组件沿用，而不是废弃重建。
- 当前 `design.md` 对“不要乱用颜色”的约束是有价值的，但需要升级为“既有边界、又有风格方向”的设计说明。
- 在正式改造现有页面前，先交付一个可预览的 HTML 视觉稿，是当前更合适的推进方式。

### Decisions

- 决定先做“视觉源收口”，再做页面结构重排。原因是页面级微调无法解决独立色盘、独立标签和独立间距体系的问题。
- 决定先补齐“风格方向 + 柔性配色框架”，再做具体页面改造。原因是如果风格方向不明确，执行阶段很容易在“太灰”和“太营销”之间反复摇摆。
- 决定先产出独立 HTML 预览页，再进入真实页面实现。原因是当前最需要先确认的是视觉方向本身，而不是立刻进入组件替换。
- 决定把 `translate-v4` 定义为“任务工作台”，不是分析大盘，也不是营销页。
- 决定把 `pricing` 定义为“Billing / Plan 管理页”，不是 SaaS 着陆页。
- 决定用信息结构和文案清晰度来表达“翻译提升转化”的价值，而不是通过更强营销感视觉表达。
- 决定不新增新的平行基础组件体系，而是在现有 `app/ui/*` 基础上补齐语义和变体。
- 决定使用“中性底 + 主强调 + 辅助强调 + 状态层”的角色化配色，而不是写死单一色板。这样既保持统一，也允许后续对气质做小范围调整。

### Skill Workflow Alignment

本计划遵循现有页面优化工作流的核心约束：

- 以现有项目为基础优化，而不是盲目覆盖原结构。
- 先做现状审查与问题快照，再定义明确的改动对象。
- 对“风格方向”“整体视觉源”和“局部界面改版”分层处理：先明确风格和柔性配色，再收口 token，最后落到页面级结构重排。
- 以共享样式和共享组件为主，避免重新引入页面级独立视觉系统。

## Verification Steps

执行阶段完成后，应按以下标准验证：

### 1. 视觉源一致性

- 颜色不再只有“禁止列表”和“固定值列表”，而是具备明确的角色化配色结构。
- `design.md` 中新增的风格方向与柔性配色框架，能指导页面实现，而不是只停留在抽象原则。
- `app/routes/app.translate-v4/*` 中不再保留主导性的独立十六进制色盘，核心颜色改由全局 token 派生。
- `app/routes/app.pricing/*` 中不再依赖 `Tag color="blue"`、`Tag color="gold"` 这类局部预设色作为主要视觉强调。
- 两个页面的标题、辅助文字、状态标签、边框、表面颜色都能追溯到 `app/ui/theme.ts` 与 `app/styles.css` 的语义变量。

### 1.1 风格明确且不过度僵化

- 页面整体能看出“专业、克制、智能、全球增长”的明确气质。
- `translate-v4` 与 `pricing` 有各自重点，但仍共享同一套底层视觉逻辑。
- 未来如果微调品牌强调色，不需要回到每个页面手工重写颜色。

### 1.2 预览先行

- 先交付的 HTML 预览页能够直观看到新的视觉方向。
- 预览页中 `translate-v4` 和 `pricing` 两个场景都能体现拟定风格。
- 在预览页确认后，再进入现有业务代码改造，避免方向性返工。

### 2. 字级与间距收敛

- 页面标题、区块标题、正文、辅助文案均能归入固定层级。
- `12px` 与 `11px` 只服务于标签与元信息，不再承担正文和主要说明。
- 同一页面内标准卡片与紧凑卡片的 padding 规则稳定，不再混用多套写法。

### 3. 页面角色清晰

- `translate-v4` 首屏能明确回答三件事：
  - 当前翻译状态如何
  - 下一步应该做什么
  - 如果继续执行，会产生什么结果
- `pricing` 首屏能明确回答三件事：
  - 当前计划和额度状态如何
  - 升级计划与购买 credits 的区别是什么
  - 商家下一步最合理的动作是什么

### 4. CTA 优先级清晰

- 每个卡片最多一个 Primary action。
- 辅助说明、FAQ、支持入口不会和主决策路径争抢视觉焦点。
- 任务列表、表格和次级管理区主要使用 secondary / text 风格操作。

### 5. 价值表达准确且克制

- 页面中能看出“翻译能减少语言摩擦、帮助商家覆盖更多市场、支持转化效率”的价值逻辑。
- 不出现明显营销页式大色块、夸张促销标签、强刺激文案或不可信承诺。
- 整体气质保持 Shopify Admin 内嵌应用应有的专业、冷静与可信。

### 6. 回归文档目标

- 实际结果与 `design.md` 中的字号、颜色、卡片、Pricing 页面规则一致。
- 实际结果与 `ui-refactor-audit.md` 中针对 `translate-v4` 和 `pricing` 的问题清单相对应，能看出具体问题被修正。
- 实际结果与 `ui-execution-plan.md` 的“先统一底座，再改页面”的顺序一致，没有跳过共享层直接做局部美化。
