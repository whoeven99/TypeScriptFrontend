import axios from "axios";

export const getAvailableLanguages = async (shop: string, accessToken: string) => {
  const query = `
    {
      localization {
        availableLanguages {
          isoCode
          name
        }
      }
    }
  `;

  const response = await axios({
    url: `https://${shop}/api/2024-07/graphql.json`,
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": accessToken, // 确保使用正确的 Token 名称
      "Content-Type": "application/json",
    },
    data: JSON.stringify({ query }),
  });

  return response.data.data.localization.availableLanguages;
};
