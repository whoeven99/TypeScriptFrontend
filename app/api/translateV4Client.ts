import {
  getTranslateV4ErrorDefaultMessage,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

type SingleTextTranslateArgs = {
  shopName: string;
  source: string;
  target: string;
  resourceType: string;
  context: string;
  key: string;
  type: string;
  resourceId: string | null;
  customPrompt?: string;
  aiModel?: string;
};

export const SingleTextTranslate = async (args: SingleTextTranslateArgs) => {
  try {
    const customPrompt = args.customPrompt ?? "";
    const aiModel = args.aiModel?.trim() || undefined;
    const res = await fetch("/api/translate-v4/single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, customPrompt, aiModel }),
    });
    const data = await res.json();
    if (!data?.success && data?.errorMsg) {
      return {
        ...data,
        errorMsg: getTranslateV4ErrorDefaultMessage(
          data.errorMsg,
          TRANSLATE_V4_ERROR_KEYS.SINGLE_TRANSLATE_FAILED,
        ),
      };
    }
    return data;
  } catch (error) {
    console.error("Error SingleTextTranslate:", error);
    return {
      success: false,
      errorCode: 50000,
      errorMsg: getTranslateV4ErrorDefaultMessage(
        TRANSLATE_V4_ERROR_KEYS.SINGLE_TRANSLATE_FAILED,
      ),
      response: "",
    };
  }
};
