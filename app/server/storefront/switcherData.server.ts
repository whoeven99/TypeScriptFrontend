import prisma from "~/db.server";

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

export type SwitcherConfigWriteInput = {
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
};

/** Admin 页与 Java getData 失败时的默认配置（与 app.switcher initData 对齐）。 */
export const SWITCHER_UI_DEFAULTS: SwitcherConfigWriteInput = {
  includedFlag: true,
  languageSelector: true,
  currencySelector: true,
  ipOpen: false,
  fontColor: "#303030",
  backgroundColor: "#ffffff",
  buttonColor: "#ffffff",
  buttonBackgroundColor: "#f6f6f7",
  optionBorderColor: "#d4d4d8",
  selectorPosition: "bottom_left",
  positionData: "10",
  isTransparent: false,
};

function str(value: unknown, fallback: string): string {
  return value == null ? fallback : String(value);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeWriteInput(
  input: Partial<SwitcherConfigWriteInput>,
): SwitcherConfigWriteInput {
  return {
    languageSelector: bool(input.languageSelector, SWITCHER_UI_DEFAULTS.languageSelector),
    currencySelector: bool(input.currencySelector, SWITCHER_UI_DEFAULTS.currencySelector),
    ipOpen: bool(input.ipOpen, SWITCHER_UI_DEFAULTS.ipOpen),
    includedFlag: bool(input.includedFlag, SWITCHER_UI_DEFAULTS.includedFlag),
    fontColor: str(input.fontColor, SWITCHER_UI_DEFAULTS.fontColor),
    backgroundColor: str(input.backgroundColor, SWITCHER_UI_DEFAULTS.backgroundColor),
    buttonColor: str(input.buttonColor, SWITCHER_UI_DEFAULTS.buttonColor),
    buttonBackgroundColor: str(
      input.buttonBackgroundColor,
      SWITCHER_UI_DEFAULTS.buttonBackgroundColor,
    ),
    optionBorderColor: str(input.optionBorderColor, SWITCHER_UI_DEFAULTS.optionBorderColor),
    selectorPosition: str(input.selectorPosition, SWITCHER_UI_DEFAULTS.selectorPosition),
    positionData: str(input.positionData, SWITCHER_UI_DEFAULTS.positionData),
    isTransparent: bool(input.isTransparent, SWITCHER_UI_DEFAULTS.isTransparent),
  };
}

async function loadIpRedirections(shop: string): Promise<IpRedirectionItem[]> {
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

  return redirections.map((r) => ({
    id: r.id,
    shopName: shop,
    region: r.region,
    languageCode: r.languageCode,
    currencyCode: r.currencyCode,
  }));
}

function toWidgetConfigResponse(
  shop: string,
  config: {
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
  },
  ipRedirections: IpRedirectionItem[],
): WidgetConfigResponse {
  return {
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
  };
}

/** 从 Prisma 读取完整 Widget 配置；无记录时返回 null。 */
export async function readSwitcherConfigPayload(
  shop: string,
): Promise<WidgetConfigResponse | null> {
  const config = await prisma.switcherConfiguration.findUnique({
    where: { shop },
  });
  if (!config) return null;

  const ipRedirections = await loadIpRedirections(shop);
  return toWidgetConfigResponse(shop, config, ipRedirections);
}

/** 写入 Prisma SwitcherConfiguration 并返回完整 payload。 */
export async function upsertSwitcherConfig(
  shop: string,
  input: Partial<SwitcherConfigWriteInput>,
): Promise<WidgetConfigResponse> {
  const data = normalizeWriteInput(input);
  const now = new Date();

  const config = await prisma.switcherConfiguration.upsert({
    where: { shop },
    create: { shop, ...data, createdAt: now, updatedAt: now },
    update: { ...data, updatedAt: now },
  });

  const ipRedirections = await loadIpRedirections(shop);
  return toWidgetConfigResponse(shop, config, ipRedirections);
}
