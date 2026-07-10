import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  saveTranslatedImageFromUrl,
  type UserPicturePayload,
} from "~/server/picture/picture.server";

/**
 * POST /api/picture/save-from-url
 * body: { shopName?, imageUrl, userPicture: { imageId, imageBeforeUrl, languageCode, ... } }
 * 对齐 Spring /picture/saveImageToCloud。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const shopName =
    typeof body.shopName === "string" && body.shopName.trim()
      ? body.shopName.trim()
      : session.shop;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
  const userPicture = (body.userPicture ?? body.userPicturesDoJson ?? {}) as Record<
    string,
    unknown
  >;

  if (shopName !== session.shop) {
    return json({
      success: false,
      errorCode: 403,
      errorMsg: "forbidden",
      response: null as UserPicturePayload | null,
    });
  }

  const imageId = typeof userPicture.imageId === "string" ? userPicture.imageId : "";
  const imageBeforeUrl =
    typeof userPicture.imageBeforeUrl === "string"
      ? userPicture.imageBeforeUrl
      : "";
  const languageCode =
    typeof userPicture.languageCode === "string" ? userPicture.languageCode : "";

  if (!imageUrl || !imageId || !imageBeforeUrl || !languageCode) {
    return json({
      success: false,
      errorCode: 400,
      errorMsg: "imageUrl and userPicture fields required",
      response: null as UserPicturePayload | null,
    });
  }

  return json(
    await saveTranslatedImageFromUrl({
      shop: shopName,
      imageUrl,
      userPicture: {
        imageId,
        imageBeforeUrl,
        languageCode,
        altBeforeTranslation:
          typeof userPicture.altBeforeTranslation === "string"
            ? userPicture.altBeforeTranslation
            : "",
        altAfterTranslation:
          typeof userPicture.altAfterTranslation === "string"
            ? userPicture.altAfterTranslation
            : "",
      },
    }),
  );
};
