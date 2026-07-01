import { globalStore } from "~/globalStore";

/** v4 店铺 → translate-v4；v2 白名单 → translate。 */
export function getTranslatePagePath(): string {
  return globalStore.translateV4ExpressBeta
    ? "/app/translate-v4"
    : "/app/translate";
}
