---
name: ciwi-app-release-regression
description: >-
  Run release regression for the Ciwi.ai Shopify translation/localization app
  (TypeScriptFrontend). Use when deploying to test/prod, preparing a release,
  or when the user asks for full-app QA, smoke test, or go-live checklist.
  Covers Admin embedded app, Java backend, translate v4, and storefront
  extension. Reads test-config.md; delegates Switcher E2E to
  ciwi-switcher-regression skill.
---

# Ciwi.ai Shopify App 上线回归

**TypeScriptFrontend** 是 Ciwi.ai 的 Shopify **翻译与本地化 App**：在 Admin 内配置语言/货币/词汇表、批量翻译 Shopify 资源、手动管理译文，并通过 Theme Extension 在前台提供语言/货币切换与 IP 定位。

## 核心功能（测什么 = 测这些是否仍可用）

| 模块 | 路由 / 位置 | 核心能力 |
|------|-------------|----------|
| 首页 Dashboard | `/app` | 安装引导、翻译进度、额度/分析概览 |
| 语言 | `/app/language` | 发布/管理店铺目标语言，触发翻译流程入口 |
| 批量翻译 v2 | `/app/translate` | Java 后端执行批量翻译（旧主链路） |
| 批量翻译 v4 | `/app/translate-v4` | Cosmos + Redis + Spark worker（需 Turso `migratedToTsf=true`） |
| 管理翻译 | `/app/manage_translation` + 30+ 子路由 | 按资源类型查看/编辑/单条重译 |
| 货币 | `/app/currency` | 多货币、汇率、Shopify Markets 相关配置 |
| Switcher | `/app/switcher` | 前台切换器 UI/行为配置 |
| 地区重定向 | `/app/switcher/custom_redirects` | IP → 语言/货币/市场规则 |
| 词汇表 | `/app/glossary` | 术语表，影响翻译一致性 |
| 套餐 / 额度 | `/app/pricing` | 订阅、字符额度、IP 额度 |
| API Key | `/app/apikeySetting` | 自定义翻译 API（若启用） |
| Theme Extension | `extensions/ciwi-switcher/` | 前台语言/货币/IP 定位、商品图 Alt 等 |
| Web Pixel | `extensions/web-pixel/` | 客户事件像素（可选 scope） |
| Webhooks | `/webhooks` | 卸载、订阅、主题发布、合规等 |
| Java 后端 | `SERVER_URL` | 额度、用户初始化、v2 翻译、IP、配置持久化 |

**数据流摘要**：Admin Remix App ↔ Java (`SERVER_URL`) ↔ Shopify Admin API；v4 另走 Cosmos/Redis + Spark worker；前台 Extension 读 Java/Shopify 配置并写 localStorage。

## 触发条件

- 准备发布 test / prod（Render deploy、`shopify app deploy`）
- 用户要求「全量回归」「上线 checklist」「release QA」
- 改动涉及多个模块（不仅 extension）

## 执行前

1. 读取 [test-config.md](test-config.md) — 测试店、Admin URL、环境变量。
2. 确认 **deploy 已完成**（记录 commit / deploy 时间）。
3. Admin 嵌入式页在 Cursor 内置浏览器可能 **410**（bot UA）；需 Render 设置 `SHOPIFY_ALLOW_BOT_UA=true` 且 Dockerfile patch 已生效。无法测 Admin 时标记 **BLOCKED**，改用手动浏览器或 Shopify 预览。
4. **Switcher 前台详细步骤** → 使用 [.cursor/skills/ciwi-switcher-regression/SKILL.md](../ciwi-switcher-regression/SKILL.md) 跑 P0–P6。

## 回归套件（按优先级）

### R0 — 部署与健康（必测，失败则停止）

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R0-1 | 打开 `application_url`（如 `https://typescriptfrontend.onrender.com`） | 非 5xx，可到达 auth 或 app |
| R0-2 | OAuth：测试店安装/打开 App | Admin 内嵌 `/app` 可加载，无白屏 |
| R0-3 | 检查 Render env：`SERVER_URL`、`SHOPIFY_*`、`DATABASE_URL` | 与目标环境一致 |
| R0-4 | v4 若本次发布涉及：已迁移店（`migratedToTsf=true`）导航出现「智能翻译 (v4)」且 `/app` 重定向 `/app/translate-v4`；未迁移店 **不应** 出现且 `/app/translate-v4` 重定向 `/app` |

### R1 — 安装与用户初始化（新装或清数据店）

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R1-1 | 首次进入 `/app` | 无 uncaught error；Redux/额度区域 eventually 有数据 |
| R1-2 | Java：`InitializationDetection` 类逻辑 | 免费额度、默认语言包、订阅占位已创建（查 DB/Admin 额度 UI） |
| R1-3 | 首页主题 Extension 引导链接 | 可打开主题编辑器 App Block 页 |

### R2 — 语言（P0 Admin）

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R2-1 | `/app/language` 列表加载 | 已发布/未发布语言可见 |
| R2-2 | 添加或发布一种测试语言（若有沙箱语言） | GraphQL `write_locales` 成功，列表刷新 |
| R2-3 | 从语言页进入翻译（v2 或 v4 取决于产品配置） | 跳转正确，无 500 |

### R3 — 批量翻译

**v2**（`/app/translate`）— 若仍为默认入口：

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R3-v2-1 | 选少量模块/语言发起翻译 | 任务创建，进度条更新 |
| R3-v2-2 | 停止/续跑（首页 Progress） | `StopTranslatingTask` / `ContinueTranslating` 有效 |

**v4**（`/app/translate-v4`，需开关）：

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R3-v4-1 | 创建任务 | `api.translate-v4.tasks` 200，Cosmos 有记录 |
| R3-v4-2 | 进度轮询 | `task-progress` 阶段推进 init→translate→writeback |
| R3-v4-3 | 暂停/恢复/取消 | `task-action` 生效 |
| R3-v4-4 | 额度 | `api.translate-v4.quota` 与 Java `/quota/query` 一致；worker 实扣后额度下降 |

### R4 — 管理翻译（抽样 3 类资源）

不必测全部 30+ 路由；选 **Product**、**Collection**、**Page**（或本次改动相关类型）：

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R4-1 | 列表分页/搜索 | 有数据或空态正常 |
| R4-2 | 打开一条编辑 | 源文/译文字段加载 |
| R4-3 | 修改译文保存 | `updateManageTranslation` 成功，刷新后保留 |
| R4-4 | 单条重译（若有按钮） | 返回新译文，无 500 |

### R5 — 货币与 Markets

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R5-1 | `/app/currency` 加载 | 货币列表、汇率 UI 正常 |
| R5-2 | 启用第二种货币（测试环境） | 保存成功 |
| R5-3 | Shopify 设置 → 货币格式含 `ciwi-money` | 与文档一致（否则 Switcher 价格不变） |

### R6 — Switcher Admin + 前台

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R6-1 | `/app/switcher` 改一项 UI 配置并 Save | 前台硬刷新后生效 |
| R6-2 | `/app/switcher/custom_redirects` | 规则列表 CRUD 正常 |
| R6-3 | **前台** | 执行 `ciwi-switcher-regression` **P0–P2 至少**；改 extension 时 P0–P6 |

### R7 — 词汇表

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R7-1 | `/app/glossary` 增删改一条 | 持久化；后续翻译可引用（可选抽一条 v2/v4 验证） |

### R8 — 套餐与 Webhook（staging 谨慎测）

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R8-1 | `/app/pricing` 页面与当前 plan 展示 | 与 Java `GetUserSubscriptionPlan` 一致 |
| R8-2 | 测试店模拟 `app/uninstalled`（仅专用店） | Session 清理、Java `Uninstall` |

### R9 — 国际化与导航

| ID | 步骤 | 通过标准 |
|----|------|----------|
| R9-1 | 浏览器 `Accept-Language: zh-CN` 打开 App | Admin UI 中文（若资源存在） |
| R9-2 | NavMenu 各链接 | Home / Language / Manage / Currency / Switcher / Glossary / Pricing 可达；v4 链接按开关显示 |

## 按改动类型的最小回归集

| 改动范围 | 最少执行 |
|----------|----------|
| 仅 `extensions/ciwi-switcher/` | Switcher skill P0–P6 |
| 仅 `app/routes/app.translate-v4*` | R0 + R3-v4 + R4 抽样 1 类 |
| 仅 `manage_translation` 某子路由 | R0 + R4 对应类型 |
| 仅 `app.tsx` / 导航 / i18n | R0 + R9 + 受影响路由 smoke |
| Java 后端联调 | R0 + R2 + R3 + R5 + R6-3 |
| Dockerfile / patch / env | R0 + R6-3 P0 + Admin 任一页 smoke |

## 报告模板

```markdown
# Ciwi App 上线回归报告

- **日期**:
- **环境**: test / prod
- **Commit / Deploy**:
- **测试店**: {TEST_SHOP}
- **migratedToTsf**: true / false（测试店是否已切 v4）

## 结果摘要

| 套件 | 通过 | 失败 | 跳过 | 阻塞 |
|------|------|------|------|------|
| R0   |      |      |      |      |
| R1   |      |      |      |      |
| ...  |      |      |      |      |
| Switcher P0-P2 | | | | |

## 失败 / 阻塞详情

### {ID}
- **预期**:
- **实际**:
- **证据**:

## 发布建议
- [ ] 可发布 / [ ] 需修复后重测
```

## 相关文档

- Switcher 前台：[ciwi-switcher-regression](../ciwi-switcher-regression/SKILL.md)
- v4 架构：[docs/translation-v4-cutover-plan.md](../../docs/translation-v4-cutover-plan.md)
- 测试配置：[test-config.md](test-config.md)
