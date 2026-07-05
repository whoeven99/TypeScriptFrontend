import { ok, fail, type BaseResponse } from "./response.server";
import {
  readSwitcherConfigPayload,
  type WidgetConfigResponse,
} from "./switcherData.server";

/** Widget 配置读取：全量 v4，从 Prisma 读取。 */
export async function getSwitcherConfig(
  shop: string,
): Promise<BaseResponse<WidgetConfigResponse>> {
  const payload = await readSwitcherConfigPayload(shop);
  if (!payload) {
    return fail(10001, "query error");
  }
  return ok(payload);
}
