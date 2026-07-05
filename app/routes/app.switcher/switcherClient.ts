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

/** 读配置：全量 v4，走 Turso。 */
export async function loadSwitcherConfigCompat(_args: {
  migrated?: boolean;
  shop: string;
  server?: string;
}): Promise<SwitcherApiResponse> {
  const res = await fetch("/api/translate-v4/switcher");
  return res.json();
}

/** 保存配置：全量 v4，写 Turso。 */
export async function saveSwitcherConfigCompat(args: {
  migrated?: boolean;
  shop?: string;
  server?: string;
  data: SwitcherEditData;
}): Promise<SwitcherApiResponse> {
  const res = await fetch("/api/translate-v4/switcher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args.data),
  });
  return res.json();
}
