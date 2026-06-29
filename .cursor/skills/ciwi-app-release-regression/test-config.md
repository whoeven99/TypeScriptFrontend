# Ciwi App 上线回归 — 测试配置

Agent 执行全 App 回归前**必须先读此文件**。Switcher 前台 URL 与密码与 [ciwi-switcher-regression/test-config.md](../ciwi-switcher-regression/test-config.md) 共用。

## 环境

| 键 | test 值 | 说明 |
|----|---------|------|
| `TEST_ENV` | `test` | `test` = Ciwi.ai:FAT(Test)；`prod` = 生产 |
| `TEST_SHOP` | `ciwishop` | 店铺 handle |
| `TEST_STORE_DOMAIN` | `ciwishop.myshopify.com` | |
| `TEST_STOREFRONT_PASSWORD` | `123456` | 密码保护店（仅测试环境） |
| `TEST_APP_HANDLE` | `ciwi-test` | Admin Apps 路径中的 handle |

## URL

| 键 | 值 |
|----|-----|
| `TEST_APP_URL` | `https://typescriptfrontend.onrender.com` |
| `TEST_ADMIN_HOME` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app` |
| `TEST_ADMIN_LANGUAGE` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/language` |
| `TEST_ADMIN_TRANSLATE_V2` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/translate` |
| `TEST_ADMIN_TRANSLATE_V4` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/translate-v4` |
| `TEST_ADMIN_MANAGE` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/manage_translation` |
| `TEST_ADMIN_CURRENCY` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/currency` |
| `TEST_ADMIN_SWITCHER` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/switcher` |
| `TEST_ADMIN_PRICING` | `https://admin.shopify.com/store/ciwishop/apps/ciwi-test/app/pricing` |
| `TEST_PRODUCT_PAGE` | 见 switcher test-config | 前台 Switcher 主测页 |

## 环境变量（发布核对）

| 变量 | 用途 |
|------|------|
| `SERVER_URL` | Java 后端 |
| `DATABASE_URL` | Prisma session |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | OAuth |
| Turso `ShopTranslationSettings.migratedToTsf` | 已迁移店启用 v4 导航与 `/app/translate-v4` |
| `SHOPIFY_ALLOW_BOT_UA` | `true` 时 Cursor 浏览器可测 Admin（需 patch 生效） |
| Cosmos / Redis / v4 worker 相关 | 仅 v4 回归需要 |

## 发布前人工确认

- [ ] `shopify app deploy` / Render build 成功
- [ ] Webhook 订阅与 `shopify.app.*.toml` 一致
- [ ] Theme Extension 已部署到测试店
- [ ] Java 后端与 worker 版本与前端匹配
