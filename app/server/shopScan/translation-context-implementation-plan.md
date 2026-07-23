# Translation Context Implementation Plan

## Goal

Build a scan-driven translation context system so translation quality is guided by:

- shop profile
- terminology profile
- market profile
- theme scene profile
- module policy profile

The key principle is:

1. shop scan collects and structures context once
2. runtime translation only does lightweight scene resolution and prompt assembly
3. different modules and field scenes use different prompt profiles instead of one generic prompt

## Current State

- `ShopProfile` already stores a small stable subset of shop context:
  - `industry`
  - `keywords`
  - `description`
  - `brandTone`
- shop scan already collects:
  - shop facts
  - markets
  - theme text samples
  - weighted signals
  - AI understanding
  - terminology strategy
  - glossary suggestions
- translation-core already supports:
  - field structure classification: `plain | html | json | list | handle`
  - system prompt construction
  - glossary injection
  - per-field engine routing
- missing pieces:
  - live translation does not yet inject shop profile context
  - no runtime scene resolver for theme/module/field intent
  - no theme-key intelligence artifact
  - no prompt profile routing
  - no cache isolation by prompt profile / context hash

## Target Architecture

### Scan-time artifacts

Generate and persist the following profiles during shop scan:

1. `shopContext`
2. `terminologyProfile`
3. `marketProfile`
4. `themeSceneProfile`
5. `modulePolicyProfile`

### Runtime translation flow

1. load latest translation context profile for the shop
2. resolve current field scene from module + key + content class + optional namespace hints
3. choose `promptProfileId`
4. assemble prompt blocks
5. pass prompt context into translation-core
6. isolate cache by prompt profile and context hash

## Profile Definitions

### 1. Shop Context

Purpose: define what kind of shop this is and how copy should generally sound.

Fields:

- `industry`
- `subIndustry`
- `brandTone`
- `brandPositioning`
- `description`
- `keywords`
- `sellingPoints`
- `priceRange`

Primary usage:

- global tone guidance
- industry-aware wording
- marketing copy alignment

### 2. Terminology Profile

Purpose: keep key wording stable across jobs and modules.

Fields:

- `brandTerms`
- `doNotTranslateTerms`
- `preferredTerms`
- `seoTerms`
- `glossarySuggestions`

Primary usage:

- preserve brand names and product lines
- stabilize preferred translations
- strengthen SEO-specific copy

### 3. Market Profile

Purpose: localize by target market rather than only translating by target language.

Fields:

- `markets`
- `publishedLocales`
- `marketNotes`
- `currencyContext`

Primary usage:

- target-market phrasing
- market-aware SEO and hero copy
- localization bias for supported locales

### 4. Theme Scene Profile

Purpose: infer theme copy intent from theme keys and namespaces.

Fields:

- `sceneStats`
- `roleStats`
- `sceneHints`
- `appNamespaces`
- `highConfidencePatterns`

Primary usage:

- distinguish hero/banner/navigation/footer/app/config-like theme content
- drive scene-specific prompt profiles

### 5. Module Policy Profile

Purpose: control module-level translation behavior.

Fields:

- `moduleHints[]`
  - `module`
  - `tonePolicy`
  - `keywordPolicy`
  - `literalVsAdaptive`

Primary usage:

- different treatment for catalog, SEO, theme, navigation, JSON-like content

## Prompt System Design

### Prompt block order

1. base translation rules
2. shop context block
3. terminology policy block
4. market context block
5. scene policy block
6. module policy block
7. field policy block

### Prompt profiles

Create the following runtime prompt profiles:

- `catalog_v1`
- `seo_v1`
- `navigation_v1`
- `hero_v1`
- `theme_ui_v1`
- `editorial_v1`
- `structured_content_json_v1`
- `config_json_v1`
- `transactional_v1`
- `slug_v1`

### Scene examples

- `marketing_hero`
- `navigation_ui`
- `announcement_bar`
- `footer_info`
- `product_supporting_copy`
- `editorial_copy`
- `theme_setting_copy`
- `app_embedded_copy`
- `config_like`

### Role examples

- `heading`
- `subheading`
- `title`
- `description`
- `caption`
- `button_label`
- `menu_label`
- `label`
- `placeholder`
- `body`

## Theme Key Intelligence Design

Theme keys should not be injected raw into prompts.

Instead:

1. parse keys during shop scan
2. map them to scene / role / tone hints
3. store structured results in the scan artifact
4. inject only the resolved scene policy during translation

### Initial rule patterns

- `hero|banner|slideshow|featured` -> `marketing_hero`
- `announcement` -> `announcement_bar`
- `menu|nav|header` -> `navigation_ui`
- `footer|newsletter` -> `footer_info`
- `button_label|cta` -> role `button_label`
- `heading|title` -> role `heading` or `title`
- `subheading|subtitle|tagline|slogan` -> role `subheading`
- `label|placeholder|hint|help` -> `theme_setting_copy`
- `pagefly|gempage|loox|judge|bundle|popup` -> `app_embedded_copy`
- config-like namespaces or keys -> `config_like`

### Theme key implementation principle

- rules first
- AI summarization second
- never rely on raw key strings as the final prompt input

## JSON Strategy Design

Not all JSON should share the same prompt profile.

Split into:

1. `structured_content_json`
2. `config_json`

### structured_content_json

Examples:

- review bodies
- photo gallery copy
- rich text blocks
- app content slots

Behavior:

- natural translation allowed
- still preserve structure strictly

### config_json

Examples:

- app config values
- style/config parameters
- schema-like data
- mixed content where only a few user-facing leaves should translate

Behavior:

- highly conservative
- no semantic expansion
- no rewriting
- translate only approved user-facing slots

## Runtime Input Contract

Introduce a single prompt context object for translation-core:

```ts
type TranslationPromptContext = {
  promptProfileId: string;
  scene: string | null;
  role: string | null;
  shopContext?: unknown;
  terminology?: unknown;
  market?: unknown;
  modulePolicy?: unknown;
  fieldPolicy?: {
    module: string;
    key: string;
    contentClass: "plain" | "html" | "json" | "list" | "handle";
    jsonMode?: "structured_content_json" | "config_json" | null;
  };
  contextHash: string;
};
```

## Implementation Phases

### Phase 1: Scan artifact foundation

Goal:

- make scan output suitable for runtime consumption

Tasks:

1. add theme key parsing helpers under `worker/src/services/shopScan/`
2. generate `themeSceneProfile`
3. generate runtime-friendly translation context summary artifact
4. extend artifact reader on app side

Deliverables:

- `theme-key-profile.json`
- `translation-context-profile.json`
- normalized artifact loader types

Validation:

- shop profile page or debug loader can read new artifacts
- no existing scan stage regression

### Phase 2: Runtime scene resolver

Goal:

- identify translation scene before prompt assembly

Tasks:

1. add `resolveTranslationScene()` in translation-core or a closely related layer
2. map module + key + field class + namespace to `scene`, `role`, `promptProfileId`
3. split JSON handling into `structured_content_json` vs `config_json`

Deliverables:

- reusable scene resolver
- testable scene mapping rules

Validation:

- fixture coverage for theme keys, SEO keys, navigation keys, JSON keys

### Phase 3: Prompt context assembly

Goal:

- assemble structured prompt blocks for live translation

Tasks:

1. add prompt context builder
2. add prompt block builder
3. wire shop context into translation-core
4. wire prompt profiles into single-field and batch translation paths

Deliverables:

- prompt profile system
- prompt context injection in translation-core

Validation:

- single translate path works
- batch translate path works
- prompt output is stable and bounded

### Phase 4: Cache isolation

Goal:

- prevent different prompt profiles and shop contexts from polluting TM reuse

Tasks:

1. extend cache key dimensions with `promptProfileId`
2. add `contextHash`
3. verify reuse remains effective without cross-scene contamination

Deliverables:

- updated TM cache strategy

Validation:

- same source text under different prompt profiles does not incorrectly reuse the same cached value

### Phase 5: Quality tuning

Goal:

- tune rules and scene mapping based on real stores

Tasks:

1. review real scan artifacts
2. refine theme key rules
3. tighten config-json detection
4. promote high-confidence terminology into stronger runtime constraints

Deliverables:

- updated rules
- improved prompt profile boundaries

Validation:

- compare translations across representative modules and stores

## Proposed File-Level Changes

### Shop scan

- `worker/src/services/shopScan/stageProfile.ts`
  - extend profile stage outputs
- `worker/src/services/shopScan/translationSamples.ts`
  - reuse theme key metadata already collected
- new files likely under `worker/src/services/shopScan/`
  - `themeKeyIntelligence.ts`
  - `translationContextProfile.ts`

### App-side artifact loading

- `app/server/shopScan/artifacts.server.ts`
  - load and normalize new artifacts
- `app/routes/app.shop-profile/route.tsx`
  - optional preview/debug surface for new context profiles

### Translation runtime

- `packages/translation-core/src/llmTranslate.ts`
  - accept prompt context
  - choose prompt profile
  - inject prompt blocks
- `packages/translation-core/src/syncTranslate.ts`
  - pass prompt context for single translate
- possible new files:
  - `packages/translation-core/src/translationSceneResolver.ts`
  - `packages/translation-core/src/promptContextBuilder.ts`
  - `packages/translation-core/src/promptProfiles.ts`

### App + worker callers

- `app/server/translateV4/singleTranslate.server.ts`
- `worker/src/workers/translateWorker.ts`

## Open Questions To Resolve During Implementation

1. should translation context summary live only in Blob first, or partially in Prisma later?
2. should `moduleHints` stay AI-only, or should some modules gain deterministic rule-based overrides?
3. how much of market context should be target-locale-specific vs shop-global?
4. what is the minimum context hash granularity that avoids cache pollution without destroying reuse?
5. do we want the shop-profile page to preview scene routing decisions for sampled theme keys?

## Execution Order Recommendation

Recommended implementation order:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5

Do not start with cache changes first.
Do not start with AI-heavy theme-key interpretation first.
Get deterministic artifact shape and runtime scene routing stable before prompt tuning.

## Validation Checklist

- shop scan still completes successfully
- new scan artifacts are readable and normalized
- single translate path can consume prompt context
- batch translate path can consume prompt context
- theme hero/navigation/SEO/JSON samples route to different prompt profiles
- glossary and terminology rules still apply
- cache does not cross-contaminate between prompt profiles
- prompt size remains bounded

## First Implementation Slice

The best first slice is:

1. generate `themeSceneProfile`
2. generate `translation-context-profile.json`
3. add `resolveTranslationScene()`
4. implement `hero_v1`, `navigation_v1`, `seo_v1`, `catalog_v1`
5. inject `Shop Context Block` + `Scene Policy Block`

This slice is small enough to validate end to end and large enough to prove the architecture.
