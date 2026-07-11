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
