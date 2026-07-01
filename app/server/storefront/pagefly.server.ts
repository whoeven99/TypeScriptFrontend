import { ok, type BaseResponse } from "./response.server";
import {
  listPageFlyTranslations,
  type PageFlyTranslationVO,
} from "~/server/translateV4/pageflyTranslation.server";

export type { PageFlyTranslationVO };

/** PageFly 译文读取：全量 v4，从 Prisma 读取。 */
export async function readPageFlyTranslations(
  shop: string,
  languageCode: string,
): Promise<BaseResponse<PageFlyTranslationVO[]>> {
  return ok(await listPageFlyTranslations(shop, languageCode));
}
