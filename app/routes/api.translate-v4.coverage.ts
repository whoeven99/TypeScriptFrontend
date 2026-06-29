import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { isTranslateV4Enabled, isTranslateV4ShopAllowed } from "~/server/translateV4/feature.server";
import { computeCoverageSummary, getCoverageSummaryFromCache } from "~/server/translateV4/coverage.server";
import { selectShopTargetLocales } from "~/lib/shopTargetLocales";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!isTranslateV4Enabled()) {
    return json({ ok: false, error: "v4 disabled" }, { status: 403 });
  }

  const { admin, session } = await authenticate.admin(request);
  if (!isTranslateV4ShopAllowed(session.shop)) {
    return json({ ok: false, error: "shop not allowed" }, { status: 403 });
  }

  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  let targetLocales: Array<{ value: string; label: string }> = [];
  let primaryLocale = "en";
  try {
    const loaded = await loadShopLocalesForTranslation({
      shop: session.shop,
      accessToken: session.accessToken,
    });
    primaryLocale = loaded.primaryLocale;
    targetLocales = selectShopTargetLocales(loaded.localeOptions, primaryLocale);
  } catch (err) {
    console.error("[translateV4] coverage locales failed:", err);
    return json({ ok: false, error: "failed to load locales" }, { status: 500 });
  }

  try {
    const forceRefresh = url.searchParams.get("refresh") === "1";
    const localesToRefresh = url.searchParams
      .get("locales")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const summary = await computeCoverageSummary({
      admin,
      shop: shopName,
      primaryLocale,
      targetLocales,
      forceRefresh,
      localesToRefresh,
    });
    return json({ ok: true, summary });
  } catch (err) {
    console.error("[translateV4] coverage compute failed:", err);
    try {
      const summary = await getCoverageSummaryFromCache({
        shop: shopName,
        primaryLocale,
        targetLocales,
      });
      return json({ ok: true, summary, degraded: true });
    } catch (fallbackErr) {
      console.error("[translateV4] coverage cache fallback failed:", fallbackErr);
      return json({ ok: false, error: "coverage compute failed" }, { status: 500 });
    }
  }
};
