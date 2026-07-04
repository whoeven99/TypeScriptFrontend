import { appendCommonEventLog, COMMON_EVENT_TYPE } from "~/server/commonEventLog/commonEventLog.server";

export type OnAppInstalledParams = {
  shop: string;
  sessionId: string;
  installedAt: Date;
};

export async function onAppInstalled(params: OnAppInstalledParams): Promise<void> {
  await appendCommonEventLog({
    shop: params.shop,
    eventType: COMMON_EVENT_TYPE.APP_INSTALLED,
    referenceId: params.sessionId,
    metadata: {
      installedAt: params.installedAt.toISOString(),
    },
  });
}

export type OnAppUninstalledParams = {
  shop: string;
  topic?: string;
};

export async function onAppUninstalled(
  params: OnAppUninstalledParams,
): Promise<void> {
  await appendCommonEventLog({
    shop: params.shop,
    eventType: COMMON_EVENT_TYPE.APP_UNINSTALLED,
    topic: params.topic,
  });
}
