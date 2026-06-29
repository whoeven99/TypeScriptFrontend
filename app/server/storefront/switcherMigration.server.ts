import prisma from "~/db.server";
import { WidgetConfigurations } from "~/api/JavaServer";
import { upsertSwitcherConfig } from "./switcherData.server";

type JavaIpRedirection = {
  id?: number;
  shopName?: string;
  region?: string;
  languageCode?: string;
  currencyCode?: string;
  isDeleted?: boolean;
};

type JavaWidgetResponse = {
  shopName?: string;
  languageSelector?: boolean;
  currencySelector?: boolean;
  ipOpen?: boolean;
  includedFlag?: boolean;
  fontColor?: string;
  backgroundColor?: string;
  buttonColor?: string;
  buttonBackgroundColor?: string;
  optionBorderColor?: string;
  selectorPosition?: string;
  positionData?: string | number;
  isTransparent?: boolean;
  ipRedirections?: JavaIpRedirection[];
};

export type SwitcherSyncResult = {
  shop: string;
  switcherSynced: boolean;
  ipRedirectionCount: number;
};

function str(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * 从 Java `POST /widgetConfigurations/getData` 拉取本店 Widget 配置 + IP 重定向，
 * 写入 Prisma `SwitcherConfiguration` + `IpRedirection`（保留 Java id）。
 *
 * 可单独调用，不依赖 `migratedToTsf`；幂等：同店重复执行会覆盖。
 */
export async function syncSwitcherFromJava(
  shop: string,
  server: string,
): Promise<SwitcherSyncResult> {
  const res = await WidgetConfigurations({ shop, server });
  if (!res?.success || !res.response) {
    throw new Error(
      `Java widgetConfigurations/getData 失败: ${res?.errorMsg ?? "无 response"}`,
    );
  }

  const data = res.response as JavaWidgetResponse;
  const now = new Date();

  await upsertSwitcherConfig(shop, {
    languageSelector: bool(data.languageSelector, true),
    currencySelector: bool(data.currencySelector, true),
    ipOpen: bool(data.ipOpen, false),
    includedFlag: bool(data.includedFlag, true),
    fontColor: str(data.fontColor, "#000000"),
    backgroundColor: str(data.backgroundColor, "#ffffff"),
    buttonColor: str(data.buttonColor, "#ffffff"),
    buttonBackgroundColor: str(data.buttonBackgroundColor, "#000000"),
    optionBorderColor: str(data.optionBorderColor, "#ccc"),
    selectorPosition: str(data.selectorPosition, "bottom_left"),
    positionData: str(data.positionData, "10"),
    isTransparent: bool(data.isTransparent, false),
  });

  const redirections = (data.ipRedirections ?? []).filter(
    (row) => row?.id != null && !row.isDeleted,
  );

  await prisma.$transaction([
    prisma.ipRedirection.deleteMany({ where: { shop } }),
    ...(redirections.length
      ? [
          prisma.ipRedirection.createMany({
            data: redirections.map((row) => ({
              id: Number(row.id),
              shop,
              region: str(row.region),
              languageCode: str(row.languageCode),
              currencyCode: str(row.currencyCode),
              isDeleted: false,
              createdAt: now,
              updatedAt: now,
            })),
          }),
        ]
      : []),
  ]);

  return {
    shop,
    switcherSynced: true,
    ipRedirectionCount: redirections.length,
  };
}
