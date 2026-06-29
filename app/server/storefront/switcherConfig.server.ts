import axios from "axios";
import prisma from "~/db.server";
import { routeStorefrontRead } from "./routing.server";
import { ok, fail, type BaseResponse } from "./response.server";

/** 对应 Java WidgetReturnVO + UserIPRedirectionDO 的 ipRedirections 字段 */
export type IpRedirectionItem = {
  id: number;
  shopName: string;
  region: string;
  languageCode: string;
  currencyCode: string;
};

export type WidgetConfigResponse = {
  shopName: string;
  languageSelector: boolean;
  currencySelector: boolean;
  ipOpen: boolean;
  includedFlag: boolean;
  fontColor: string;
  backgroundColor: string;
  buttonColor: string;
  buttonBackgroundColor: string;
  optionBorderColor: string;
  selectorPosition: string;
  positionData: string;
  isTransparent: boolean;
  ipRedirections: IpRedirectionItem[];
};

/**
 * 灰度入口：migratedToTsf 且命中 v4 allowlist 时从 Prisma 读，否则透明代理到 Java。
 * 对应 Java POST /widgetConfigurations/getData。
 */
export async function getSwitcherConfig(
  shop: string,
): Promise<BaseResponse<WidgetConfigResponse>> {
  return routeStorefrontRead(
    shop,
    () => readFromPrisma(shop),
    () => proxyToJava(shop),
  );
}

/** migratedToTsf + allowlist 路径：从 Prisma SwitcherConfiguration + IpRedirection 读取 */
async function readFromPrisma(
  shop: string,
): Promise<BaseResponse<WidgetConfigResponse>> {
  const config = await prisma.switcherConfiguration.findUnique({
    where: { shop },
  });

  // Java 侧：无配置行时返回 error（扩展用 initData 兜底）
  if (!config) {
    return fail(10001, "query error");
  }

  const redirections = await prisma.ipRedirection.findMany({
    where: { shop, isDeleted: false },
    orderBy: { id: "asc" },
    select: {
      id: true,
      region: true,
      languageCode: true,
      currencyCode: true,
    },
  });

  const ipRedirections: IpRedirectionItem[] = redirections.map((r) => ({
    id: r.id,
    shopName: shop,
    region: r.region,
    languageCode: r.languageCode,
    currencyCode: r.currencyCode,
  }));

  return ok<WidgetConfigResponse>({
    shopName: shop,
    languageSelector: config.languageSelector,
    currencySelector: config.currencySelector,
    ipOpen: config.ipOpen,
    includedFlag: config.includedFlag,
    fontColor: config.fontColor,
    backgroundColor: config.backgroundColor,
    buttonColor: config.buttonColor,
    buttonBackgroundColor: config.buttonBackgroundColor,
    optionBorderColor: config.optionBorderColor,
    selectorPosition: config.selectorPosition,
    positionData: config.positionData,
    isTransparent: config.isTransparent,
    ipRedirections,
  });
}

/** migratedToTsf=false：透明代理到 Java，保留 Java 代码 */
async function proxyToJava(
  shop: string,
): Promise<BaseResponse<WidgetConfigResponse>> {
  const base = process.env.SERVER_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    console.error("[storefront/switcherConfig] SERVER_URL not configured, cannot proxy to Java");
    return fail(10001, "upstream not available");
  }
  try {
    const res = await axios.post<BaseResponse<WidgetConfigResponse>>(
      `${base}/widgetConfigurations/getData`,
      { shopName: shop },
      { timeout: 10_000 },
    );
    return res.data;
  } catch (err) {
    console.error(`[storefront/switcherConfig] proxyToJava failed shop=${shop}:`, err);
    return fail(10001, "upstream error");
  }
}
