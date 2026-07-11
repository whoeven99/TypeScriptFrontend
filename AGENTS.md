# AGENTS.md

This file is the navigation index for future AI agents working in this repo.
Read it before changing code, then use the relevant section to jump to the
right route, server helper, worker, extension, script, or Prisma model.

## Required Workflow

1. Read `AGENTS.md` first and identify the feature area.
2. Run `git status --short` before editing. Do not overwrite user changes or
   unrelated untracked files.
3. Read the route entry, server helper, worker or extension caller, and Prisma
   model that own the behavior.
4. Keep changes small and local to the feature boundary.
5. Never copy, print, commit, or summarize real values from `.env*`. Mention
   variable names only.
6. Some existing Chinese comments may display as mojibake in PowerShell. Do not
   rewrite whole files for encoding cleanup unless explicitly asked.
7. For Shopify, billing, quota, worker, and live-store writeback changes, verify
   the smallest meaningful path and report any remaining risk.

## Project Overview

- Shopify embedded app built with Remix, Vite, React, Polaris, and Ant Design.
- Main app code lives in `app/`.
- Background translation worker lives in `worker/` as a separate TypeScript
  package.
- Prisma schema lives in `prisma/schema.prisma`; generated client output is
  `app/generated/prisma`.
- Runtime database is Turso/LibSQL through `app/db.server.ts`, even though the
  Prisma datasource says `sqlite`.
- Translation v4 job state spans Cosmos, Redis, Azure Blob, Turso, and Shopify
  Admin API.
- Storefront runtime code lives in Shopify extensions under `extensions/`.
- Legacy Spring/Java wrapper file `app/api/JavaServer.ts` has been removed and
  runtime quota, billing, picture, currency, switcher, glossary, PageFly, and
  manage-translation paths no longer call Spring. Remaining `legacy` / `Spring`
  text is compatibility naming, historical schema commentary, or old-data
  handling unless a new outbound call is reintroduced.

## Markdown Policy

`AGENTS.md` is the durable AI-facing index. Historical debug notes and phase
plans have been merged here and removed. Prefer updating this file instead of
adding another root-level planning or debug markdown file.

Keep separate markdown only when it is colocated with a subsystem and carries
deep implementation detail that would be too long for this index. If a new
temporary debug note is needed, delete or merge it after the issue is resolved.

## Top-Level Map

| Path | Purpose |
| --- | --- |
| `app/root.tsx` | Global Remix root, Redux provider, GTM/web-vitals, global client error reporting. |
| `app/shopify.server.ts` | Shopify app config, auth exports, API version, session storage. |
| `app/db.server.ts` | Turso/Prisma client creation and runtime env loading. |
| `app/routes/app.tsx` | Embedded app shell, auth, nav, bootstrap, install-time init, shop scan trigger. |
| `app/routes/*` | Remix flat routes for pages and API endpoints. |
| `app/server/*` | Server-side business logic. Prefer adding feature helpers here and keeping routes thin. |
| `app/lib/*` | Shared small helpers used by route/UI code. |
| `app/config/*`, `app/hooks/*`, `app/utils/*`, `app/shared/*` | Runtime configuration, shared hooks, error/log helpers, and cross-runtime message tokens. |
| `app/api/googleAnalyticsClient.ts` | Google Analytics Measurement Protocol helper; not related to Spring/Java. |
| `app/store/*` | Redux store modules, mostly for older pages. |
| `app/components/*` | Shared React components, including manage-translation editors and support chat. |
| `app/ui/*` | Shared UI wrappers/theme/message helpers. |
| `prisma/schema.prisma` | Turso/Prisma model source. |
| `prisma/migrations/*` | SQL migrations. |
| `worker/src/*` | Background workers and services for translation, shop scan, email, Cosmos/Blob/Redis/LLM. |
| `extensions/ciwi-switcher/*` | Storefront language/currency switcher theme extension. |
| `extensions/web-pixel/*` | Shopify web pixel extension. |
| `scripts/*` | Migration, audit, diagnostic, cleanup, and one-off operational scripts. |
| `public/locales/*/translation.json` | App i18n strings. Add at least `en` and `zh-CN` for new UI text. |
| `.github/workflows/tsf-deploy.yml` | Manual Shopify extension/config and Render app/worker deployment workflow. |
| `Dockerfile`, `DockerfileDev`, `DockerfileProd` | Render container builds for the Remix app; the worker is built from `worker/`. |

## Commands And Validation

Package scripts:

- `npm run dev`: Shopify app dev on port 8080.
- `npm run build`: Remix/Vite build. Useful for route mapping and bundle checks.
- `npm run setup` or `npx prisma generate`: generate Prisma client.
- `npx prisma validate`: validate Prisma schema.
- `npm run worker:build`: build worker TypeScript.
- `npm run worker:dev` / `npm run worker:start`: run the worker package in watch
  mode or from compiled `worker/dist`.
- `npm run check:filter`: verify the app-side translation-filter copy against
  its Spark provenance file; it does not compare the TSF app and worker copies.
- `npm run lint`: repository ESLint check; existing repository-wide noise may
  make a focused build/type check more useful for small changes.
- `npm run turso:migrate:test` / `npm run turso:migrate:prod`: run Turso migrations.
- `npm run deployTest` / `npm run deployProd`: Shopify app deploy with matching config.

Validation choices:

- Prisma schema or migration: `npx prisma generate` and `npx prisma validate`.
- App route or UI: `npm run build`.
- Worker code: `npm run worker:build`.
- Translation filter rules: `npm run check:filter`.
- Worker module catalog: `npm run check:auto-translate-modules --prefix worker`.
- Billing/quota: focused grep or script validation across TSF paths.

## UI Standards

Use these rules when changing UI. They summarize the older UI design, audit, and
execution docs that were consolidated into this file.

- The app should feel like a Shopify Admin tool: restrained, reliable, dense
  enough for repeated work, and not like a marketing landing page.
- Polaris is the visual and semantic baseline. Ant Design is allowed for complex
  tables, charts, dense filters, modal interiors, and high-density business
  controls.
- Ant Design theme values should be derived from Polaris-like tokens through
  `app/ui/theme.ts`; avoid creating a second visual system.
- Prefer existing shared wrappers in `app/ui/components/*`, including
  `AppPageHeader`, `AppSectionCard`, `AppStatusBadge`, and `AppButton`.
- Avoid new hard-coded colors, ad hoc font sizes, one-off radius values, and
  large inline style blocks in route files.
- Page patterns:
  - Overview/dashboard pages: summary first, then status/risk/action entry.
  - Settings pages: grouped form sections with clear save feedback.
  - Resource management pages: filter/action area plus dense table/list body.
  - Editor pages: stable two-pane or master/detail layout.
  - Pricing pages: clear plan hierarchy, restrained emphasis, no aggressive
    sales-page styling.
- One page section should have one clear primary action. Secondary actions should
  not compete visually with the main action.
- Add i18n keys for visible UI text in `public/locales/en/translation.json` and
  `public/locales/zh-CN/translation.json`.

## Route Entries

### App Shell, Auth, Webhooks

- `app/routes/app.tsx`: app shell loader/action, navigation, app bootstrap.
- `app/routes/auth.$.tsx`, `app/routes/auth.login/route.tsx`: Shopify auth.
- `app/routes/webhooks.tsx`: Shopify webhook topic handling. Billing and uninstall
  logic use TSF billing exclusively.
- `app/routes/currencyInit.tsx`: currency initialization route.
- `app/routes/web-vitals-metrics.tsx`: web vitals receiver.
- `app/routes/log.tsx`: structured client log receiver plus legacy form payload
  compatibility; client helpers live in `app/utils/clientLog.ts`.
- `app/routes/publishAction.tsx`: publish/unpublish Shopify locales.
- `app/routes/_index/route.tsx` and `app/routes/app._index/route.tsx`: root entry
  and embedded `/app` redirect/landing behavior.
- `app/routes/invite/route.tsx`: standalone invite page.

### Main Pages

- `/app/translate-v4`: `app/routes/app.translate-v4/route.tsx`.
- `/app/language`: `app/routes/app.language/route.tsx`.
- `/app/manage_translation`: `app/routes/app.manage_translation/route.tsx`.
- `/app/manage_translation/<module>`: `app/routes/app.manage_translation_.*/route.tsx`.
- `/app/currency`: `app/routes/app.currency/route.tsx`.
- `/app/switcher`: `app/routes/app.switcher/route.tsx`.
- `/app/glossary`: `app/routes/app.glossary/route.tsx`.
- `/app/pricing`: `app/routes/app.pricing/route.tsx`.
- `/app/shop-profile`: `app/routes/app.shop-profile/route.tsx`; nav is hidden in production.

### API Routes

- `/api/app-bootstrap`: `app/routes/api.app-bootstrap.ts`.
- `/api/billing/active-subscription`: `app/routes/api.billing.active-subscription.ts`.
- `/api/shop-profile`: `app/routes/api.shop-profile.ts`.
- `/api/support`: `app/routes/api.support.tsx`.
- `/api/storefront/*`: `app/routes/api.storefront.$.ts`, the Shopify App Proxy API.
- `/api/picture/*`: `app/routes/api.picture.{product,shop,upload,upsert,delete,save-from-url}.ts`.
- `/api/translate-v4/tasks`: `app/routes/api.translate-v4.tasks.ts`.
- `/api/translate-v4/task-action`: `app/routes/api.translate-v4.task-action.ts`.
- `/api/translate-v4/task-progress`: `app/routes/api.translate-v4.task-progress.ts`.
- `/api/translate-v4/coverage`: `app/routes/api.translate-v4.coverage.ts`.
- `/api/translate-v4/quota`: `app/routes/api.translate-v4.quota.ts`.
- `/api/translate-v4/single`: `app/routes/api.translate-v4.single.ts`.
- `/api/translate-v4/image`: `app/routes/api.translate-v4.image.ts`.
- `/api/translate-v4/currency`: `app/routes/api.translate-v4.currency.ts`.
- `/api/translate-v4/glossary`, `liquid`, `pagefly`, `switcher`,
  `target-locale`: feature-specific translate-v4 APIs.

## Feature Index

### Translation V4

Core files:

- UI page: `app/routes/app.translate-v4/route.tsx`.
- UI components: `app/routes/app.translate-v4/components/*`.
- UI constants/status/i18n: `constants.ts`, `v4I18n.ts`, `jobStageUtils.ts`,
  `v4JobNotice.ts`, `localeDisplay.ts`.
- Client create-task helper: `app/lib/createTranslateV4Tasks.ts`.
- Create/list jobs: `app/routes/api.translate-v4.tasks.ts`.
- Pause/resume/cancel/delete: `app/routes/api.translate-v4.task-action.ts`.
- Progress summaries: `app/server/translateV4/progress.server.ts`.
- Cosmos jobs: `app/server/translateV4/cosmos.server.ts`.
- Redis progress/control/hints: `app/server/translateV4/redis.server.ts`.
- Blob helpers: `app/server/translateV4/blob.server.ts`.
- Types/status rules: `app/server/translateV4/types.ts`.
- Resume rules: `app/server/translateV4/resumeStatus.ts`.
- Module catalog: `app/server/translateV4/moduleCatalog.ts` and
  `worker/src/services/moduleCatalog.ts`.
- Single-field translation: `app/routes/api.translate-v4.single.ts` ->
  `app/server/translateV4/singleTranslate.server.ts` ->
  `worker/src/services/syncTranslate.ts` / `llmTranslate.ts`.
- Shared translation safeguards: `htmlTranslate.server.ts`,
  `jsonExtractRules.server.ts`, `placeholderMask.server.ts`,
  `targetLanguagePrompt.server.ts`, and `translateQuality.server.ts`, mirrored
  by the worker service equivalents used in batch translation.

Data flow:

1. UI calls `createTranslateV4Tasks()`.
2. `POST /api/translate-v4/tasks` validates locales, modules, and quota guard.
3. `createV4Job()` writes a Cosmos job and pushes a Redis init hint into the
   **manual** or **auto** pool queue (`translate:v4:hint:init:{manual|auto}`).
4. `worker/src/workers/initWorker.ts` claims via `fairStageClaim` (manual first),
   reads Shopify translatable resources and writes init blobs.
5. `worker/src/workers/translateWorker.ts` reads blobs, calls LLMs, writes
   checkpoints, updates Redis/Cosmos progress, and deducts quota.
6. `worker/src/workers/writebackWorker.ts` writes translations back to Shopify.
7. UI polls summaries/progress and renders job state.

Common edits:

- Add/remove translation module: update both module catalogs, then run
  `npm run check:auto-translate-modules --prefix worker`; filter validation is a
  separate concern.
- Change create-task UX or request body: start in `app/lib/createTranslateV4Tasks.ts`,
  then `api.translate-v4.tasks.ts`.
- Change pause/resume/cancel: inspect `api.translate-v4.task-action.ts`,
  `resumeStatus.ts`, `translateWorker.ts`, and `writebackWorker.ts`.
- Change progress display: inspect `progress.server.ts`, `jobStageUtils.ts`,
  `TaskQueueSection.tsx`, and `JobExpandedDetail.tsx`.
- Change coverage/counts: inspect `coverage.server.ts`, `itemsCount.server.ts`,
  and `api.translate-v4.coverage.ts`.
- Change copy: update locale JSON and any helper in `v4I18n.ts`.

### Translation Filters

- App-side generated copy: `app/server/translateV4/translationFilter/*` plus
  `.synced-from-spark.json` provenance.
- TSF worker runtime copy: `worker/src/services/translationFilter/*`.
- Declared source of truth for the app-side copy: sibling repo
  `../Spark/worker/src/services/translationFilter/*`.
- Sync/check script: `scripts/sync-translation-filter.mjs`; `npm run sync:filter`
  copies Spark into the app-side directory and rewrites provenance, while
  `npm run check:filter` checks only that generated app copy.

Do not hand-edit the generated app-side directory. Make rule changes in the
Spark source, sync them, and separately inspect/update the TSF worker runtime
copy when the batch worker needs the same behavior. Do not assume
`npm run check:filter` proves app/worker parity.

Filter decision chain:

1. Reject blank values.
2. Reject Shopify default option placeholders such as `Default Title`, `Default`,
   and `Title` for product option modules.
3. If not in cover mode, reject fields that already have a non-outdated
   translation.
4. Reject non-translatable resource/link/file/url types.
5. Reject `JSON` except supported metafield cases.
6. Reject `handle` URI fields unless the task explicitly enables handle
   translation.
7. Reject generic non-human text such as timestamps, URLs, IDs, hashes, JWTs,
   email/phone values, booleans, pure numbers, and size/config values.
8. Apply theme-specific rules for placeholder headings, demo content, asset
   names, paths, and locale-content blocklists.
9. Apply metafield-specific rules for encoded strings, Base64, CSS/config
   fragments, and known third-party snippets.
10. Reject `METAOBJECT` values containing `grp__`.

### Worker

Entries:

- `worker/src/index.ts`: env loading, Redis ping, shutdown, scheduler start.
- `worker/src/scheduler.ts`: polls init/translate/writeback, email, shop scan,
  and auto-translate; also runs deploy wake/stale reset, empty auto-job cleanup,
  and subscription reconciliation schedules.
- `worker/src/env.ts`: required env diagnostics.
- `worker/src/shutdown.ts`: shared shutdown flag; `index.ts` releases jobs
  claimed by the current process on SIGTERM/SIGINT before exit.

Pipeline:

- `worker/src/workers/initWorker.ts`: initialize jobs and write init blobs.
- `worker/src/workers/translateWorker.ts`: translation stage, LLM calls,
  checkpoints, quota, pause/cancel.
- `worker/src/workers/writebackWorker.ts`: Shopify translation writeback.
- `worker/src/workers/shopScanWorker.ts`: shop profile scan.
- `worker/src/workers/emailWorker.ts`: notifications.

Services:

- `worker/src/services/cosmosV4.ts`: Cosmos translation jobs.
- `worker/src/services/blobV4.ts`, `translateBlobIO.ts`: Blob IO and checkpoint format.
- `worker/src/services/redisV4.ts`: progress, **split auto/manual hint queues**, control keys.
- `worker/src/services/fairStageClaim.ts`: claim order = manual hint → auto hint →
  legacy mixed queue → Cosmos scan (manual first). Manual never waits behind auto.
- `worker/src/services/llmTranslate.ts`: LLM routing, concurrency, usage.
- `worker/src/services/translationMemory.ts`: Redis translation memory keyed by
  field identity and normalized source value; single-field manual translation
  skips cache reads but can write successful output back.
- `worker/src/services/translateQuality.ts`, `placeholderMask.ts`,
  `translationFieldLimits.ts`: wrong-language/untranslated checks, protected
  token restoration, and Shopify title length enforcement.
- `worker/src/services/htmlTranslate.ts`, `jsonExtractRules.ts`:
  structure-preserving HTML/JSON extraction and reconstruction.
- `worker/src/services/targetLanguagePrompt.ts`, `userFacingMessages.ts`:
  locale-specific prompt constraints and stable user-facing status messages.
- `worker/src/services/tsfQuota.ts`: quota query/deduct adapter.
- `worker/src/services/stagePool.ts`: stage concurrency (auto/manual slot pools).
- `worker/src/services/autoTranslate.ts`, `autoScanSchedule.ts`: auto translate.
- `worker/src/services/cleanupEmptyAutoJobs.ts`, `autoJobCleanup.ts`: automatic
  job cleanup helpers; the scheduler invokes `cleanupStaleEmptyAutoJobs()`.
- `worker/src/services/billingSubscriptionReconcile.ts`: near-due and periodic
  Shopify subscription reconciliation against Turso.
- `worker/src/services/shopScan/*`: shop profile scan stages.

Hint queue keys (Redis lists):

- `translate:v4:hint:{init|translate|writeback}:manual`
- `translate:v4:hint:{init|translate|writeback}:auto`
- Legacy (drain-only during deploy): `translate:v4:hint:{init|translate|writeback}`

App push helpers: `app/server/translateV4/redis.server.ts` → `v4HintKey(stage, pool)`.

Important env names only:

- Cosmos: `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_TRANSLATION_DATABASE_ID`,
  `COSMOS_TRANSLATION_V4_JOBS_CONTAINER`, and app-side `_V4` variants.
- Redis: `REDIS_URL`, `REDIS_URL_V4`, or host/password/port variants.
- Blob: `AZURE_BLOB_CONNECTION_STRING`, `AZURE_BLOB_TRANSLATION_CONTAINER`.
- Turso: `TSF_TURSO_DATABASE_URL`, `TSF_TURSO_AUTH_TOKEN`.
- LLM: `DEEPSEEK_API_KEY`, `DEEPSEEK_API_KEYS`, `DEEPSEEK_BASE_URL`,
  `GOOGLE_TRANSLATE_API_KEY`, `Gpt_ApiKey`.
- Quota: `QUOTA_ENFORCE`, `QUOTA_TOKEN_MULTIPLIER`（Worker 额度读写直连 Turso，不再调 Spring `/quota`）,
  `TRANSLATE_QUOTA_FLUSH_CHARGE`.
- Scheduling: `WORKER_STAGES`, `WORKER_POLL_INTERVAL_MS`,
  `TRANSLATE_CHUNK_CONCURRENCY`, `MAX_CONCURRENT_AUTO_TRANSLATE_JOBS`,
  `MAX_CONCURRENT_MANUAL_TRANSLATE_JOBS`, `AUTO_TRANSLATE_*`.
- Auxiliary schedules: `SHOP_SCAN_POLL_INTERVAL_MS`, `EMAIL_WORKER_INTERVAL_MS`,
  `AUTO_EMPTY_JOB_CLEANUP_INTERVAL_MS`,
  `BILLING_SUBSCRIPTION_RECONCILE_INTERVAL_MS`, and
  `BILLING_SUBSCRIPTION_NEAR_DUE_RECONCILE_INTERVAL_MS`.
- Email: `TENCENT_CLOUD_KEY_ID`, `TENCENT_CLOUD_KEY`, and template/recipient
  variables consumed by `workerEmail.ts` and TSF email helpers.

### Billing And Quota

Models:

- `ShopBillingBinding`: `legacy` vs `tsf` ownership.
- `Account`: TSF credit pools: subscription, purchased, trial, used.
- `PlanCatalog`, `AppSubscription`, `BillingLog`, `AccountPeriodUsage`.

Code:

- `app/server/billing/index.server.ts`: billing barrel exports.
- `app/server/billing/binding/resolveBillingBinding.server.ts`: ownership routing.
- `app/server/billing/quota/quotaRouter.server.ts`: quota query/deduct routing.
- `app/server/billing/quota/createTaskQuotaGuard.server.ts`: create-task guard.
- `app/server/billing/quota/deductCredits.server.ts`: TSF credit deduction.
- `app/server/billing/webhooks/handleBillingWebhook.server.ts`: TSF webhook handling.
- `worker/src/services/billingSubscriptionReconcile.ts`: worker-only 12h Shopify
  subscription period reconciliation (writes Turso directly; does not call TSF Web).
- `worker/src/services/accountBalance.ts`: credit pool settle helpers for renewals.
- `app/routes/webhooks.tsx`: Shopify webhook branching.
- `app/routes/app.pricing/route.tsx`: pricing UI/actions.
- `app/server/billing/quota/quotaRouter.server.ts`: shared app-side quota facade;
  `/api/translate-v4/quota`, task creation, single translation, and picture
  translation all use this TSF account path.
- `worker/src/services/tsfQuota.ts`: worker quota adapter.

Quota work must check:

- Create-task guard.
- Worker deduction and pause-on-insufficient behavior.
- Webhook income paths for subscriptions and token packs.

Billing notes:

- Runtime billing, quota reads/deductions, and Shopify billing webhooks use TSF
  Turso. `ShopBillingBinding.billingSystem` and `BILLING_SYSTEM.LEGACY` remain as
  compatibility data/types; `resolveBillingBinding()` defaults missing rows to
  `tsf`, but existing binding rows are still returned unchanged.
- TSF quota remaining is derived from `subscriptionCredits + purchasedCredits +
  trialCredits - usedCredits`.
- Worker 额度读写直连 Turso Account。
- Worker runs a near-due reconciliation every 30 minutes and a full subscription
  reconciliation every 12 hours by default (both configurable) inside the
  worker process when Turso credentials are set. TSF Web does not schedule or
  execute these jobs.

### Currency

- Models: `Currency`, `CurrencyRate`.
- Server: `app/server/currency/currency.server.ts`.
- Admin API: `app/routes/api.translate-v4.currency.ts`.
- Page: `app/routes/app.currency/route.tsx` and components.
- Init route: `app/routes/currencyInit.tsx`.
- Storefront App Proxy: `app/routes/api.storefront.$.ts` paths
  `currency/getCurrencyByShopName` and `currency/getCacheData`.
- Extension caller: `extensions/ciwi-switcher/assets/ciwi-api.js`.

Currency changes often touch admin, App Proxy, and extension JS.

### Switcher And Storefront App Proxy

- Admin page: `app/routes/app.switcher/route.tsx`.
- Client helper: `app/routes/app.switcher/switcherClient.ts`.
- UI component: `app/routes/app.switcher/components/switcherSettingCard.tsx`.
- Server: `app/server/storefront/switcherAdmin.server.ts`,
  `switcherConfig.server.ts`, `switcherData.server.ts`, `auth.server.ts`,
  `response.server.ts`.
- App Proxy: `app/routes/api.storefront.$.ts`.
- Extension: `extensions/ciwi-switcher/blocks/ciwi_I18n_Switcher.liquid` and
  `extensions/ciwi-switcher/assets/ciwi-*.js`.
- Constants: `app/lib/switcherConstants.ts`.
- `ipOpen` is the live geolocation switch. Prisma model `IpRedirection` still
  exists, but the current app/extension source has no live route or service
  caller for it. Do not assume the removed `api.translate-v4.ip-redirections` /
  `custom_redirects` path exists; verify and design a new owner before reviving
  region-specific redirect records.
- `ipOpen` 写入 Turso `SwitcherConfiguration`；确认保存时**不再**调用 Spring
  `/userIp/addOrUpdateUserIp`。店面 IP 定位走 `ciwi-main.js` + ipapi。

Do not make storefront API unauthenticated. App Proxy requests use HMAC checks.

### Picture Translation (TSF)

- Prisma model: `UserPicture`.
- Server: `app/server/picture/picture.server.ts`, `translateImage.server.ts`,
  `aidge.server.ts`, `cos.server.ts`.
- Admin client: `app/api/pictureClient.ts`, using TSF endpoints
  `/api/picture/*` and `/api/translate-v4/image`.
- Routes: `api.picture.*`, `api.translate-v4.image`, storefront picture paths in
  `api.storefront.$.ts`.
- Admin pages: `app.manage_translation/route.tsx`,
  `app.manage_translation_.productImage/route.tsx`,
  `app.manage_translation_.productImageAlt/route.tsx`.
- Extension reads: `extensions/ciwi-switcher/assets/ciwi-api.js` via App Proxy.
- 图片翻译扣费走 TSF Turso `deductShopCredits`。

### Manage Translation Legacy Pages

- Main page: `app/routes/app.manage_translation/route.tsx`.
- Resource pages: `app/routes/app.manage_translation_.*/route.tsx`.
- Server helper: `app/server/manageTranslation/manageTranslationRoute.server.ts`.
- Manage save paths use TSF/Shopify helpers such as
  `app/server/shopify/translations.server.ts`.
- Editors: `app/components/manageTableInputEditor.tsx`,
  `manageTableInput.tsx`, `manageTableRichText.ts`, `richTextInput/*`.
- Shopify translation helper: `app/server/shopify/translations.server.ts`.

These pages are not the same UX as translation v4 jobs. Preserve existing
interaction unless the user explicitly asks for a redesign or consolidation.

Historical manage-translation migration guidance:

- All manage pages now read Shopify translatable resources directly.
- All pages（包括 shipping）保存已直连 Shopify `registerManageTranslations`。
- The TSF-side direct save helper is `app/server/shopify/translations.server.ts`.
- When modifying save/delete behavior, preserve the existing response shape used
  by page actions and surface Shopify `userErrors` as partial failures.
- `SingleTextTranslate`, image translation, PageFly, and some summary/count
  behavior may still be intentionally legacy or separate from the save path.

Summary/count guidance:

- Manage summary counts should use the same translation filter rules as v4,
  otherwise v4 can complete all fields it considers translatable while the old
  Java count still shows incomplete totals.
- Count logic lives around `app/server/translateV4/itemsCount.server.ts` and the
  `itemsCount` action branch in `app/routes/app.manage_translation/route.tsx`.
- Performance-sensitive count work must account for Shopify GraphQL cost and
  throttle status.

### Language, Glossary, Shop Profile, Support

Language:

- Page: `app/routes/app.language/route.tsx`.
- Client: `app/routes/app.language/languageClient.ts`.
- Server: `app/server/translateV4/targetLocale.server.ts`,
  `shopLocales.server.ts`.
- Models: `ShopTranslationSettings`, `ShopTargetLocale`.

Glossary:

- Page: `app/routes/app.glossary/route.tsx`.
- Server/API: `app/server/translateV4/glossary.server.ts`,
  `app/routes/api.translate-v4.glossary.ts`.
- Worker injection: `worker/src/services/glossary.ts` is loaded by
  `worker/src/services/llmTranslate.ts` for batch and single-field prompts.

Shop Profile:

- Page: `app/routes/app.shop-profile/route.tsx`.
- API: `app/routes/api.shop-profile.ts`.
- Server: `app/server/shopScan/*`.
- Worker: `worker/src/workers/shopScanWorker.ts`,
  `worker/src/services/shopScan/*`.
- Model: `ShopProfile`.

Shop profile intelligence direction:

- Treat `ShopProfile` as translation context, not only a display card.
- Current scan/profile code extracts shop identity, industry, keywords,
  description, brand tone, coverage, glossary suggestions, and content scale.
- Current production boundary: `buildShopProfilePromptBlock()` is used by the
  shop-profile page to preview a context block. `llmTranslate.ts` has a
  `profileBlock` parameter, but current callers pass an empty string and there is
  no worker `shopProfilePrompt.ts`; shop profile is not yet injected into live
  single, batch, or auto translation prompts.
- Future work should enrich this into reusable translation context: shop
  intelligence, content signals, terminology policy, market policy, and
  module-specific translation policy.
- Prompt injection points include `buildShopProfilePromptBlock`,
  `buildSystemPrompt`, single translation, batch translation, and future
  auto-translate paths.
- Do not dump raw full-store text into prompts. Prefer sampled, cleaned,
  weighted signals plus AI summarization.

Support chat:

- UI: `app/components/SupportChatWidget.tsx`.
- API: `app/routes/api.support.tsx`.
- Store: `app/server/support/supportStore.server.ts`.
- Models: `SupportConversation`, `SupportMessage`.
- Notifications: `app/server/feishu/*`, `app/server/email/tencentSes.server.ts`.

## Prisma Model Index

Current models:

- `Session`: Shopify session storage.
- `ShopTranslationSettings`: per-shop translation settings and migration flag.
- `ShopTargetLocale`: per-shop target locale and auto-translate flag.
- `Glossary`: glossary terms.
- `ShopProfile`: AI-generated shop profile.
- `SwitcherConfiguration`: storefront switcher settings.
- `Currency`, `CurrencyRate`: currency list and rate cache.
- `IpRedirection`: IP/region redirect settings.
- `PageFlyTranslation`: PageFly translations.
- `LiquidRule`: custom Liquid translation rules.
- `ShopBillingBinding`: legacy/TSF billing ownership.
- `Account`, `PlanCatalog`, `AppSubscription`, `BillingLog`,
  `AccountPeriodUsage`: TSF billing/quota.
- `SupportConversation`, `SupportMessage`: support chat.
- `UserPicture`: product/shop image translation metadata and translated image
  URLs used by admin pages and storefront App Proxy reads.

When changing schema:

1. Edit `prisma/schema.prisma`.
2. Add `prisma/migrations/<timestamp>_<name>/migration.sql`.
3. Run `npx prisma generate` and `npx prisma validate`.
4. Check whether generated files changed and whether this repo expects them committed.
5. Check scripts and worker code for the same field/model dependency.

## Legacy Java Boundary — FULLY DECOMMISSIONED

The Spring/Java runtime boundary is decommissioned. Live code uses TSF
infrastructure (Turso, Cosmos, Redis, Azure Blob, direct Shopify GraphQL, COS,
and external AI/email providers).

The legacy Spring wrapper `app/api/JavaServer.ts` has been deleted. Historical
`Spring`, `Java`, and `legacy` wording remains in compatibility comments, enum
values, old blob/token handling, and response-shape notes; it is not proof of a
live network dependency.

Residual `SERVER_URL` or Spring DB references in env files are historical
artifacts and should be cleaned up. No runtime code depends on them.

## Shopify Extensions

`extensions/ciwi-switcher` runs on the merchant storefront, not inside the admin app.

- Liquid block: `extensions/ciwi-switcher/blocks/ciwi_I18n_Switcher.liquid`.
- API caller: `extensions/ciwi-switcher/assets/ciwi-api.js`.
- UI/render: `assets/ciwi-ui.js`, `ciwi-main.js`, `ciwi-page.js`.
- Storage: `assets/ciwi-storage.js`.
- Styling: `assets/switcher.css`.

Check deploy configs when changing extensions:

- `shopify.app.toml`
- `shopify.app.test.toml`
- `shopify.app.prod.toml`

`extensions/web-pixel` is a standard Shopify web pixel extension. Its source is
`extensions/web-pixel/src/index.ts`; generated output is in `dist/`.

## Trigger Phrases (AI Agent Actions)

When the user says these exact or similar phrases, immediately run the
corresponding script without asking for confirmation:

| User says | Action |
|-----------|--------|
| "提个pr" / "提pr" / "创建PR" / "push and create PR" | Run `npm run push:pr`（或 `npm run push:pr -- --message "说明"`） |
| "合入PR然后发布测试环境" / "合入pr发布测试" / "merge and deploy test" | Run `npm run merge:deploy:test` |
| "发布测试环境" / "deploy test" (单独发布，不合入PR) | 触发 `tsf-deploy.yml` workflow on master，参数 `render_service_test=true, render_worker_test=true` |

For "合入PR然后发布测试环境", the script will:
1. Auto-detect the PR for the current branch
2. Squash-merge it to master
3. Switch local to master and pull
4. Trigger `tsf-deploy.yml` workflow for test environment
5. Output the workflow run URL

## Task Locator

| User asks about | First read | Then read |
| --- | --- | --- |
| Translation v4 UI | `app/routes/app.translate-v4/route.tsx` | `components/*`, `v4I18n.ts`, locales |
| Create task failure | `app/lib/createTranslateV4Tasks.ts` | `api.translate-v4.tasks.ts`, quota guard, Cosmos/Redis |
| Single-field translation | `api.translate-v4.single.ts` | `singleTranslate.server.ts`, worker `syncTranslate.ts` / `llmTranslate.ts`, quota guard |
| Stuck task/progress | `progress.server.ts` | worker scheduler/init/translate/writeback, Redis/Cosmos scripts |
| Pause/resume/cancel bug | `api.translate-v4.task-action.ts` | `resumeStatus.ts`, worker control logic |
| Quota mismatch | `quotaRouter.server.ts` | `webhooks.tsx`, TSF billing webhooks, worker `tsfQuota.ts` |
| Subscription/purchase bug | `app/routes/app.pricing/route.tsx` | `webhooks.tsx`, `app/server/billing/*` |
| Currency switcher bug | `app/server/currency/currency.server.ts` | `api.storefront.$.ts`, extension `ciwi-api.js` |
| App Proxy 401/404 | `api.storefront.$.ts` | `server/storefront/auth.server.ts`, extension caller |
| Manage Translation resource page | `app/routes/app.manage_translation_.<type>/route.tsx` | `manageTranslationRoute.server.ts`, `pictureClient.ts` |
| Picture translation/storage | `app/server/picture/picture.server.ts` | `api.picture.*`, `api.translate-v4.image`, `UserPicture`, App Proxy picture branches |
| Glossary | `app/routes/app.glossary/route.tsx` | `glossary.server.ts`, worker glossary injection |
| Shop profile / AI profile | `app/routes/app.shop-profile/route.tsx` | `server/shopScan/*`, worker shop scan |
| Support chat / notifications | `app/components/SupportChatWidget.tsx` | `api.support.tsx`, `supportStore.server.ts`, Feishu/SES helpers |
| Auto translate | `worker/src/services/autoTranslate.ts` | `autoScanSchedule.ts`, `ShopTargetLocale`, module catalog |
| Translation filter rule | sibling Spark filter source | `scripts/sync-translation-filter.mjs`, app generated copy, TSF worker runtime copy |
| i18n copy | `public/locales/en/translation.json` | `public/locales/zh-CN/translation.json`, other locales |
| Shopify auth/API version | `app/shopify.server.ts` | `app/routes/app.tsx`, auth and webhook routes |
| Deploy config | `shopify.app*.toml` | `Dockerfile*`, Render/GitHub Actions config |

## Scripts

Package-backed root scripts:

- `scripts/translate.js`: `npm run translate`, i18n helper.
- `scripts/turso-migrate.cjs`: `npm run turso:migrate:test|prod`.
- `scripts/sync-translation-filter.mjs`: `npm run sync:filter` and
  `npm run check:filter`.

Operational root scripts:

- `scripts/inspect-v4-tasks.mjs`: inspect v4 tasks in Cosmos.
- `scripts/check-task.mjs`: inspect one task and related Redis state.
- `scripts/diag-shop-scan.mjs`: inspect shop scan state.
- `scripts/cleanup-duplicate-target-locales.mjs`: target-locale cleanup.
- `scripts/next-auto-slot-shops.mjs`: preview shops in next auto-translate scan slot.
- `scripts/smoke-shop-counts.mjs`: focused shop/item count smoke check.
- `scripts/smoke-user-picture-read.mjs`, `smoke-user-picture-urls.mjs`: focused
  UserPicture read/URL checks.
- `scripts/smoke-find-juicer.mjs`: focused storefront/shop lookup smoke check.
- `scripts/eventReport.ts`: imported by app routes/components; this is runtime
  client reporting code, not a throwaway script.
- `scripts/language-locale-data.js`: locale/flag data consumed by switcher
  assets.
- `scripts/lib/autoScanSchedule.mjs`: helper used by auto-scan scheduling
  scripts.

Operational PowerShell scripts:

- `scripts/cursor-push-pr.mjs`: `npm run push:pr` — commit（跳过敏感文件）→ push → 创建 PR；
  成功输出 `PR_URL:`。供 Cursor Agent 在「提个pr」时直接调用。
- `scripts/pr.ps1`: 交互式 PowerShell 版提 PR（本地手动用）。
- `scripts/merge-deploy-test.mjs`: `npm run merge:deploy:test` — 合入当前分支 PR 并触发
  TSF Web Test + Worker Test 部署；成功输出 `MERGED_PR_URL:` 与 `DEPLOY_RUN_URL:`。
- `scripts/merge-deploy-test.ps1`: 交互式 PowerShell 版合入+部署（本地手动用）。

Worker scripts to keep:

- `worker/scripts/check-auto-translate-modules.mjs`: package-backed module
  catalog check.
- `worker/scripts/cleanup-stale-hints.mjs`: package-backed cleanup command.
- `worker/scripts/probe-hint-queues.mjs`: package-backed queue probe.
- `worker/scripts/diag-stuck-job.mjs`, `diag-failed-jobs.mjs`, and
  `probe-*.mjs`: worker diagnostics.
- `worker/scripts/resume-job.mjs` and `resume-orphaned-processing.mjs`:
  operational recovery tools.
- `worker/scripts/auto-tasks-24h-trend.mjs`: auto-translate volume report.
- `worker/scripts/v4-auto-translate-modules.json`: module catalog fixture/data.

Temporary script policy:

- `scripts/tmp/`, `worker/scripts/tmp/`, and `worker/scripts/out/` are ignored
  and should not contain committed files.
- Prefer one-off scripts outside the repo, or delete them immediately after the
  investigation. If a one-off becomes useful twice, promote it into the
  operational list above with a clear name and dry-run behavior when it writes.

## Operations Debugging

This section covers how to inspect live data and infrastructure state during
debugging, incident response, or ad-hoc investigation.

### Turso (SQL Database)

Turso is the primary relational store (billing, settings, glossary, etc.).
The Prisma client connects via `libsql://` HTTP.

**Local / dev query:**

```ps1
# Open a Node.js REPL with Prisma client loaded
node --experimental-vm-modules -e "
  const { PrismaClient } = require('./app/generated/prisma');
  const prisma = new PrismaClient();
  // Example: list recent accounts
  prisma.account.findMany({ take: 5, orderBy: { updatedAt: 'desc' } })
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .finally(() => prisma.\$disconnect());
"
```

**Key tables for debugging:**

| Table | Common Query |
|-------|-------------|
| `Account` | `findMany({ where: { shopName } })` — quota/credit state |
| `ShopBillingBinding` | `findUnique({ where: { shopName } })` — billing ownership |
| `AppSubscription` | `findMany({ where: { shopName }, orderBy: { createdAt: 'desc' } })` |
| `ShopTargetLocale` | `findMany({ where: { shopName } })` — auto-translate config |
| `SwitcherConfiguration` | `findUnique({ where: { shopName } })` — storefront switcher |
| `Glossary` | `findMany({ where: { shopName } })` — glossary entries |

**Prod access:** Turso prod credentials are in `.env.prod` as
`TSF_TURSO_DATABASE_URL` / `TSF_TURSO_AUTH_TOKEN`. You can also read them
from Render env vars (see Render section below).

### Cosmos DB (Translation V4 Jobs)

Cosmos holds translation job documents. Each job is keyed by `(id, shopName)`.

**Quick inspection scripts (local env):**

```ps1
# List jobs by id prefix or shop name
node scripts/inspect-v4-tasks.mjs <prefix1> <prefix2> ...

# Inspect one task (Cosmos + Redis combined)
node scripts/check-task.mjs <jobId> [shopName]

# Diagnose stuck/failed jobs
node worker/scripts/diag-stuck-job.mjs <idPrefix>
node worker/scripts/diag-failed-jobs.mjs
```

**Prod Cosmos access via Render API:**

`worker/scripts/probe-job-redis.mjs` reads Cosmos credentials from Render
service env vars, so you don't need `.env.prod` locally:

```ps1
$env:RENDER_API_KEY = "rnd_..."  # Render API key
node worker/scripts/probe-job-redis.mjs <jobIdPrefix>
```

**Key Cosmos fields for debugging:**

- `status`: `INIT_QUEUED` → `INITIALIZING` → `TRANSLATING` → `WRITEBACK` →
  `COMPLETED` / `FAILED` / `CANCELED`
- `errorStage` / `errorMessage`: which stage failed and why
- `metrics.translateDone` / `metrics.translateTotal`: translation progress
- `metrics.writebackDone` / `metrics.writebackTotal`: writeback progress
- `claimedBy`: worker instance that holds the job
- `lastHeartbeat`: last worker heartbeat (stale if > 2 min)
- `aiModel` / `aiModelUsed`: requested vs actual AI model

### Redis (Job Progress, Hint Queues, Controls)

Redis holds real-time progress counters, hint queues, control flags, and
translation memory cache.

**Hint queue inspection:**

```ps1
# Prod hint queues (reads .env.prod)
node worker/scripts/probe-hint-queues.mjs
```

**Key Redis keys:**

| Pattern | Purpose |
|---------|---------|
| `translate:v4:hint:{init\|translate\|writeback}:{manual\|auto}` | Stage hint queues |
| `translate:v4:progress:<jobId>` | Hash: per-stage done/total |
| `translate:v4:control:<jobId>` | String: `pause` / `cancel` / null |
| `translate:v4:progress:total:<jobId>` | String: total items per stage |
| `translate:v4:tm:<hash>` | Translation memory cache |
| `translate:v4:auto_scan:last_at` | Last auto-scan timestamp |

**Manual Redis query (if you have `REDIS_URL_V4` or `REDIS_URL`):**

```ps1
node -e "
  const Redis = require('ioredis');
  const r = new Redis(process.env.REDIS_URL_V4 || process.env.REDIS_URL);
  r.hgetall('translate:v4:progress:<jobId>').then(d => {
    console.log(JSON.stringify(d, null, 2));
    r.quit();
  });
"
```

### Render (Service Logs & Deploy Status)

The app and worker run on Render. Use the Render API or the built-in MCP tools
to inspect service state.

**MCP tools (available in Copilot):**

- `mcp_render_list_services` — list all Render services
- `mcp_render_list_deploys` — recent deploys for a service
- `mcp_render_get_deploy_logs` — detailed build/deploy log for a specific deploy
- `mcp_render_get_latest_failed_log` — auto-locate the most recent failed build

**Known service IDs:**

| Service | ID |
|---------|-----|
| TSF Web (Remix app) | `srv-csp2931u0jms738sfmc0` |
| TSF Worker | `srv-d8sqas4vikkc73f5nbog` |

**Render API direct access (PowerShell):**

```ps1
$env:RENDER_API_KEY = "rnd_..."

# List deploys
Invoke-RestMethod -Uri "https://api.render.com/v1/services/srv-csp2931u0jms738sfmc0/deploys?limit=5" `
  -Headers @{ Authorization = "Bearer $env:RENDER_API_KEY" }

# Get deploy logs (use deploy ID from list above)
Invoke-RestMethod -Uri "https://api.render.com/v1/services/srv-csp2931u0jms738sfmc0/deploys/<deployId>" `
  -Headers @{ Authorization = "Bearer $env:RENDER_API_KEY" }

# Read service env vars (for debugging config issues)
Invoke-RestMethod -Uri "https://api.render.com/v1/services/srv-csp2931u0jms738sfmc0/env-vars?limit=100" `
  -Headers @{ Authorization = "Bearer $env:RENDER_API_KEY" }
```

**Diagnostic flow:**

1. Check Render deploy status — is the service even running the latest code?
2. Check recent deploy logs — did the build succeed? Any env var missing?
3. Check env vars on Render — compare with `.env.prod` for drift.
4. If the service is healthy but data looks wrong, move to Turso/Cosmos/Redis.

### Combined Diagnostic Cheat Sheet

| Symptom | Start Here |
|---------|-----------|
| Translation job stuck in INIT_QUEUED | `probe-hint-queues.mjs` → check init hint queues |
| Translation job stuck in TRANSLATING | `diag-stuck-job.mjs` → check Redis progress + Cosmos heartbeat |
| Translation job stuck in WRITEBACK | Check Cosmos `errorStage`, Render worker logs |
| Quota/billing mismatch | Turso: `Account` + `AppSubscription` tables |
| Currency/switcher not working | Turso: `SwitcherConfiguration`, `Currency` tables |
| App 500 / worker crash | Render deploy logs → check for missing env vars |
| Auto-translate not running | `probe-hint-queues.mjs` auto queues + `auto_scan:last_at` |

## Debug Lessons

These replace old one-off debug markdown files.

- `translate-v4` SSR 500: old or malformed Cosmos job documents can lack
  `metrics`. Guard with `EMPTY_V4_METRICS`, make summary builders skip bad
  single jobs instead of crashing the page, and inspect
  `app/server/translateV4/progress.server.ts`, `pauseReconcile.server.ts`, and
  `listV4JobSummaries()`.
- `manage_translation` 502: first-screen item-count traffic can stress Shopify
  GraphQL cost buckets or upstream services. Check batching gaps, delayed
  non-core count batches, `itemsCount.server.ts` throttle handling, and whether
  logging uses beacon-style client logging instead of route `fetcher.submit`.
- `pricing` AbortError: Remix fetcher replacement or route changes can produce
  expected aborts. Global client error reporting should ignore AbortError-like
  noise, and exposure logging should prefer `reportClientLog(..., { beacon:
  true })` over competing fetcher submits.

## Risk Notes

- `.env`, `.env.test`, and `.env.prod` may contain live credentials. Never echo
  values in responses or docs.
- `node_modules/`, `build/`, and extension `dist/` are not places for manual edits.
- Runtime billing/quota is TSF Turso, but compatibility binding rows can still
  contain `legacy`; inspect actual callers before deleting the enum/model.
- Translation v4 state is distributed. State machine changes must consider
  resume, retry, delete, stale reset, Redis controls, Blob checkpoints, and
  Shopify writeback.
- Manual vs auto must stay on split hint queues (`:manual` / `:auto`); do not
  reintroduce a shared FIFO that lets auto starve manual.
- `WORKER_STAGES` can disable init/translate/writeback. Check it when debugging
  missing writeback.
- Manual and auto translation use **separate Redis hint queues and Cosmos scan
  filters**. Claim always prefers manual. If manual tasks sit in INIT_QUEUED while
  auto is busy, check whether code still pushes to legacy unsplit keys.
- Storefront extension calls TSF through App Proxy. API request shape changes
  often require extension JS changes.
- App Proxy supports explicit currency GET plus POST branches for Liquid,
  switcher configuration, PageFly, currency cache, and picture reads. Preserve
  HMAC verification and update `ciwi-api.js` together with route shape changes.
- Translation-filter ownership crosses into sibling `Spark`; the root check
  validates provenance for the app copy only and can fail when that generated
  copy drifts. Treat the failure as an ownership/sync issue, not a worker build
  failure.
- Shop-profile prompt preview is not production prompt injection yet. Verify an
  actual non-empty `profileBlock` call path before documenting it as live.
- `app/routes/app.tsx` affects every embedded page.
- Legacy manage-translation pages and v4 job pages are separate experiences.

## Short Locator Flow

1. `git status --short`
2. Read the matching section in this file.
3. `rg -n "<keyword>" app worker extensions scripts prisma`
4. Read route entry, server helper, worker/extension caller, and data model.
5. Apply the smallest patch.
6. Run the validation command that matches the change.
7. Final response should include changed files, validation result, and residual risk.
