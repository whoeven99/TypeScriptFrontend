export type ExpandMarketRegion = {
  code: string;
  name: string;
};

export type ExpandMarketCard = {
  id: string;
  name: string;
  handle: string | null;
  primary: boolean;
  currencyCode: string | null;
  regions: ExpandMarketRegion[];
  webPresenceId: string | null;
  domainHost: string | null;
  defaultLocale: string | null;
  alternateLocales: string[];
};

export type LocaleShopState = {
  locale: string;
  label: string;
  published: boolean;
  primary: boolean;
};

export type MarketLocaleReadiness = {
  locale: string;
  shopEnabled: boolean;
  shopPublished: boolean;
  onMarketWebPresence: boolean;
  readyForStorefront: boolean;
};

export type StarterProduct = {
  id: string;
  title: string;
  handle: string;
  onlineStorePreviewUrl: string | null;
  onlineStoreUrl: string | null;
  imageUrl: string | null;
};

export type CreditPackOffer = {
  planKey: string;
  packName: string;
  credits: number;
  priceAmount: number;
  comparedPrice: number;
  currencyCode: string;
};

export type StarterPackEstimate = {
  /** 将翻译的商品数（全部商品）；与 productCount 一致。 */
  n: number;
  productCount: number;
  /** 店面验收预览样本（最多约 20），不是翻译上限。 */
  products: StarterProduct[];
  /** 店面首页 URL（primaryDomain 或 shop 回退），用于订后验收。 */
  storefrontHomeUrl: string | null;
  /** 全部 PRODUCT 粗估额度（起步包）。 */
  estimatedCredits: number;
  /** 同 estimatedCredits，兼容旧字段。 */
  fullCatalogEstimatedCredits: number | null;
  /** 全店所有模块粗估额度（订后建仓）。 */
  fullStoreEstimatedCredits: number | null;
  usedShopScan: boolean;
  scanProductChars: number | null;
  remainingCredits: number;
  needsPurchase: boolean;
  recommendedPack: CreditPackOffer | null;
  recommendedFullStorePack: CreditPackOffer | null;
  packs: CreditPackOffer[];
};

/** 新手引导：按店体量推荐的现有月付订阅档。 */
export type RecommendedSubscriptionOffer = {
  planKey: string;
  title: string;
  monthlyPrice: number;
  creditsPerMonth: number;
  currencyCode: string;
};

/**
 * 起步包完成后的升级报价。
 * - 未订阅：推荐月付（自动译新商品）
 * - 已订阅：推荐全店多模块建仓加量包
 */
export type OnboardingUpgradeOffer = {
  productCount: number;
  productCredits: number;
  fullStoreCredits: number;
  usedShopScan: boolean;
  recommendedSubscription: RecommendedSubscriptionOffer;
  packs: CreditPackOffer[];
  recommendedFullStorePack: CreditPackOffer | null;
};

/** 匹配能覆盖所需额度的最小加量包。 */
export function matchPackForCredits(
  packs: CreditPackOffer[],
  creditsNeeded: number,
): CreditPackOffer | null {
  if (!(creditsNeeded > 0) || !packs.length) return null;
  const sorted = [...packs].sort((a, b) => a.credits - b.credits);
  return sorted.find((p) => p.credits >= creditsNeeded) ?? sorted[sorted.length - 1] ?? null;
}

export function formatExpandCredits(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/** 判断某语言是否已挂在市场的 web presence（default 或 alternate）。 */
export function localeOnMarketPresence(
  market: ExpandMarketCard,
  locale: string,
): boolean {
  if (!locale) return false;
  if (market.defaultLocale === locale) return true;
  return market.alternateLocales.includes(locale);
}

export function buildMarketLocaleReadiness(
  market: ExpandMarketCard,
  locale: string,
  shopLocales: LocaleShopState[],
): MarketLocaleReadiness {
  const shop = shopLocales.find((r) => r.locale === locale);
  const shopEnabled = Boolean(shop);
  const shopPublished = Boolean(shop?.published);
  const onMarketWebPresence = localeOnMarketPresence(market, locale);
  // 无 web presence 时无法挂语言，但仍可发布语言并翻译商品（店面靠 Switcher）。
  const readyForStorefront =
    shopPublished && (onMarketWebPresence || !market.webPresenceId);
  return {
    locale,
    shopEnabled,
    shopPublished,
    onMarketWebPresence,
    readyForStorefront,
  };
}

/** 市场卡片上展示的就绪语言（已在 shop 发布且挂在该市场）。 */
export function listReadyLocalesForMarket(
  market: ExpandMarketCard,
  shopLocales: LocaleShopState[],
): string[] {
  const published = new Set(
    shopLocales.filter((r) => r.published && !r.primary).map((r) => r.locale),
  );
  const onMarket = new Set(
    [market.defaultLocale, ...market.alternateLocales].filter(
      (l): l is string => Boolean(l),
    ),
  );
  return Array.from(published).filter((l) => onMarket.has(l));
}
