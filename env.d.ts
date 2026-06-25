/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

interface ImportMetaEnv {
  readonly DATABASE_URL?: string;
  readonly TURSO_TEST_DATABASE_URL?: string;
  readonly TURSO_TEST_AUTH_TOKEN?: string;
  readonly TURSO_PROD_DATABASE_URL?: string;
  readonly TURSO_PROD_AUTH_TOKEN?: string;
  readonly TURSO_TARGET?: "test" | "prod";
  readonly TRANSLATE_V4_ENABLED?: string;
  /** 逗号分隔：仅这些店可见首页极速翻译卡片与一键迁移 */
  readonly TRANSLATE_V4_SHOP_ALLOWLIST?: string;
  /** true/1/yes 时忽略 allowlist，全员开放极速翻译与迁移 */
  readonly TRANSLATE_V4_SHOP_ALLOWLIST_OPEN?: string;
}
