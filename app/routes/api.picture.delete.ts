import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  softDeleteUserPicture,
  type UserPicturePayload,
} from "~/server/picture/picture.server";

/**
 * POST /api/picture/delete
 * body: { shopName?, imageId, imageBeforeUrl, languageCode }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const shopName =
    typeof body.shopName === "string" && body.shopName.trim()
      ? body.shopName.trim()
      : session.shop;
  const imageId = typeof body.imageId === "string" ? body.imageId : "";
  const imageBeforeUrl =
    typeof body.imageBeforeUrl === "string" ? body.imageBeforeUrl : "";
  const languageCode =
    typeof body.languageCode === "string" ? body.languageCode : "";

  if (shopName !== session.shop) {
    return json({
      success: false,
      errorCode: 403,
      errorMsg: "forbidden",
      response: null as UserPicturePayload | null,
    });
  }
  if (!imageId || !imageBeforeUrl || !languageCode) {
    return json({
      success: false,
      errorCode: 400,
      errorMsg: "imageId, imageBeforeUrl, languageCode required",
      response: null as UserPicturePayload | null,
    });
  }

  return json(
    await softDeleteUserPicture({
      shop: shopName,
      imageId,
      imageBeforeUrl,
      languageCode,
    }),
  );
};
