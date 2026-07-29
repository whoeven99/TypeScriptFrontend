#!/usr/bin/env node
/**
 * Public Shopify storefront multi-locale product field audit.
 *
 * Fetches storefront `/products.json` (optionally `/{locale}/products.json`),
 * writes a local tree mirroring v4 blob layout, and computes
 * "obviously untranslated" ratios vs primary locale.
 *
 * Output root (default):
 *   scripts/tmp/storefront-audit/{shopHost}/{runId}/
 *     meta.json
 *     locales.json
 *     init/PRODUCT/chunk-XXXXX.json
 *     scrape/{locale}/PRODUCT/resources/{base64url(resourceId)}.json
 *     diff/summary.json
 *     report.md
 *
 * Usage:
 *   node scripts/storefront-locale-audit.mjs --shop https://example.com --locales en,fr,de
 *   node scripts/storefront-locale-audit.mjs --shop example.myshopify.com --locales fr --primary en
 *   node scripts/storefront-locale-audit.mjs --out scripts/tmp/storefront-audit/... --diff-only
 *   node scripts/storefront-locale-audit.mjs --shop https://example.com --primary en \\
 *     --from-raw scripts/tmp/storefront-audit/_raw/example.com
 *
 * --from-raw dir expects files named `{locale}.json` (array or `{ products: [...] }`),
 * useful when products were fetched via Cursor browser (HTTP rate limits).
 */

import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_TMP = path.join(REPO_ROOT, "scripts", "tmp", "storefront-audit");

const PAGE_LIMIT = 250;
const MODULE = "PRODUCT";

const WEIGHTS = {
  title: 3,
  body_html: 5,
  option: 2,
  variant: 2,
  image_alt: 1,
};

function parseArgs(argv) {
  const out = {
    shop: "",
    locales: [],
    primary: "",
    outDir: "",
    cookie: "",
    delayMs: 200,
    maxPages: 0,
    diffOnly: false,
    fromRaw: "",
    runId: "",
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--shop":
        out.shop = String(next() || "").trim();
        break;
      case "--locales":
        out.locales = String(next() || "")
          .split(/[,|]/)
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--primary":
        out.primary = String(next() || "").trim();
        break;
      case "--out":
        out.outDir = String(next() || "").trim();
        break;
      case "--cookie":
        out.cookie = String(next() || "").trim();
        break;
      case "--delay-ms":
        out.delayMs = Math.max(0, Number(next()) || 0);
        break;
      case "--max-pages":
        out.maxPages = Math.max(0, Number(next()) || 0);
        break;
      case "--run-id":
        out.runId = String(next() || "").trim();
        break;
      case "--from-raw":
        out.fromRaw = String(next() || "").trim();
        break;
      case "--diff-only":
        out.diffOnly = true;
        break;
      case "-h":
      case "--help":
        out.help = true;
        break;
      default:
        if (a.startsWith("-")) {
          throw new Error(`Unknown flag: ${a}`);
        }
    }
  }
  return out;
}

function usage() {
  return `Usage:
  node scripts/storefront-locale-audit.mjs --shop <url|host> --locales <a,b,c> [options]
  node scripts/storefront-locale-audit.mjs --out <existing-run-dir> --diff-only

Options:
  --shop         Storefront origin or host (required unless --diff-only)
  --locales      Comma-separated locale codes to scrape (required unless --diff-only)
  --primary      Primary locale for diff baseline (default: first --locales)
  --out          Output directory (default: scripts/tmp/storefront-audit/{host}/{runId})
  --cookie       Optional Cookie header for authenticated/localized sessions
  --delay-ms     Delay between product.json pages (default 200)
  --max-pages    Cap pages per locale (0 = no cap)
  --run-id       Override run folder name
  --from-raw     Dir of {locale}.json product dumps (skip HTTP fetch)
  --diff-only    Only rebuild diff/summary.json + report.md from existing scrape/
`;
}

function loadProductsFromRawFile(filePath) {
  const data = readJson(filePath);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.result?.value?.products)) return data.result.value.products;
  if (Array.isArray(data?.value?.products)) return data.value.products;
  throw new Error(`Unrecognized products JSON shape: ${filePath}`);
}

function loadRawLocaleMap(fromRawDir) {
  const dir = path.resolve(fromRawDir);
  if (!existsSync(dir)) throw new Error(`--from-raw not found: ${dir}`);
  const map = new Map();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const locale = name.slice(0, -".json".length);
    map.set(locale, loadProductsFromRawFile(path.join(dir, name)));
  }
  if (!map.size) throw new Error(`No {locale}.json files in ${dir}`);
  return map;
}

/** Same algorithm as worker encodeResourceIdForBlob. */
function encodeResourceIdForBlob(resourceId) {
  return Buffer.from(String(resourceId), "utf8").toString("base64url");
}

function normalizeShopHost(input) {
  let s = String(input || "").trim();
  if (!s) throw new Error("--shop is required");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  return { origin: u.origin.replace(/\/$/, ""), host: u.host };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function productResourceId(product) {
  if (product?.admin_graphql_api_id) return String(product.admin_graphql_api_id);
  if (product?.id != null) return `gid://shopify/Product/${product.id}`;
  if (product?.handle) return `product/handle/${product.handle}`;
  throw new Error("Product missing id/handle");
}

function fieldValueToString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function productToFields(product) {
  const fields = [];
  const push = (key, value) => {
    fields.push({ key, value: fieldValueToString(value) });
  };

  push("title", product.title ?? "");
  push("body_html", product.body_html ?? "");
  push("vendor", product.vendor ?? "");
  push("product_type", product.product_type ?? "");
  push("tags", product.tags ?? "");
  push("handle", product.handle ?? "");
  push("template_suffix", product.template_suffix ?? "");

  const options = Array.isArray(product.options) ? product.options : [];
  options.forEach((opt, i) => {
    push(`options.${i}.name`, opt?.name ?? "");
    push(`options.${i}.values`, opt?.values ?? []);
  });

  const variants = Array.isArray(product.variants) ? product.variants : [];
  variants.forEach((v, i) => {
    push(`variants.${i}.title`, v?.title ?? "");
    push(`variants.${i}.option1`, v?.option1 ?? "");
    push(`variants.${i}.option2`, v?.option2 ?? "");
    push(`variants.${i}.option3`, v?.option3 ?? "");
    push(`variants.${i}.price`, v?.price ?? "");
    push(`variants.${i}.compare_at_price`, v?.compare_at_price ?? "");
    push(`variants.${i}.sku`, v?.sku ?? "");
    push(`variants.${i}.barcode`, v?.barcode ?? "");
  });

  const images = Array.isArray(product.images) ? product.images : [];
  images.forEach((img, i) => {
    push(`images.${i}.src`, img?.src ?? "");
    push(`images.${i}.alt`, img?.alt ?? "");
  });

  return fields;
}

function toResourceDoc(product, locale, source = "products.json") {
  const resourceId = productResourceId(product);
  return {
    resourceId,
    handle: product.handle ?? "",
    locale,
    source,
    productId: product.id ?? null,
    fields: productToFields(product),
  };
}

function normalizePlain(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHtml(html) {
  return normalizePlain(
    String(html ?? "")
      .replace(/&nbsp;/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function normalizeFieldValue(key, value) {
  if (key === "body_html" || key.endsWith(".body_html")) {
    return normalizeHtml(value);
  }
  const raw = String(value ?? "");
  // JSON-looking arrays (option values)
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      return normalizePlain(JSON.stringify(JSON.parse(raw)));
    } catch {
      /* fall through */
    }
  }
  return normalizePlain(raw);
}

function isPureNumberOrEmpty(value) {
  const n = normalizePlain(value);
  if (!n) return true;
  return /^-?\d+(\.\d+)?$/.test(n);
}

/**
 * Classify a field key for untranslated ratio.
 * @returns {"comparable"|"skip"|null} null = ignore entirely from stats
 */
function classifyFieldKey(key, primaryValue) {
  if (!key) return null;
  if (
    key === "handle" ||
    key === "vendor" ||
    key === "product_type" ||
    key === "tags" ||
    key === "template_suffix"
  ) {
    return "skip";
  }
  if (
    /\.(price|compare_at_price|sku|barcode)$/.test(key) ||
    key === "price" ||
    key.endsWith(".src")
  ) {
    return "skip";
  }

  if (key === "title" || key === "body_html") {
    return normalizeFieldValue(key, primaryValue) ? "comparable" : null;
  }
  if (/^options\.\d+\.(name|values)$/.test(key)) {
    return normalizeFieldValue(key, primaryValue) ? "comparable" : null;
  }
  if (/^variants\.\d+\.(title|option[123])$/.test(key)) {
    if (isPureNumberOrEmpty(primaryValue)) return "skip";
    return "comparable";
  }
  if (/^images\.\d+\.alt$/.test(key)) {
    return normalizeFieldValue(key, primaryValue) ? "comparable" : null;
  }
  return null;
}

function fieldWeight(key) {
  if (key === "body_html") return WEIGHTS.body_html;
  if (key === "title") return WEIGHTS.title;
  if (key.startsWith("options.")) return WEIGHTS.option;
  if (key.startsWith("variants.")) return WEIGHTS.variant;
  if (key.endsWith(".alt")) return WEIGHTS.image_alt;
  return 1;
}

function fieldsToMap(fields) {
  const map = new Map();
  for (const f of fields || []) {
    if (f?.key) map.set(f.key, f.value ?? "");
  }
  return map;
}

async function fetchProductsPage(origin, locale, page, cookie) {
  const candidates = [];
  if (locale) {
    candidates.push(`${origin}/${encodeURIComponent(locale)}/products.json?limit=${PAGE_LIMIT}&page=${page}`);
  }
  candidates.push(`${origin}/products.json?limit=${PAGE_LIMIT}&page=${page}`);

  let lastErr = null;
  for (const url of candidates) {
    try {
      const headers = {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; CiwiStorefrontAudit/1.0; +https://ciwi.ai)",
      };
      if (cookie) headers.Cookie = cookie;
      const res = await fetch(url, { headers, redirect: "follow" });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) {
        lastErr = new Error(`Non-JSON response for ${url} (${ct})`);
        continue;
      }
      const data = await res.json();
      const products = Array.isArray(data?.products) ? data.products : [];
      return { url, products };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Failed to fetch products.json");
}

async function fetchAllProducts(origin, locale, { cookie, delayMs, maxPages }) {
  const all = [];
  const pages = [];
  let page = 1;
  for (;;) {
    if (maxPages > 0 && page > maxPages) break;
    const { url, products } = await fetchProductsPage(origin, locale, page, cookie);
    pages.push({ page, url, count: products.length });
    if (!products.length) break;
    all.push(...products);
    if (products.length < PAGE_LIMIT) break;
    page += 1;
    if (delayMs > 0) await sleep(delayMs);
  }
  return { products: all, pages };
}

function writeInitChunks(outDir, products) {
  const initDir = path.join(outDir, "init", MODULE);
  ensureDir(initDir);
  const chunks = [];
  for (let i = 0; i < products.length; i += PAGE_LIMIT) {
    const slice = products.slice(i, i + PAGE_LIMIT);
    const idx = String(chunks.length).padStart(5, "0");
    const file = path.join(initDir, `chunk-${idx}.json`);
    writeJson(file, slice);
    chunks.push(`init/${MODULE}/chunk-${idx}.json`);
  }
  if (!chunks.length) {
    writeJson(path.join(initDir, "chunk-00000.json"), []);
    chunks.push(`init/${MODULE}/chunk-00000.json`);
  }
  return chunks;
}

function writeLocaleResources(outDir, locale, products, source = "products.json") {
  const resDir = path.join(outDir, "scrape", locale, MODULE, "resources");
  ensureDir(resDir);
  const written = [];
  for (const product of products) {
    const doc = toResourceDoc(product, locale, source);
    const fileName = `${encodeResourceIdForBlob(doc.resourceId)}.json`;
    const filePath = path.join(resDir, fileName);
    writeJson(filePath, doc);
    written.push(doc.resourceId);
  }
  return written;
}

function listLocaleDirs(outDir) {
  const scrapeRoot = path.join(outDir, "scrape");
  if (!existsSync(scrapeRoot)) return [];
  return readdirSync(scrapeRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function loadLocaleResources(outDir, locale) {
  const resDir = path.join(outDir, "scrape", locale, MODULE, "resources");
  if (!existsSync(resDir)) return new Map();
  const map = new Map();
  for (const name of readdirSync(resDir)) {
    if (!name.endsWith(".json")) continue;
    const doc = readJson(path.join(resDir, name));
    if (doc?.resourceId) map.set(doc.resourceId, doc);
  }
  return map;
}

/** Index by resourceId and handle for cross-market / cross-domain matching. */
function indexDocsForCompare(docsById) {
  const byId = docsById;
  const byHandle = new Map();
  for (const doc of docsById.values()) {
    const handle = String(doc.handle || "").trim().toLowerCase();
    if (handle) byHandle.set(handle, doc);
  }
  return { byId, byHandle };
}

function resolveTargetDoc(primary, targetIndex) {
  const byId = targetIndex.byId.get(primary.resourceId);
  if (byId) return { doc: byId, match: "resourceId" };
  const handle = String(primary.handle || "").trim().toLowerCase();
  if (handle && targetIndex.byHandle.has(handle)) {
    return { doc: targetIndex.byHandle.get(handle), match: "handle" };
  }
  return { doc: null, match: null };
}

function compareLocales(primaryDocs, targetDocs) {
  let comparableFields = 0;
  let identicalFields = 0;
  let changedFields = 0;
  let missingFields = 0;
  let skippedNonTranslatable = 0;
  let weightComparable = 0;
  let weightIdentical = 0;
  let productsTotal = 0;
  let productsFullyIdentical = 0;
  let productsMissing = 0;
  let matchedByHandle = 0;
  let matchedByResourceId = 0;

  const fieldSamples = [];
  const targetIndex = indexDocsForCompare(targetDocs);

  for (const [resourceId, primary] of primaryDocs) {
    productsTotal += 1;
    const resolved = resolveTargetDoc(primary, targetIndex);
    const target = resolved.doc;
    if (resolved.match === "handle") matchedByHandle += 1;
    if (resolved.match === "resourceId") matchedByResourceId += 1;
    if (!target) {
      productsMissing += 1;
      const pMap = fieldsToMap(primary.fields);
      for (const [key, pVal] of pMap) {
        const cls = classifyFieldKey(key, pVal);
        if (cls === "skip") {
          skippedNonTranslatable += 1;
          continue;
        }
        if (cls !== "comparable") continue;
        comparableFields += 1;
        missingFields += 1;
        const w = fieldWeight(key);
        weightComparable += w;
      }
      continue;
    }

    const pMap = fieldsToMap(primary.fields);
    const tMap = fieldsToMap(target.fields);
    let productComparable = 0;
    let productIdentical = 0;

    for (const [key, pVal] of pMap) {
      const cls = classifyFieldKey(key, pVal);
      if (cls === "skip") {
        skippedNonTranslatable += 1;
        continue;
      }
      if (cls !== "comparable") continue;

      comparableFields += 1;
      productComparable += 1;
      const w = fieldWeight(key);
      weightComparable += w;

      const tRaw = tMap.has(key) ? tMap.get(key) : "";
      const pNorm = normalizeFieldValue(key, pVal);
      const tNorm = normalizeFieldValue(key, tRaw);

      if (!tNorm) {
        missingFields += 1;
        continue;
      }
      if (pNorm === tNorm) {
        identicalFields += 1;
        productIdentical += 1;
        weightIdentical += w;
        if (fieldSamples.length < 20 && (key === "title" || key === "body_html")) {
          fieldSamples.push({
            resourceId,
            handle: primary.handle,
            key,
            status: "identical_to_primary",
            valuePreview: pNorm.slice(0, 120),
          });
        }
      } else {
        changedFields += 1;
        if (fieldSamples.length < 40 && (key === "title" || key === "body_html")) {
          fieldSamples.push({
            resourceId,
            handle: primary.handle,
            key,
            status: "changed",
            primaryPreview: pNorm.slice(0, 80),
            targetPreview: tNorm.slice(0, 80),
          });
        }
      }
    }

    if (productComparable > 0 && productIdentical === productComparable) {
      productsFullyIdentical += 1;
    }
  }

  const ratio = (num, den) => (den > 0 ? Number((num / den).toFixed(4)) : 0);

  return {
    comparableFields,
    identicalFields,
    changedFields,
    missingFields,
    skippedNonTranslatable,
    untranslatedRatio: ratio(identicalFields, comparableFields),
    missingRatio: ratio(missingFields, comparableFields),
    changedRatio: ratio(changedFields, comparableFields),
    untranslatedRatioWeighted: ratio(weightIdentical, weightComparable),
    productsTotal,
    productsFullyIdentical,
    productsMissingInTarget: productsMissing,
    matchedByResourceId,
    matchedByHandle,
    samples: fieldSamples.slice(0, 25),
  };
}

function buildDiffSummary(outDir, primaryLocale, locales) {
  const primaryDocs = loadLocaleResources(outDir, primaryLocale);
  const perLocale = {};
  for (const locale of locales) {
    if (locale === primaryLocale) {
      perLocale[locale] = {
        isPrimary: true,
        comparableFields: 0,
        identicalFields: 0,
        changedFields: 0,
        missingFields: 0,
        untranslatedRatio: 0,
        untranslatedRatioWeighted: 0,
        productsTotal: primaryDocs.size,
        productsFullyIdentical: 0,
      };
      continue;
    }
    const targetDocs = loadLocaleResources(outDir, locale);
    perLocale[locale] = compareLocales(primaryDocs, targetDocs);
  }
  return {
    primaryLocale,
    productCountPrimary: primaryDocs.size,
    locales,
    perLocale,
    notes: [
      "明显未翻译比例 = 与主语言规范化后完全相同的可比字段数 / 可比字段总数。",
      "启发式口径：品牌名、型号等故意保留的原文会抬高未翻译比例。",
      "这不是翻译质量分，只表示「相对主语言是否一字未改」。",
    ],
    generatedAt: new Date().toISOString(),
  };
}

function pct(ratio) {
  return `${((Number(ratio) || 0) * 100).toFixed(1)}%`;
}

function buildReportMd(meta, localesDoc, diff) {
  const lines = [];
  const primary = diff.primaryLocale;
  const targets = (diff.locales || []).filter((l) => l !== primary);

  lines.push(`# 店面多语言商品字段审计报告`);
  lines.push("");
  lines.push(`## 概览`);
  lines.push("");
  lines.push(`| 项 | 值 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| 店铺 | \`${meta.shopHost || meta.shop || ""}\` |`);
  lines.push(`| 站点 | \`${meta.origin || ""}\` |`);
  lines.push(`| 运行 ID | \`${meta.runId || ""}\` |`);
  lines.push(`| 主语言 | \`${primary}\` |`);
  lines.push(`| 对比语言 | ${targets.map((l) => `\`${l}\``).join(", ") || "-"} |`);
  lines.push(`| 主语言商品数 | ${diff.productCountPrimary} |`);
  lines.push(`| 生成时间 | ${diff.generatedAt} |`);
  lines.push(`| 本地路径 | \`${meta.outDir || ""}\` |`);
  lines.push(`| blobPrefix 等价 | \`${meta.blobPrefixEquivalent || `storefront-audit/${meta.shopHost}/${meta.runId}`}\` |`);
  lines.push("");

  lines.push(`## 语言发现`);
  lines.push("");
  if (localesDoc?.locales?.length) {
    for (const loc of localesDoc.locales) {
      const code = typeof loc === "string" ? loc : loc.code || loc.locale || "?";
      const evidence = typeof loc === "object" ? loc.evidence || loc.source || "" : "";
      const count = typeof loc === "object" ? loc.fetch?.productCount : null;
      const extra = [
        evidence || null,
        count != null ? `${count} 个商品` : null,
      ]
        .filter(Boolean)
        .join("；");
      lines.push(`- \`${code}\`${extra ? `：${extra}` : ""}`);
    }
  } else {
    lines.push(
      `- 来自参数 --locales：${(diff.locales || []).map((l) => `\`${l}\``).join(", ")}`,
    );
  }
  if (localesDoc?.switchMethod) {
    lines.push(`- 切换/采集方式：\`${localesDoc.switchMethod}\``);
  }
  lines.push("");

  lines.push(`## 明显未翻译比例`);
  lines.push("");
  lines.push(
    `| 语言 | 商品数 | 未翻译 | 未翻译(加权) | 已变化 | 缺失 | 整商品未译 |`,
  );
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: |`);
  for (const locale of diff.locales || []) {
    const s = diff.perLocale[locale];
    if (!s || s.isPrimary) {
      lines.push(
        `| \`${locale}\`（主语言） | ${diff.productCountPrimary} | - | - | - | - | - |`,
      );
      continue;
    }
    lines.push(
      `| \`${locale}\` | ${s.productsTotal} | ${pct(s.untranslatedRatio)} | ${pct(s.untranslatedRatioWeighted)} | ${pct(s.changedRatio)} | ${pct(s.missingRatio)} | ${s.productsFullyIdentical} |`,
    );
  }
  lines.push("");
  lines.push(
    `说明：未翻译 = 可比文本字段与主语言规范化后完全相同；加权版对 \`body_html\`(5)、\`title\`(3)、选项/变体文案(2)、图片 alt(1) 加权。`,
  );
  lines.push("");

  for (const locale of targets) {
    const s = diff.perLocale[locale];
    if (!s || s.isPrimary) continue;
    lines.push(`## 语言 \`${locale}\` 明细`);
    lines.push("");
    lines.push(`| 指标 | 数值 |`);
    lines.push(`| --- | ---: |`);
    lines.push(`| 可比字段数 | ${s.comparableFields ?? 0} |`);
    lines.push(`| 与主语言相同 | ${s.identicalFields ?? 0} |`);
    lines.push(`| 已变化 | ${s.changedFields ?? 0} |`);
    lines.push(`| 目标缺失 | ${s.missingFields ?? 0} |`);
    lines.push(`| 跳过(非译文字段) | ${s.skippedNonTranslatable ?? 0} |`);
    lines.push(`| 按 resourceId 匹配 | ${s.matchedByResourceId ?? 0} |`);
    lines.push(`| 按 handle 匹配 | ${s.matchedByHandle ?? 0} |`);
    lines.push(`| 目标侧缺失商品 | ${s.productsMissingInTarget ?? 0} |`);
    lines.push(`| 整商品字段全同 | ${s.productsFullyIdentical ?? 0} |`);
    lines.push("");

    const samples = Array.isArray(s.samples) ? s.samples : [];
    const changed = samples.filter((x) => x.status === "changed").slice(0, 8);
    const identical = samples
      .filter((x) => x.status === "identical_to_primary")
      .slice(0, 8);

    if (changed.length) {
      lines.push(`### 已变化样本`);
      lines.push("");
      lines.push(`| Handle | 字段 | 主语言预览 | 目标语言预览 |`);
      lines.push(`| --- | --- | --- | --- |`);
      for (const x of changed) {
        lines.push(
          `| \`${x.handle || ""}\` | \`${x.key}\` | ${String(x.primaryPreview || "").replace(/\|/g, "\\|")} | ${String(x.targetPreview || "").replace(/\|/g, "\\|")} |`,
        );
      }
      lines.push("");
    }

    if (identical.length) {
      lines.push(`### 仍与主语言相同的样本`);
      lines.push("");
      lines.push(`| Handle | 字段 | 内容预览 |`);
      lines.push(`| --- | --- | --- |`);
      for (const x of identical) {
        lines.push(
          `| \`${x.handle || ""}\` | \`${x.key}\` | ${String(x.valuePreview || "").replace(/\|/g, "\\|")} |`,
        );
      }
      lines.push("");
    }

    // 简短结论
    const untranslated = pct(s.untranslatedRatio);
    const fully = s.productsFullyIdentical ?? 0;
    const total = s.productsTotal ?? 0;
    lines.push(`### 小结`);
    lines.push("");
    lines.push(
      `- 相对主语言 \`${primary}\`，\`${locale}\` 可比字段中约 **${untranslated}** 仍完全相同（明显未翻译）。`,
    );
    lines.push(
      `- **${fully} / ${total}** 个商品的全部可比字段都未变化（整页未译强信号）。`,
    );
    if ((s.changedFields ?? 0) > 0) {
      lines.push(
        `- 另有约 **${pct(s.changedRatio)}** 字段已与主语言不同，可视为疑似已翻译或至少已改写。`,
      );
    }
    if ((s.productsMissingInTarget ?? 0) > 0) {
      lines.push(
        `- 有 **${s.productsMissingInTarget}** 个主语言商品在目标语言侧未匹配到（目录不一致或 ID/handle 对不上）。`,
      );
    }
    lines.push("");
  }

  lines.push(`## 口径说明`);
  lines.push("");
  for (const n of diff.notes || []) lines.push(`- ${n}`);
  lines.push(`- 可比字段默认包含：title、body_html、options 文案、非纯数字 variants 文案、非空 image.alt。`);
  lines.push(`- 不纳入主比例：price/sku/barcode/handle/vendor，以及 product_type、tags。`);
  lines.push("");

  lines.push(`## 产物目录`);
  lines.push("");
  lines.push("```");
  lines.push(`${meta.outDir || "."}/`);
  lines.push(`  meta.json`);
  lines.push(`  locales.json`);
  lines.push(`  init/PRODUCT/chunk-*.json`);
  lines.push(`  scrape/{locale}/PRODUCT/resources/{base64url(resourceId)}.json`);
  lines.push(`  diff/summary.json`);
  lines.push(`  report.md          # 本中文报告`);
  lines.push("```");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function fingerprintProducts(products) {
  const h = createHash("sha256");
  for (const p of products) {
    h.update(String(p.id ?? ""));
    h.update("|");
    h.update(String(p.title ?? ""));
    h.update("|");
  }
  return h.digest("hex").slice(0, 16);
}

async function runFetch(args) {
  const { origin, host } = normalizeShopHost(args.shop);

  /** @type {Map<string, any[]>} */
  let rawMap = null;
  if (args.fromRaw) {
    rawMap = loadRawLocaleMap(args.fromRaw);
  }

  const locales = args.locales.length
    ? [...args.locales]
    : rawMap
      ? [...rawMap.keys()]
      : [];
  if (!locales.length) throw new Error("--locales is required (or provide --from-raw)");

  const primary = args.primary || locales[0];
  if (!locales.includes(primary)) locales.unshift(primary);

  const runId =
    args.runId ||
    new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z") +
      "-" +
      randomUUID().slice(0, 8);
  const outDir = args.outDir
    ? path.resolve(args.outDir)
    : path.join(DEFAULT_TMP, host, runId);

  ensureDir(outDir);

  const localeFetchMeta = {};

  for (const locale of locales) {
    process.stderr.write(`[audit] loading locale=${locale} ...\n`);
    let products;
    let pages;
    if (rawMap) {
      if (!rawMap.has(locale)) {
        throw new Error(`--from-raw missing ${locale}.json`);
      }
      products = rawMap.get(locale);
      pages = [{ page: 1, url: `from-raw:${locale}.json`, count: products.length }];
    } else {
      const fetched = await fetchAllProducts(origin, locale, {
        cookie: args.cookie,
        delayMs: args.delayMs,
        maxPages: args.maxPages,
      });
      products = fetched.products;
      pages = fetched.pages;
    }
    localeFetchMeta[locale] = {
      productCount: products.length,
      pages,
      fingerprint: fingerprintProducts(products),
      source: rawMap ? "from-raw" : "http",
    };
    writeLocaleResources(outDir, locale, products);
    if (locale === primary) {
      writeInitChunks(outDir, products);
    }
  }

  const localesDoc = {
    shopHost: host,
    origin,
    primaryLocale: primary,
    locales: locales.map((code) => ({
      code,
      evidence: rawMap ? "from-raw + browser/cli" : "cli --locales",
      fetch: localeFetchMeta[code],
    })),
    switchMethod: rawMap
      ? "from-raw"
      : args.cookie
        ? "cookie+products.json"
        : "locale-prefix-or-root-products.json",
  };
  writeJson(path.join(outDir, "locales.json"), localesDoc);

  const meta = {
    shopHost: host,
    origin,
    shopInput: args.shop,
    runId,
    outDir,
    primaryLocale: primary,
    locales,
    blobPrefixEquivalent: `storefront-audit/${host}/${runId}`,
    switchMethod: localesDoc.switchMethod,
    createdAt: new Date().toISOString(),
    localeFetch: localeFetchMeta,
  };
  writeJson(path.join(outDir, "meta.json"), meta);

  const diff = buildDiffSummary(outDir, primary, locales);
  writeJson(path.join(outDir, "diff", "summary.json"), diff);
  writeFileSync(path.join(outDir, "report.md"), buildReportMd(meta, localesDoc, diff), "utf8");

  return { outDir, meta, diff };
}

function runDiffOnly(args) {
  const outDir = path.resolve(args.outDir || "");
  if (!outDir || !existsSync(outDir)) {
    throw new Error("--diff-only requires an existing --out directory");
  }
  const metaPath = path.join(outDir, "meta.json");
  const localesPath = path.join(outDir, "locales.json");
  const meta = existsSync(metaPath)
    ? readJson(metaPath)
    : { outDir, shopHost: path.basename(path.dirname(outDir)), runId: path.basename(outDir) };
  const localesDoc = existsSync(localesPath) ? readJson(localesPath) : { locales: [] };

  const localeCodes =
    (args.locales.length && args.locales) ||
    meta.locales ||
    listLocaleDirs(outDir);
  const primary =
    args.primary || meta.primaryLocale || localesDoc.primaryLocale || localeCodes[0];
  if (!primary) throw new Error("Cannot determine primaryLocale");

  const locales = [...new Set([primary, ...localeCodes])];
  const diff = buildDiffSummary(outDir, primary, locales);
  writeJson(path.join(outDir, "diff", "summary.json"), diff);

  meta.primaryLocale = primary;
  meta.locales = locales;
  meta.outDir = outDir;
  meta.diffRebuiltAt = new Date().toISOString();
  writeJson(metaPath, meta);

  writeFileSync(path.join(outDir, "report.md"), buildReportMd(meta, localesDoc, diff), "utf8");
  return { outDir, meta, diff };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const result = args.diffOnly ? runDiffOnly(args) : await runFetch(args);

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        outDir: result.outDir,
        blobPrefixEquivalent: result.meta.blobPrefixEquivalent || result.meta.outDir,
        primaryLocale: result.diff.primaryLocale,
        locales: result.diff.locales,
        productCountPrimary: result.diff.productCountPrimary,
        perLocale: Object.fromEntries(
          Object.entries(result.diff.perLocale).map(([k, v]) => [
            k,
            v.isPrimary
              ? { isPrimary: true, productsTotal: v.productsTotal }
              : {
                  untranslatedRatio: v.untranslatedRatio,
                  untranslatedRatioWeighted: v.untranslatedRatioWeighted,
                  changedRatio: v.changedRatio,
                  productsFullyIdentical: v.productsFullyIdentical,
                  productsTotal: v.productsTotal,
                },
          ]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((err) => {
    process.stderr.write(`${err?.stack || err}\n`);
    process.exitCode = 1;
  });
}
