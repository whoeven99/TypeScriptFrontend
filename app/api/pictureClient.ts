/** Admin 嵌入页图译客户端：只打 TSF Remix API，不经过 Spring。 */

export const UpdateProductImageAltData = async ({
  shopName,
  productId,
  imageUrl,
  altText,
  targetAltText,
  languageCode,
}: {
  shopName: string;
  productId: string;
  imageUrl: string;
  altText: string;
  targetAltText: string;
  languageCode: string;
}) => {
  try {
    const res = await fetch("/api/picture/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName,
        imageId: productId,
        imageBeforeUrl: imageUrl,
        altBeforeTranslation: altText,
        altAfterTranslation: targetAltText,
        languageCode,
      }),
    });
    if (!res.ok) {
      console.error(`UpdateProductImageAltData status=${res.status}`);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: undefined,
      };
    }
    return await res.json();
  } catch (error) {
    console.error("Error UpdateProductImageAltData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const DeleteProductImageData = async ({
  shopName,
  productId,
  imageUrl,
  languageCode,
}: {
  shopName: string;
  productId: string;
  imageUrl: string;
  languageCode: string;
}) => {
  try {
    const res = await fetch("/api/picture/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName,
        imageId: productId,
        imageBeforeUrl: imageUrl,
        languageCode,
      }),
    });
    if (!res.ok) {
      console.error(`DeleteProductImageData status=${res.status}`);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: undefined,
      };
    }
    return await res.json();
  } catch (error) {
    console.error("Error DeleteProductImageData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const GetProductImageData = async ({
  shopName,
  productId,
  languageCode,
}: {
  shopName: string;
  productId: string;
  languageCode: string;
}) => {
  try {
    const res = await fetch("/api/picture/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, productId, languageCode }),
    });
    if (!res.ok) {
      console.error(`GetProductImageData status=${res.status}`);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: [] as unknown[],
      };
    }
    return await res.json();
  } catch (error) {
    console.error("Error GetProductImageData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [] as unknown[],
    };
  }
};

/**
 * 手动上传替换图。必须用 fetch（App Bridge 会注入 session token）；
 * Ant Design Upload 默认 XHR 不会带鉴权，线上会 302。
 */
export const UploadProductImage = async ({
  shopName,
  productId,
  imageUrl,
  languageCode,
  file,
  altBeforeTranslation = "",
  altAfterTranslation = "",
}: {
  shopName: string;
  productId: string;
  imageUrl: string;
  languageCode: string;
  file: Blob;
  altBeforeTranslation?: string;
  altAfterTranslation?: string;
}) => {
  try {
    const form = new FormData();
    form.append("shopName", shopName);
    form.append(
      "userPicturesDoJson",
      JSON.stringify({
        shopName,
        imageId: productId,
        imageBeforeUrl: imageUrl,
        altBeforeTranslation,
        altAfterTranslation,
        languageCode,
      }),
    );
    form.append("file", file);
    const res = await fetch("/api/picture/upload", {
      method: "POST",
      body: form,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      console.error(`UploadProductImage redirected status=${res.status}`);
      return {
        success: false,
        errorCode: res.status,
        errorMsg: "AUTH_REDIRECT",
        response: undefined,
      };
    }
    if (!res.ok) {
      console.error(`UploadProductImage status=${res.status}`);
      return {
        success: false,
        errorCode: res.status,
        errorMsg: "SERVER_ERROR",
        response: undefined,
      };
    }
    return await res.json();
  } catch (error) {
    console.error("Error UploadProductImage:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const TranslateImage = async ({
  shop,
  imageUrl,
  sourceCode,
  targetCode,
}: {
  shop: string;
  imageUrl: string;
  sourceCode: string;
  targetCode: string;
}) => {
  try {
    const res = await fetch("/api/translate-v4/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: shop,
        imageUrl,
        sourceCode,
        targetCode,
      }),
    });
    if (!res.ok) {
      console.error(`TranslateImage status=${res.status}`);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
    }
    return await res.json();
  } catch (error) {
    console.error("Error TranslateImage:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};
