import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  getShopPictures,
  type UserPicturePayload,
} from "~/server/picture/picture.server";

/**
 * POST /api/picture/shop
 * body: { shopName?, languageCode }
 * Admin 读店铺级图译（Turso）。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const shopName =
    typeof body.shopName === "string" && body.shopName.trim()
      ? body.shopName.trim()
      : session.shop;
  const languageCode =
    typeof body.languageCode === "string" ? body.languageCode : "";

  if (shopName !== session.shop) {
    return json({
      success: false,
      errorCode: 403,
      errorMsg: "forbidden",
      response: [] as UserPicturePayload[],
    });
  }
  if (!languageCode) {
    return json({
      success: false,
      errorCode: 400,
      errorMsg: "languageCode required",
      response: [] as UserPicturePayload[],
    });
  }

  return json(
    await getShopPictures({
      shop: shopName,
      languageCode,
    }),
  );
};
