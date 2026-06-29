# UI Execution Plan

## 1. 文档定位

本文档用于定义当前 Shopify App 的 UI 重构执行方案，承接以下两份文档：

- `design.md`：负责视觉与交互规范
- `ui-refactor-audit.md`：负责现状审查与问题归档

本文档只负责以下内容：

- 执行目标
- 改造顺序
- 任务分组
- 分阶段交付物
- 阶段验收标准

本文档不负责以下内容：

- 视觉规范定义
- 审查问题枚举
- 工时估算
- 精确排期

---

## 2. 执行总原则

### 2.1 先统一底座，再改页面

当前项目的问题已经不是单页样式问题，而是系统性不统一：

- 主题入口分散
- token 来源不一致
- Polaris 与 Ant Design 的职责边界不清晰
- 页面不断重复实现同类卡片、标题、状态和表单结构

因此执行顺序必须是：

1. 先统一全局前端用法与设计底座
2. 再抽取基础组件与页面模板
3. 再进入页面级重构

### 2.2 Polaris 定义体验，Ant Design 提供复杂能力

为满足 Shopify App 的 Built for Shopify 目标，采用以下原则：

- `Polaris` 作为体验标准和视觉语义来源
- `Ant Design` 作为复杂数据组件和高密度业务组件的能力补充
- 页面最终呈现必须保持 Shopify Admin 风格一致性

一句话原则：

> Polaris 负责“像不像 Shopify App”，Ant Design 负责“复杂功能做不做得动”。

### 2.3 页面重构以模板化推进，而不是逐页孤立处理

当前页面虽多，但可以归并为少数几种稳定模板：

- Dashboard / 概览页
- Settings / 配置页
- Manage / 资源管理页
- Editor / 双栏编辑页
- Pricing / 计费页
- Report / 报告页
- Public / 入口页
- Resource Detail / 资源详情模板页

执行时优先沉淀模板，再映射到具体页面。

---

## 3. 执行目标

本轮执行的目标不是简单“改漂亮”，而是建立一套可持续扩展的后台应用 UI 体系。

### 3.1 全局目标

- 建立单一主题入口
- 建立统一 token 映射
- 明确 Polaris / Ant Design 使用边界
- 建立最小公共 UI 组件集
- 建立页面模板标准

### 3.2 页面目标

- 让高频页面先回到统一规范
- 让设置页、管理页、报告页具备稳定模板
- 让页面减少局部手工样式和重复实现
- 让后续新页面能复用统一组件和规则

---

## 4. 执行边界

### 4.1 Polaris / Ant Design 使用边界

#### 优先使用 Polaris 或 Polaris 风格封装的场景

- 页面头部
- 页面区块层级
- 主按钮 / 次按钮 / 危险操作语义
- 空状态
- 页面级 loading / success / error / warning 反馈
- 表单帮助信息与错误反馈
- 状态标签与状态提示

#### 允许使用 Ant Design 的场景

- 复杂表格
- 图表
- 多筛选条件管理
- 复杂弹窗内部内容区
- 高密度业务控件

#### 使用 Ant Design 时的强制约束

- 颜色必须从 Polaris token 派生
- 字号、圆角、边框、间距必须遵守统一系统
- 不能直接沿用 Ant Design 默认视觉
- 不能让页面出现明显的第二套后台系统风格

### 4.2 页面代码约束

- 页面层优先使用项目内部封装组件，而不是直接裸用第三方组件
- 不再新增零散硬编码颜色、字号、间距、圆角
- 不在页面内继续扩散大量内联 `style`
- 同类场景优先复用相同组件和相同结构

---

## 5. 执行阶段

## 阶段一：统一全局底座

### 目标

建立整个项目的统一主题、token 映射和组件边界，为后续页面改造提供稳定基础。

### 任务

#### 任务 1：收口主题入口

处理文件：

- `app/entry.client.tsx`
- `app/entry.server.tsx`
- `app/routes/app.tsx`
- `app/styles.css`

动作：

- 建立单一主题配置入口
- 收口 Ant Design token 配置
- 将全局主题逻辑从多处重复定义改为单点维护

#### 任务 2：建立全局 token 映射

动作：

- 明确颜色 token
- 明确字号层级
- 明确间距层级
- 明确圆角与边框层级
- 明确状态色和选中态规则

交付物建议：

- `app/ui/theme/*`
- `app/ui/tokens/*`

#### 任务 3：明确 Polaris / Ant Design 边界清单

动作：

- 定义可直接使用 Polaris 的场景
- 定义可使用 Ant Design 的场景
- 定义禁止继续直接使用的默认视觉模式
- 建立页面层使用规则

#### 任务 4：建立基础全局样式规则

动作：

- 收口页面基础 padding
- 收口卡片基础样式
- 收口表格选中态和 hover 态
- 收口全局文本层级

### 阶段验收

- 全局主题入口只保留一个主来源
- Ant Design token 统一从 Polaris token 派生
- 新增页面不再需要自行定义一套颜色和字号
- `design.md` 中的基础 token 可在代码层落地使用

---

## 阶段二：建立最小公共组件集

### 目标

把高频重复结构抽成统一组件，减少页面级复制和局部样式扩散。

### 任务

#### 任务 1：页面级基础组件

建议优先建立：

- `AppPageHeader`
- `AppSectionCard`
- `AppStatusBadge`
- `AppEmptyState`
- `AppFormSection`

#### 任务 2：数据展示组件

建议优先建立：

- `AppDataTable`
- `AppMetricCard`
- `AppInfoBanner`
- `AppActionGroup`

#### 任务 3：交互反馈组件

建议优先建立：

- `AppLoadingBlock`
- `AppPermissionNotice`
- `AppUpgradeNotice`
- `AppConfirmModal`

### 阶段验收

- 至少覆盖 80% 高频重复结构
- 页面开始消费统一组件，而不是继续复制 Card / Title / Button 样式
- 新组件的视觉输出符合 Polaris token 和 `design.md` 规范

---

## 阶段三：试点页面改造

### 目标

以最能代表系统问题的页面作为试点，验证全局底座和组件封装是否足够支撑后续扩展。

### 试点顺序

1. `Dashboard`
2. `Translate`
3. `Switcher`

### 选择原因

- `Dashboard` 代表首页概览与多任务入口问题
- `Translate` 代表设置页和复杂配置页问题
- `Switcher` 代表双栏编辑页和预览区风格问题

### 页面任务

#### Dashboard

- 建立统一页面头部
- 统一卡片标题层级
- 统一 CTA 优先级
- 降低支持信息的视觉权重
- 替换硬编码颜色与局部 spacing

#### Translate

- 统一页面头部与 section 标题
- 统一语言选择卡的选中、hover、错误态
- 统一设置卡片结构
- 统一帮助信息和高级设置交互

#### Switcher

- 建立稳定的双栏编辑模板
- 让预览区回归后台应用风格
- 去除黑色按钮与独立视觉体系
- 统一配置区卡片结构和反馈逻辑

### 阶段验收

- 试点页面不再出现明显的局部手工配色
- 页面主结构、按钮优先级、卡片层级回到统一标准
- 至少验证 1 套设置页模板和 1 套双栏编辑页模板可复用

---

## 阶段四：批量推广到高频页面

### 目标

把已验证的组件和模板推广到高频业务页，形成稳定的产品内体验。

### 页面范围

- `Language`
- `Currency`
- `ApiKeySetting`
- `Glossary`
- `Manage Translation`
- `Pricing`

### 页面任务

#### Settings 组

页面：

- `Language`
- `Currency`
- `ApiKeySetting`
- `Glossary`

动作：

- 统一设置页头部
- 统一列表与卡片的跨端结构
- 统一表单帮助信息、错误提示和风险动作确认
- 统一升级提示、禁用态和限制反馈

#### Manage Translation 组

页面：

- `app.manage_translation`
- `app.manage_translation_*`

动作：

- 统一资源管理页模板
- 统一资源详情页模板
- 统一状态显示、表格密度和操作区结构
- 逐步减少路由内重复实现

#### Pricing 组

页面：

- `app.pricing`

动作：

- 从营销表达收敛到后台 billing 表达
- 降低强视觉装饰
- 统一套餐卡和额度购买区风格
- 统一 pricing modal 的信息层级

### 阶段验收

- 高频业务页都进入统一组件和模板体系
- 设置页与管理页不再继续扩散独立视觉规则
- 页面级新增样式主要发生在组件层，而不是 route 内

---

## 阶段五：补齐低频页与入口页

### 目标

完成剩余页面的统一收敛，解决产品边缘页面与主站体验割裂的问题。

### 页面范围

- `conversion_rate`
- `translate_report`
- `translate-v4`
- `/`
- `auth.login`
- `invite`
- 其他低频辅助页面

### 任务

- 统一报告页模板
- 统一公开入口页与辅助流程页的结构
- 补齐说明、状态反馈、空态和错误态
- 处理固定浮层、轮询和高密度表单的体验问题

### 阶段验收

- 低频页不再像单独的临时页面
- 登录、邀请、入口页具备完整可信的产品体验
- 报告页和新功能页融入统一设计系统

---

## 6. 模板优先级

为避免逐页重复施工，后续应优先沉淀以下模板：

### P0 模板

- 全局主题与 token 底座
- `AppPageHeader`
- `AppSectionCard`
- Settings 页模板
- Editor 双栏模板

### P1 模板

- Manage 列表页模板
- Resource Detail 详情页模板
- Pricing / Billing 模板

### P2 模板

- Report 模板
- Public / Login / Invite 模板

---

## 7. 任务拆分建议

为了后续落地更清晰，执行任务建议按以下工作流拆分：

### 工作流 A：全局底座

- 主题入口
- token 映射
- 全局样式规则
- Polaris / Ant Design 边界

### 工作流 B：基础组件

- 页面头部
- 卡片
- 状态标签
- 空态
- 表单区块
- 表格容器

### 工作流 C：试点页面

- Dashboard
- Translate
- Switcher

### 工作流 D：高频页面推广

- Settings
- Manage Translation
- Pricing

### 工作流 E：低频与边缘页面补齐

- Report
- Public / Login / Invite
- 低频辅助页面

---

## 8. 验收标准

### 8.1 全局验收

- 主题入口统一
- token 来源统一
- 页面不再新增明显的局部视觉规则
- Polaris / Ant Design 边界清晰并可执行

### 8.2 组件验收

- 高频 UI 结构能够复用
- 新页面可以优先通过封装组件搭建
- 状态、按钮、表单和卡片风格统一

### 8.3 页面验收

- 页面头部结构清晰
- 主要操作优先级明确
- 标题、正文、辅助文案归入固定字级
- 状态色与边框色统一来自 token
- 空态、加载态、禁用态和风险操作反馈一致

---

## 9. 风险与注意事项

### 9.1 不要直接全量重写页面

如果在没有统一底座的情况下直接改页面，很容易出现：

- 页面改完但全局规则仍然散乱
- 页面之间继续出现新旧标准混用
- 改完高频页后低频页无法复用成果

### 9.2 不要只做视觉替换，不做结构收敛

如果只把颜色和字号改一遍，而不建立组件与模板，问题会很快再次扩散。

### 9.3 不要让 Ant Design 默认视觉继续主导页面

Ant Design 可以继续用，但必须是能力层，而不是体验层。

---

## 10. 当前建议的第一批执行任务

如果下一步进入真正执行，建议从以下任务开始：

1. 建立统一主题入口
2. 建立 token 映射层
3. 写出 Polaris / Ant Design 使用边界清单
4. 建立 `AppPageHeader`、`AppSectionCard`、`AppStatusBadge`
5. 用 `Dashboard` 做第一轮页面试点
6. 用 `Translate` 验证设置页模板
7. 用 `Switcher` 验证双栏编辑模板

---

## 11. 文档关系

当前三份文档关系如下：

- `design.md`
  - 定义“应该长什么样”
- `ui-refactor-audit.md`
  - 定义“当前哪里有问题”
- `ui-execution-plan.md`
  - 定义“接下来按什么顺序改”

这三份文档后续应保持独立，不混写职责。
