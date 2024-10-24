import axios from "axios";
import { authenticate } from "~/shopify.server";
import CryptoJS from "crypto-js"; // 导入 crypto-js

export const translateAll = async ({
  request,
  locale,
}: {
  request: Request;
  locale: string; // 接受语言数组
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const s = shop + accessToken;

  // 使用 CryptoJS 计算 MD5 哈希值
  const sign = CryptoJS.MD5(s).toString(); // 生成 MD5 哈希并转换为字符串
  try {
    const response = await axios({
      url: `https://translation-dev.bogdatech.com/translate-all`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        shop: shop,
        locale: locale,
        sign: sign,
      },
    });

    return response;
  } catch (error) {
    console.error("Error translate start:", error);
    throw new Error("Error translate start");
  }
};

export const updateUserInfo = async (request: Request) => {
  const adminAuthResult = await authenticate.admin(request);
  try {
    await axios({
      url: `https://translation-dev.bogdatech.com/auth/add`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        shop: adminAuthResult.session.shop,
        access_token: adminAuthResult.session.accessToken,
      },
    });
  } catch (error) {
    console.error("Error updating user info:", error);
    throw new Error("User info update failed");
  }

  return null;
};

