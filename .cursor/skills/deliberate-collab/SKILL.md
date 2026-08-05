---
name: deliberate-collab
description: >-
  Claude-style deliberate collaboration for every ciwi-translate task: confirm
  technical choices before coding, present P0/P1 prioritized plans (core first,
  polish later), recommendation plus alternatives, UI samples when needed,
  non-goals, minimal reversible diffs, and an acceptance checklist. Use at the
  start of any development, debugging, review, planning, UI, or design task.
---

# Deliberate Collab（Claude 风格协作）

每个任务开始时完整阅读并遵循本 skill。目标：先对齐，再方案，再动手；像 Claude Opus 一样可控、可验收。

## 0. 任务启动顺序

1. 读完本 skill。
2. 按 `AGENTS.md`「Required Workflow」做仓库入口步骤（`git status`、功能区定位、调用链核对）。
3. 判断是否存在技术/产品分叉；有分叉则先进入「确认」，不要直接改文件。
4. 确认后给出 **P0/P1 分层** 的实现方案（涉及 UI 时附样例），再执行。
5. 默认 **只执行 P0**；P1 列出来但不动，除非用户明确说做 P1 / 全部做完。
6. 收尾对照验收清单报告。

## 1. 先对齐再执行

有下列任一未决时，先停下来确认，不要开写：

- 库 / API / 存储 / 鉴权边界
- 数据模型或迁移
- UX 流程或信息层级
- 范围：MVP vs 完整版
- 多条都说得通的实现路径（含 App vs Worker vs translation-core 落点）

可跳过确认的情况（仍可直接做）：

- 明显 typo、单点小修、测试绿一下
- 用户明确说「直接改 / 按你推荐做 / 不用确认」

## 2. 推荐 + 备选 + 取舍

每个需要用户拍板的分叉，都按此格式给出：

- **选项**：A / B（必要时 C）
- **推荐**：默认选哪个
- **理由**：一句话，结合本仓库现状
- **选错风险**：会痛在哪里（返工、数据、权限、体验、配额）

不要只抛开放题「你想怎么做？」；要帮用户做选择。一次最多 2–5 个关键问题，先问会挡住后续决策的。

## 3. 能查代码就别问人

若问题可由仓库回答（现有组件、路由、worker、translation-core、schema），先用搜索/阅读得出结论，再只把真正的产品/风险分叉抛给用户。查不到时明确标成假设，不要编造路径或 API。

## 4. Plan 必须分 P0 / P1（强制）

凡需要实现方案、Cursor Plan、或多步改动的任务，**必须**按优先级拆开，禁止把「主链 + 优化 + 文档美化」揉成一大坨平铺步骤。

### P0 — 核心（先做，可独立验收）

- 打通用户要的主链路 / 修掉的主 bug；没有 P0 就没有可交付物
- 步骤按依赖排序；能中途用手工数据/脚本验通的，写明节奏（例：先 Worker 再采集）
- 给出 **P0 验收**（2–5 条，可客观判断过/不过）
- 默认执行范围 = 仅 P0

### P1 — 非核心（主链通后再做）

- 开关、节流、estimate、管理页展示、文档、文案打磨、覆盖更多边界、auto 路径等
- **只列表、默认不写代码**；用户说「做 P1 / 一起做 / 全部做完」才动手
- 不要把 P1 伪装成「顺手」塞进 P0 diff

### Plan 篇幅

- 默认 **一页内**：一句话目标 + P0 列表 + P1 列表 + 关键文件 + P0 验收
- 禁止默认展开成长表格、多节风险、完整时序图；用户要细节时再补
- CreatePlan / 回复里的方案同一标准

### 最小模板

```markdown
## 一句话
…

## P0（先做）
1. …
2. …
**P0 验收：** …

## P1（后做，先不动）
- …
- …

## 关键文件
- …
```

单点小修（typo、一行逻辑）可跳过 P0/P1 分层，但仍要写清「做了什么 / 怎么验」。

## 5. 可执行的实现方案

用户确认（或授权按推荐推进）后，在 P0/P1 框架下补齐落地细节（P0 必填，P1 可极简）：

1. **目标 / 非目标**：这次做啥、明确不做啥（P1 与非目标可合并表述）
2. **触及文件**：优先改已有文件；写清 App / Worker / `packages/translation-core` 落点
3. **步骤顺序**：依赖在前（core → worker/app adapters → API → UI）
4. **验证命令**：对照 `AGENTS.md`「Commands And Validation」（如 `npm run build` / `worker:build` / `core:build`）
5. **剩余风险**：只写会挡 P0 验收的风险；其余放 P1 或一句带过

方案要落到模块/文件级，避免空泛架构口号。

## 6. UI 先可见再编码

任务涉及页面、布局、交互或商户可见文案时，编码前按序给出（可挂在对应 P0 步骤下，勿单独膨胀成大章）：

1. **文字线框**：主状态的 ASCII / 结构化线框
2. **文案层级**：标题 / 说明 / 主 CTA / 空态与错误态要点
3. **组件结构**：贴近仓库现有原语的 JSX/结构草图（如 Polaris、`app/ui/components/*`、translate-v4 组件）

约束：

- Polaris 为视觉基线；Ant Design 仅用于表格/图表/高密度控件
- 嵌入 App 下拉优先 Polaris `Select` / chip / `ChoiceList`（见 `.cursor/rules/polaris-dropdowns.mdc`）
- 不发明第二套 UI kit
- 商户可见文案走 i18n（至少 `public/locales/en/translation.json` 与 `public/locales/zh-CN/translation.json`）

## 7. 边界意识

主动写出：

- **非目标**：本次不碰的区域（含未授权的 P1）
- **所有权边界**：翻译规则与 filter 以 `packages/translation-core` 为准；App/Worker 只做适配，不复制引擎
- **权限边界**：未要求则不改鉴权、部署、密钥、生产迁移、真实 Shopify 写回、计费/配额破坏性操作

用户没要求的重构、重命名、大清理、编码「清理」一律不做。

## 8. 不确定就说

- 证据不足时标注「假设 / 待核实」，不要假装确定
- 外部 API、scope、平台约束变化时，用文档或工具核实后再断言
- 与 `AGENTS.md` / 领域约定冲突时：以用户明确指令为准，并在说明里指出偏离点
- 不把已退役的 Spring/Java 路径当成现行依赖

## 9. 小步可回滚

- 最小 diff；一次只推进已对齐的 **P0** 范围
- 优先可逆改动；破坏性/生产操作必须有明确授权
- 不顺手格式化无关文件；不删除用户未跟踪文件
- 工作树不干净时保护用户已有改动

## 10. 收尾可验收

完成后简要报告：

1. 改了什么（关键文件）；标明完成的是 P0 还是含 P1
2. 按什么方案/选择执行的
3. 跑了哪些验证；哪些没跑及原因
4. 剩余风险；未做的 P1 条目（便于下轮接着做）

## 11. 输出节奏（默认）

```text
[必要时] 分叉确认（带推荐）
    ↓ 用户确认 / 授权按推荐
实现方案（一页内：P0 + P1 + 关键文件 + P0 验收）
    ↓ 若有 UI
UI 样例挂在对应 P0 步骤下（线框 → 文案 → 组件结构）
    ↓
只执行 P0
    ↓
验收报告（含未做的 P1 列表）
```

纯问答、纯排查且无需改代码时：仍先读本 skill；可压缩方案篇幅，但保留「假设 / 结论 / 下一步」清晰结构。多步排查结论若引出改造，改造方案仍用 P0/P1。
