---
name: ciwi-switcher-regression
description: >-
  Run storefront regression tests for the Ciwi Switcher theme extension
  (extensions/ciwi-switcher) using the Cursor built-in browser. Use when the
  user modifies the switcher extension, asks for switcher regression/E2E,
  extension QA, or ciwi-switcher verification. Reads test URLs from
  test-config.md and outputs a structured pass/fail report.
---

# Ciwi Switcher Extension 回归测试

在 **Cursor 内置浏览器** 中对前台 Theme Extension 做回归。Admin 配置页可选测；**主测 storefront**（不受 Shopify Admin 410 影响）。

## 触发条件

- 修改了 `extensions/ciwi-switcher/**`
- 用户要求 Switcher 回归 / E2E / 扩展测试
- 部署 `deployTest` 或主题预览后需验证

## 执行前

1. 读取 [test-config.md](test-config.md) — 若 `TEST_PRODUCT_PAGE` 仍为占位符，**向用户索要商品页 URL** 并更新配置后再测。
2. 读取 [reference.md](reference.md) — DOM 选择器、Network、CDP 脚本。
3. 确认扩展已部署到测试店（见 test-config「扩展部署」）。
4. 使用 **cursor-ide-browser** MCP：`browser_navigate` → `browser_lock` → 交互 → `browser_snapshot` / `browser_take_screenshot` → `browser_cdp` → `browser_lock` unlock。

## 测试套件

按优先级执行。**P0 失败则停止并报告**；P1/P2 失败记录后继续。

### P0 — 冒烟（必测，~5 分钟）

在 `TEST_PRODUCT_PAGE`（无 URL 则用 `TEST_STOREFRONT_HOME`）：

| ID | 步骤 | 通过标准 |
|----|------|----------|
| P0-1 | 打开页面，等待 3–5s | 存在 `ciwiswitcher-form` 或 `#ciwi-container`（若 `isTransparent` 则跳过可见性，改查 JS 已执行） |
| P0-2 | CDP：`window.__JS_EXECUTED__` 或 `ciwi-main` 无 console 报错 | 无 uncaught error |
| P0-3 | 截图保存当前状态 | 页面正常渲染，非 404/密码页 |
| P0-4 | CDP 读 `.ciwi-money` 至少 1 个 | 货币格式 span 存在（否则标记 **BLOCKED：未配置 ciwi-money**） |

### P1 — 语言切换（~10 分钟）

前置：Admin Switcher 类型含语言；店铺 ≥2 发布语言。

| ID | 步骤 | 通过标准 |
|----|------|----------|
| P1-1 | 点击 `#main-box` 或 `#translate-float-btn` 打开 selector | `#selector-box` 显示 |
| P1-2 | 点击语言 header，选**非当前** `.option-item[data-type='language']` | 选项可点 |
| P1-3 | 等待导航/刷新完成 | `Shopify.locale` 或 URL 语言段变化 |
| P1-4 | CDP：`localStorage.ciwi_selected_language` | 等于所选 iso code |
| P1-5 | 截图 + 比对页面标题/商品名 | 可见文案随语言变化（有翻译时） |

### P2 — 货币切换（~10 分钟）

前置：Admin 类型含货币；店铺 ≥2 货币。

| ID | 步骤 | 通过标准 |
|----|------|----------|
| P2-1 | 打开 selector，选另一种货币 | 选项可点 |
| P2-2 | CDP 采样 `.ciwi-money` 前后各 5 个 | 至少 1 处金额或符号变化 |
| P2-3 | `localStorage.ciwi_selected_currency` | 已更新 |
| P2-4 | 刷新页面 | 货币选择保持 |

### P3 — UI 配置（~8 分钟，改 extension 样式相关时必测）

在 Admin 改配置并 Save 后，前台硬刷新：

| ID | 检查项 | 通过标准 |
|----|--------|----------|
| P3-1 | 位置 `selectorPosition` | `#ciwi-container` 在对应角落 |
| P3-2 | `includedFlag` | 语言选项有国旗 img（若开启） |
| P3-3 | 颜色 | `fontColor` / `backgroundColor` 与配置一致（CDP `getComputedStyle`） |
| P3-4 | Sidebar 模式 | 仅悬浮按钮，无 `#main-box` 双栏 |

### P4 — 商品页增强（改 `ciwi-ui.js` 翻译逻辑时必测）

在 `TEST_PRODUCT_PAGE`：

| ID | 步骤 | 通过标准 |
|----|------|----------|
| P4-1 | 记录默认语言下主图 `alt` | 有值或空但无报错 |
| P4-2 | 切换到另一已翻译语言 | 主图 `alt` 变化 **或** Network 有 picture/translate 相关请求 |
| P4-3 | Console | 无 `[translate]` / `ProductImgTranslate` 相关 uncaught error |

可选页：`TEST_PAGE_WITH_PAGEFLY`、`TEST_PAGE_WITH_CUSTOM_LIQUID`（配置有时执行 P4 变体）。

### P5 — IP 地理定位（改 `ciwi-main.js` IP 逻辑时；需付费 + Geolocation 开）

| ID | 步骤 | 通过标准 |
|----|------|----------|
| P5-1 | CDP 清空 IP 相关 localStorage 并 reload | 见 test-config 脚本 |
| P5-2 | Network 监视 | 出现 `checkUserIp`；成功时后续有 localization 跳转 |
| P5-3 | 对比 `Shopify.country` / URL | 与 `/app/switcher/custom_redirects` 中该地区规则一致 |
| P5-4 | 再次刷新 | `ciwi_iplocation_expire_at` 存在，7 天内不重复强制定位 |

VPN 不可用则标记 **SKIP（需 VPN）**，勿判 FAIL。

### P6 — 缓存与稳定性

| ID | 步骤 | 通过标准 |
|----|------|----------|
| P6-1 | 连续打开 HOME → PRODUCT 两次 | 第二次 `widgetConfigurations/getData` 可能减少（缓存） |
| P6-2 | 快速连点语言选项 | 无重复提交死循环、页面可恢复 |

## 浏览器操作要点

```
browser_navigate({ url: TEST_PRODUCT_PAGE, position: "active" })
browser_lock({ action: "lock" })
browser_snapshot({ take_screenshot_afterwards: true })
// 用 snapshot ref 点击；iframe 内元素若不可达，用 browser_cdp Runtime.evaluate
browser_cdp({ method: "Runtime.evaluate", params: { expression: "...", returnByValue: true } })
browser_lock({ action: "unlock" })
```

### Shopify 密码保护店（必做，在 P0 之前）

密码见 [test-config.md](test-config.md) 的 `TEST_STOREFRONT_PASSWORD`（当前：`123456`）。

1. `browser_navigate` 到 `TEST_PRODUCT_PAGE` 或 `TEST_STOREFRONT_HOME`
2. 若 URL 含 `/password` 或 snapshot 有密码输入框，用 CDP 提交：

```javascript
(async () => {
  const input = document.querySelector('#Password');
  if (!input) return { ok: true, skipped: 'no password page' };
  input.value = '123456'; // 与 test-config TEST_STOREFRONT_PASSWORD 一致
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const form = input.closest('form');
  if (form) form.submit();
  else document.querySelector('button[type="submit"]')?.click();
  await new Promise((r) => setTimeout(r, 2000));
  return { ok: !location.pathname.includes('/password'), path: location.pathname };
})();
```

3. 确认已进入店铺（非 `/password`）后再跑 P0

主题编辑器预览（`?preview_theme_id=`）：IP 定位**不应**触发（`shopify-design-mode`）— 可记为 P5 负向用例。

## 报告模板

测试完成后输出：

```markdown
# Ciwi Switcher 回归报告

- **日期**:
- **Commit / Deploy**:
- **测试页**: {TEST_PRODUCT_PAGE}
- **浏览器**: Cursor 内置 / UA 摘要

## 结果摘要

| 套件 | 通过 | 失败 | 跳过 | 阻塞 |
|------|------|------|------|------|
| P0   |      |      |      |      |
| P1   |      |      |      |      |
| ...  |      |      |      |      |

## 失败详情

### {ID} {标题}
- **预期**:
- **实际**:
- **截图/Network**:
- **可能原因**:

## 阻塞项
- （如：未部署 extension、未填商品 URL、无 ciwi-money）

## 建议
- （是否可合并 / 需修复项）
```

## 失败排查速查

| 现象 | 先查 |
|------|------|
| 无切换器 | 主题是否启用 Ciwi_Switcher；block 是否在当前模板 |
| 语言列表空 | `/app/language` 发布语言 |
| 价格不变 | Shopify 货币格式 + `/app/currency` |
| IP 不跳 | Geolocation 开关、套餐、额度、localStorage 缓存 |
| JS 报错 | DevTools Console + 最近改动的 `ciwi-*.js` 文件 |

## 不要做的事

- 不要用 Cursor 浏览器测 Admin 嵌入式 App 作为 extension 是否正常的依据（410 与 extension 无关）。
- 不要在未部署 extension 变更的情况下 expect 前台行为变化。
- 不要在没有 `TEST_PRODUCT_PAGE` 时编造商品 URL。
