import { authenticate } from "~/shopify.server";

export const authForShopify = async ({ request }: { request: Request }) => {
  const authorization = request.headers.get("Authorization");
  console.log("Authorization: ", authorization);

  //   if (!authorization) {
  //     // 🔄 方案一：刷新当前页面
  //     return undefined;
  //   }

  const adminAuthResult = await authenticate.admin(request);

  const { admin } = adminAuthResult;
  const { shop, accessToken } = adminAuthResult.session;

  return {
    admin,
    shop,
    accessToken,
  };
};
