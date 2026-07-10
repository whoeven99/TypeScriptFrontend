import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  upsertUserPicture,
  type UserPicturePayload,
} from "~/server/picture/picture.server";

/**
 * POST /api/picture/upsert
 * body: { shopName?, imageId, imageBeforeUrl, languageCode, imageAfterUrl?, altBeforeTranslation?, altAfterTranslation? }
 * 元数据 upsert（alt 保存等，不上传文件）。
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
    await upsertUserPicture({
      shop: shopName,
      imageId,
      imageBeforeUrl,
      languageCode,
      ...(typeof body.imageAfterUrl === "string"
        ? { imageAfterUrl: body.imageAfterUrl }
        : {}),
      ...(typeof body.altBeforeTranslation === "string"
        ? { altBeforeTranslation: body.altBeforeTranslation }
        : body.altBeforeTranslation === null
          ? { altBeforeTranslation: null }
          : {}),
      ...(typeof body.altAfterTranslation === "string"
        ? { altAfterTranslation: body.altAfterTranslation }
        : body.altAfterTranslation === null
          ? { altAfterTranslation: null }
          : {}),
    }),
  );
};
