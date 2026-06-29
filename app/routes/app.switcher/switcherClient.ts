import { SaveAndUpdateData, WidgetConfigurations } from "~/api/JavaServer";
import {
  buildSwitcherEditDefaults,
  type SwitcherEditData,
} from "~/lib/switcherConstants";

export type { SwitcherEditData } from "~/lib/switcherConstants";
export { buildSwitcherEditDefaults };

type SwitcherApiResponse = {
  success: boolean;
  errorCode?: number | null;
  errorMsg?: string | null;
  response?: SwitcherEditData;
};

/** 读配置：灰度 eligible 店走 Turso，否则走 Java。 */
export async function loadSwitcherConfigCompat(args: {
  migrated: boolean;
  shop: string;
  server: string;
}): Promise<SwitcherApiResponse> {
  if (args.migrated) {
    const res = await fetch("/api/translate-v4/switcher");
    return res.json();
  }

  return WidgetConfigurations({
    shop: args.shop,
    server: args.server,
  });
}

/** 保存配置：灰度 eligible 店写 Turso，否则写 Java。 */
export async function saveSwitcherConfigCompat(args: {
  migrated: boolean;
  shop: string;
  server: string;
  data: SwitcherEditData;
}): Promise<SwitcherApiResponse> {
  if (args.migrated) {
    const res = await fetch("/api/translate-v4/switcher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.data),
    });
    return res.json();
  }

  return SaveAndUpdateData({
    ...args.data,
    server: args.server,
  });
}
