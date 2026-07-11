import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  getProductPictures,
  type UserPicturePayload,
} from "~/server/picture/picture.server";

/**
 * POST /api/picture/product
 * body: { shopName?, productId (imageId/Product GID), languageCode }
 * Admin 嵌入页读产品图译（Turso）。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const shopName =
    typeof body.shopName === "string" && body.shopName.trim()
      ? body.shopName.trim()
      : session.shop;
  const productId =
    typeof body.productId === "string"
      ? body.productId
      : typeof body.imageId === "string"
        ? body.imageId
        : "";
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
  if (!productId || !languageCode) {
    return json({
      success: false,
      errorCode: 400,
      errorMsg: "productId and languageCode required",
      response: [] as UserPicturePayload[],
    });
  }

  return json(
    await getProductPictures({
      shop: shopName,
      imageId: productId,
      languageCode,
    }),
  );
};
