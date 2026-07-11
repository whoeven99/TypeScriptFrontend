import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { translateProductImage } from "~/server/picture/translateImage.server";

/**
 * POST /api/translate-v4/image
 * body: { imageUrl, sourceCode, targetCode, imageId? }
 * 对齐 Spring PUT /translate/imageTranslate；成功扣 1000 credits。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
  const sourceCode =
    typeof body.sourceCode === "string"
      ? body.sourceCode
      : typeof body.sourceLanguage === "string"
        ? body.sourceLanguage
        : "";
  const targetCode =
    typeof body.targetCode === "string"
      ? body.targetCode
      : typeof body.targetLanguage === "string"
        ? body.targetLanguage
        : "";

  const result = await translateProductImage({
    shop,
    imageUrl,
    sourceCode,
    targetCode,
  });

  return json(result, {
    status: result.success ? 200 : result.errorCode === 403 ? 403 : 200,
  });
};
