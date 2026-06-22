# Ciwi Switcher 回归测试配置

修改本文件中的 URL 与店铺信息。Agent 执行回归测试前**必须先读此文件**。

| `TEST_STOREFRONT_PASSWORD` | `123456` | Storefront 密码保护（仅测试环境，见 `.cursor/skills/`） |

| 键 | 值 | 说明 |
|----|-----|------|
| `TEST_SHOP` | `ciwishop` | Shopify 店铺 handle（不含 `.myshopify.com`） |
| `TEST_STORE_DOMAIN` | `ciwishop.myshopify.com` | 完整 myshopify 域名 |
| `TEST_ENV` | `test` | `test` = Ciwi.ai:FAT(Test)；`prod` = 生产 App |

## 前台 URL（Cursor 内置浏览器主要测这里）

| 键 | 值 | 说明 |
|----|-----|------|
| `TEST_STOREFRONT_HOME` | `https://ciwishop.myshopify.com/` | 首页（测 IP 首次定位、首页图翻译） |
| `TEST_PRODUCT_PAGE` | `https://ciwishop.myshopify.com/products/10-bosch-siemens-cleaning-tablets-improved-formula-tz80001a-white?_pos=3&_sid=bf6b72680&_ss=r` | **回归主测页**：语言切换、货币换算、商品图 Alt |
| `TEST_COLLECTION_PAGE` | `` | 可选：系列页 |
| `TEST_PAGE_WITH_PAGEFLY` | `` | 可选：含 PageFly 的页面 |
| `TEST_PAGE_WITH_CUSTOM_LIQUID` | `` | 可选：含 custom liquid 的页面 |

> 用户提供的标准商品页样例请填在 `TEST_PRODUCT_PAGE`。未填写时 Agent 应询问用户，勿猜测 URL。

## Admin URL（可选，需 Shopify 登录）

| 键 | 值 |
|----|-----|
| `TEST_ADMIN_SWITCHER` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/switcher` |
| `TEST_ADMIN_CUSTOM_REDIRECTS` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/switcher/custom_redirects` |

Admin 嵌入式页面在 Cursor 内置浏览器可能 410；前台 extension 测试不受影响。

## 测试数据前提

- [ ] 主题已启用 **Ciwi_Switcher** App Block 并已保存主题
- [ ] `/app/language` 至少 **2 种已发布**语言
- [ ] `/app/currency` 至少 **2 种**货币且汇率可用
- [ ] Shopify 设置 → 通用 → 货币格式已配置 `<span class=ciwi-money>…</span>`
- [ ] 测 IP 定位：Switcher 已开 Geolocation + **非 Free 套餐** + IP 额度 > 0

## localStorage 键（测 IP / 切换前常需清空）

```
ciwi_selected_language
ciwi_selected_country
ciwi_selected_currency
ciwi_iplocation_expire_at
ciwi_switcher_config
ciwi_currency_data
```

清空脚本（在商品页 CDP `Runtime.evaluate` 中执行）：

```javascript
[
  "ciwi_selected_language",
  "ciwi_selected_country",
  "ciwi_selected_currency",
  "ciwi_iplocation_expire_at",
].forEach((k) => localStorage.removeItem(k));
location.reload();
```

## 扩展部署

修改 `extensions/ciwi-switcher/` 后需部署才能在店铺生效：

```bash
npm run deployTest   # 测试 App
# 或 shopify app dev + 主题预览
```

记录本次测试对应的 **git commit / deploy 时间**，写入回归报告。
