# Ciwi Switcher 功能地图（回归参考）

## 代码位置

| 模块 | 路径 |
|------|------|
| Theme Block | `extensions/ciwi-switcher/blocks/ciwi_I18n_Switcher.liquid` |
| 入口 / IP | `extensions/ciwi-switcher/assets/ciwi-main.js` |
| UI / 翻译 | `extensions/ciwi-switcher/assets/ciwi-ui.js` |
| API | `extensions/ciwi-switcher/assets/ciwi-api.js` |
| 价格换算 | `extensions/ciwi-switcher/assets/ciwi-utils.js` |
| Admin 配置 | `app/routes/app.switcher/route.tsx` |
| 地区规则 | `app/routes/app.switcher_.custom_redirects/route.tsx` |

## 前台 DOM 选择器

| 元素 | 选择器 |
|------|--------|
| 切换器容器 | `#ciwi-container` |
| 主按钮区 | `#main-box` |
| 侧边悬浮 | `#translate-float-btn` |
| 语言选择器 | `.custom-selector[data-type='language']` |
| 货币选择器 | `.custom-selector[data-type='currency']` |
| 语言选项 | `.option-item[data-type='language']` |
| 货币选项 | `.option-item[data-type='currency']` |
| 当前语言文案 | `.selected-text[data-type='language']` |
| 带换算价格 | `.ciwi-money` |

## 功能 → 验证方式

| 功能 | 触发条件 | 如何验证 |
|------|----------|----------|
| 语言切换 | `languageSelector=true` | URL locale 变、`selected-text` 变、页面文案变 |
| 货币切换 | `currencySelector=true` | `.ciwi-money` 数值/符号变、`ciwi_selected_currency` |
| 国旗 | `includedFlag=true` | `.option-country-flag` / `#translate-float-btn-icon` 有 src |
| Sidebar 模式 | 语言货币选择器均 false | 仅 `#translate-float-btn` 可见 |
| 样式/位置 | Admin 配置 | `#ciwi-container` 的 top/bottom/left/right、颜色 |
| IP 定位 | `ipOpen=true` + 无 localStorage 缓存 | 自动 `updateLocalization`；Network 见 `browsing_context_suggestions.json` 或 ipapi |
| 隐身 IP | `isTransparent=true` + `ipOpen` | 无 `#ciwi-container` 可见 UI，但 locale/currency 仍变 |
| 商品图 Alt | 切换语言后 | 商品页 `<img alt="...">` 变化（有后端翻译数据时） |
| PageFly 文本 | PageFly 页切换语言 | DOM 文本块更新 |
| Custom Liquid | 含 custom liquid 页 | 文本节点更新 |
| RTL | 阿拉伯语等 | `dir=rtl` 或切换器文字旋转 |
| 配置缓存 | 二次访问 | `ciwi_switcher_config` TTL 缓存命中 |
| 反爬 | bot UA | 不触发 IP；可能 `includeCrawlerPrintLog` |

## Network 关键请求

| 请求 | 含义 |
|------|------|
| `widgetConfigurations/getData` | 读 Switcher 配置 |
| `currency/getCurrencyByShopName` | 货币列表 |
| `browsing_context_suggestions.json` | Shopify IP/语言建议（优先） |
| `api.ipapi.com` | IP 兜底 |

## CDP 常用检查

**读 localStorage：**

```javascript
JSON.stringify({
  lang: localStorage.getItem("ciwi_selected_language"),
  country: localStorage.getItem("ciwi_selected_country"),
  currency: localStorage.getItem("ciwi_selected_currency"),
  ipExpire: localStorage.getItem("ciwi_iplocation_expire_at"),
})
```

**读当前 locale（Shopify）：**

```javascript
JSON.stringify({
  language: window.Shopify?.locale,
  country: window.Shopify?.country,
  currency: window.Shopify?.currency?.active,
})
```

**采样价格节点：**

```javascript
Array.from(document.querySelectorAll(".ciwi-money"))
  .slice(0, 5)
  .map((el) => el.textContent.trim())
```

**切换器是否挂载：**

```javascript
({
  hasCiwiContainer: !!document.querySelector("#ciwi-container"),
  hasForm: !!document.querySelector("ciwiswitcher-form"),
  blockCount: document.querySelectorAll("ciwiswitcher-form").length,
})
```
