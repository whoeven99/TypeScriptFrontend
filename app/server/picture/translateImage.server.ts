import { getNormalizedQuotaRemaining } from "~/lib/translationQuota";
import {
  deductShopCredits,
  getShopCreditQuota,
} from "~/server/billing/quota/quotaRouter.server";
import { aidgeStandPictureTranslate } from "./aidge.server";

/** 对齐 Spring TranslateConstants.PIC_FEE */
export const IMAGE_TRANSLATE_CREDITS = 1000;

const AIDGE_IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "bmp", "webp"]);

export type PictureBaseResponse<T = unknown> = {
  success: boolean;
  errorCode: number | null;
  errorMsg: string | null;
  response: T;
};

function ok(response: string): PictureBaseResponse<string> {
  return { success: true, errorCode: 0, errorMsg: "", response };
}

function fail(
  errorMsg: string,
  errorCode = 10001,
): PictureBaseResponse<null> {
  return { success: false, errorCode, errorMsg, response: null };
}

function extensionFromUrl(imageUrl: string): string | null {
  try {
    const path = new URL(imageUrl).pathname;
    const clean = path.split("?")[0] ?? path;
    const dot = clean.lastIndexOf(".");
    if (dot < 0 || dot >= clean.length - 1) return null;
    return clean.slice(dot + 1).toLowerCase();
  } catch {
    return null;
  }
}

/**
 * 图译编排：预检额度 → Aidge → 成功后扣 1000 credits。
 * 失败不扣（修 Spring 无论成败都扣的问题）。
 */
export async function translateProductImage(args: {
  shop: string;
  imageUrl: string;
  sourceCode: string;
  targetCode: string;
}): Promise<PictureBaseResponse<string | null>> {
  const sourceCode = args.sourceCode.trim();
  const targetCode = args.targetCode.trim();
  const imageUrl = args.imageUrl.trim();

  if (!imageUrl || !sourceCode || !targetCode) {
    return fail("imageUrl, sourceCode, targetCode required", 400);
  }

  const ext = extensionFromUrl(imageUrl);
  if (ext && !AIDGE_IMAGE_EXTS.has(ext)) {
    return fail("Image format error", 400);
  }

  const quota = await getShopCreditQuota(args.shop);
  const remaining = getNormalizedQuotaRemaining(quota);
  if (remaining == null) {
    return fail("quota unavailable", 503);
  }
  if (remaining < IMAGE_TRANSLATE_CREDITS) {
    return fail("insufficient credits", 403);
  }

  let translatedUrl: string | null;
  try {
    translatedUrl = await aidgeStandPictureTranslate({
      imageUrl,
      sourceLanguage: sourceCode,
      targetLanguage: targetCode,
    });
  } catch (err) {
    console.error(`[picture.translate] aidge failed shop=${args.shop}:`, err);
    return fail("SERVER_ERROR");
  }

  if (!translatedUrl) {
    return fail("TRANSLATE_ERROR", 10008);
  }

  try {
    await deductShopCredits(args.shop, IMAGE_TRANSLATE_CREDITS);
  } catch (err) {
    console.error(
      `[picture.translate] deduct failed shop=${args.shop} (image already translated):`,
      err,
    );
    // 译已成功：仍返回 URL，避免用户白付 Aidge；额度异常记日志
  }

  return ok(translatedUrl);
}
