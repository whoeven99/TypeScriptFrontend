---
name: concise-plan
description: >-
  Keeps Cursor Plan mode and CreatePlan output short and clear: scheme, steps,
  and implementation priority only. Use when entering Plan mode, writing or
  updating a plan, calling CreatePlan, or when the user asks for 方案 / 计划 /
  plan.
---

# Concise Plan（Plan 模式简洁输出）

要求 Cursor 的 Plan 模式内容都要简洁明了一点：简单告诉用户方案、步骤、实现优先级。

## 何时生效

- 进入 / 停留在 Plan 模式
- 调用 `CreatePlan` 或改写已有 `.plan.md`
- 用户要「方案 / 计划 / 怎么做 / 优先级」

与 `deliberate-collab` 并存：分叉确认可先短问；**计划正文**必须用本 skill 的三段式，不写长篇背景。

## 强制结构（按此顺序，勿加长章）

```markdown
# <一句话目标>

## 方案
- 做什么（1–3 条）
- 不做什么（1–2 条，防 scope creep）
- 关键落点：路径/模块即可，勿贴大段代码

## 步骤
1. …
2. …
3. …

## 实现优先级
1. P0 — 必须先做（能验证核心效果）
2. P1 — 紧随其后
3. P2 — 可后续（明确标「可延后」）

## UI 样例          ← 仅当本次有 UI 改动时才加；无 UI 则整节省略
（见下）
```

## UI 样例（有条件）

- **有 UI 改动**（新页面/改布局/交互/商户可见文案/按钮状态等）→ **必须**加 `## UI 样例`，且放在「实现优先级」之后。
- **无 UI 改动**（纯 worker/server/core/脚本等）→ **不要**加 UI 样例，也不要写「无 UI」占位句。

有 UI 时样例保持短：

1. 文字线框（ASCII / 结构化，1 个主状态即可）
2. 文案层级：标题 / 说明 / 主 CTA / 空态或错误（各一行）
3. 组件结构：点名 Polaris / 现有 `app/ui` 或路由组件，勿写完整 JSX 文件

## 篇幅硬限制

| 区块 | 上限 |
|------|------|
| 全文（CreatePlan body） | 约 40 行以内；含 UI 样例最多 60 行 |
| 方案 | ≤ 6 条 bullet |
| 步骤 | ≤ 7 步；每步一行 |
| 优先级 | 只列 P0/P1/P2，每级 1–3 项 |
| UI 样例 | 仅有 UI 时；线框 + 文案 + 组件点名，≤ 20 行 |
| Mermaid / 长表格 / 大段引用 | 默认不写；仅当一步说不清再各留 1 个极简图 |

## 禁止

- 复述问题、写「问题定性」长文
- 并列 Option A/B/C 让用户选（先定一个推荐写进方案；真要拍板用 1 句短问）
- 大段代码、完整函数、changelog 式文件列表
- 无 UI 时硬加 UI 样例或「本次无 UI」空节
- 「剩余风险」超过 2 条；验证命令一行带过即可

## 与 todos

- todos 只对应 **P0/P1** 步骤；P2 不建 todo，除非用户点名要做
- todo 文案短：动词 + 落点文件/模块

## 示例（好）

```markdown
# 批量任务额度透支收紧

## 方案
- 调用 LLM 前用 estimateTextTokens 预估并占坑；不够则不发新请求
- 暂停/额度耗尽立刻 setShopQuotaCap(0)
- 不 Abort 已在飞请求；不做账本预扣退款
- 落点：translation-core `callLLMOnce`、worker `tsfQuota` / `translateWorker`

## 步骤
1. core：单批预估 + reserved 闸
2. worker：remaining&lt;perCall → cap0；tripAbort 先打闸
3. core:build + worker:build；更新 AGENTS Quota 一句

## 实现优先级
1. P0 — 预估占坑 + cap0
2. P1 — 暂停路径立刻打闸 + remaining 同步
3. P2 — 预估安全系数调参 / 单测（可延后）

（本例无 UI → 不加 UI 样例）
```

有 UI 时在优先级后追加短样例即可，例如：

```markdown
## UI 样例
线框：标题 | 说明 | [主按钮] [次要]
文案：标题「额度不足」/ CTA「去升级」
组件：Polaris Modal + AppButton；复用 CreateTaskQuotaGateModal
```

## 示例（坏）

长篇时序图 + 多方案对比 + 10 个文件说明 + 风险清单——全部删掉，压成上面三段；无 UI 却硬写 UI 节也不行。
