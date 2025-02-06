import axios from "axios";
import {
  LanguagesDataType,
  ShopLocalesType,
} from "~/routes/app.language/route";
import { authenticate } from "~/shopify.server";

// function filterEmptyTranslationsAndContent(data: any) {
//   // 使用 filter 方法过滤掉 translations 和 translatableContent 为空的节点
//   return data.nodes.filter((node: any) => {
//     return node.translatableContent.length > 0 || node.translations.length > 0;
//   });
// }

export interface PublishInfoType {
  locale: string;
  shopLocale: { published: boolean; marketWebPresenceIds: string | null };
}

export interface UnpublishInfoType {
  locale: string;
  shopLocale: { published: boolean };
}

export interface TransType {
  resourceId: string;
  translatableContent: [
    {
      value: string;
      key: string;
      type: string;
    },
  ];
  translations: [
    {
      value: string;
      outdated: boolean;
      key: string;
    },
  ];
}

export const queryShopLanguages = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string | undefined;
}) => {
  try {
    const query = `{
        shopLocales {
            name
            locale
            primary
            published
        }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.shopLocales;

    return res;
  } catch (error) {
    console.error("Error fetching shoplocales:", error);
    throw error;
  }
};

export const queryShop = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      shop {
        name
        shopOwnerName
        contactEmail
        currencyCode
        myshopifyDomain
        currencyFormats {
          moneyFormat
          moneyWithCurrencyFormat
        }
        shopPolicies {
          body
          id
          title
        }       
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.shop;
    return res;
  } catch (error) {
    console.error("Error fetching shop:", error);
    throw error;
  }
};

export const queryTheme = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      themes(roles: MAIN, first: 1) {
        nodes {
          files(filenames: "config/settings_data.json") {
            nodes {
              body {
                ... on OnlineStoreThemeFileBodyText {
                  __typename
                  content
                }
              }
            }
          }
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.themes;
    return res;
  } catch (error) {
    console.error("Error queryTheme:", error);
    throw error;
  }
};

export const queryProductCount = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query {
        productsCount {
          count
        }
      }`,
  );

  const data = await response.json();
  console.log("queryProductCount: ", data);
  return data;
};

export const queryAllProducts = async (request: Request) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      products(first: 250) {
        nodes {
          id
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.products;

    return res;
  } catch (error) {
    console.error("Error fetching shop products:", error);
    throw error;
  }
};

export const queryNextProducts = async ({
  request,
  locale,
  endCursor,
}: {
  request: Request;
  locale: string;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      translatableResources(resourceType: PRODUCT, first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          nestedTranslatableResources(first: 15, resourceType: PRODUCT_OPTION) {
            nodes {
              resourceId
              translatableContent {
                key
                value
              }
              translations(locale: "${locale}") {
                outdated
                key
                value
              }
            }
          }
          resourceId
          translatableContent {
            value
            key
            type
          }
          translations(locale: "${locale}") {
            value
            outdated
            key
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const optionResponse = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });

    const res = optionResponse.data.data.translatableResources;

    return res;
  } catch (error) {
    console.error("Error fetching shop products:", error);
    throw error;
  }
};

export const queryPreviousProducts = async ({
  request,
  marketId,
  startCursor,
}: {
  request: Request;
  marketId: string;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      products(last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
        nodes {
          id
          handle
          description
          descriptionHtml
          seo {
            description
            title
          }
          productType
          options {
            name
            values
          }
          media(first: 250) {
            nodes {
              preview {
                image {
                  url
                }
              }
            }
          }
          metafields(first: 250) {
            nodes {
              id
              definition {
                type {
                  category
                }
              }
              value
            }
          }
          title
          translations(locale: "${marketId}") {
            value
            key
            outdated
            updatedAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.products;

    return res;
  } catch (error) {
    console.error("Error fetching shop products:", error);
    throw error;
  }
};

export const queryNextCollections = async ({
  request,
  endCursor,
}: {
  request: Request;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      collections(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          handle
          id
          description
          descriptionHtml
          title
          seo {
            description
            title
          }
          image {
            url
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.collections;

    return res;
  } catch (error) {
    console.error("Error fetching shop collections:", error);
    throw error;
  }
};

export const queryPreviousCollections = async ({
  request,
  startCursor,
}: {
  request: Request;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      collections(last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
        nodes {
          handle
          id
          description
          descriptionHtml
          title
          seo {
            description
            title
          }
          image {
            url
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.collections;

    return res;
  } catch (error) {
    console.error("Error fetching shop collections:", error);
    throw error;
  }
};

export const queryNextArticles = async ({
  request,
  endCursor,
}: {
  request: Request;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      articles(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          id
          summary
          title
          handle
          body
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.articles;

    return res;
  } catch (error) {
    console.error("Error fetching shop articles:", error);
    throw error;
  }
};

export const queryPreviousArticles = async ({
  request,
  startCursor,
}: {
  request: Request;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      articles(last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
        nodes {
          id
          summary
          title
          handle
          body
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.articles;

    return res;
  } catch (error) {
    console.error("Error fetching shop articles:", error);
    throw error;
  }
};

export const queryNextBlogs = async ({
  request,
  endCursor,
}: {
  request: Request;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{       
        blogs(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
          nodes {
            id
            title
            handle
          }
          pageInfo {
            endCursor
            hasNextPage
            hasPreviousPage
            startCursor
          }
        }
      }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.blogs;

    return res;
  } catch (error) {
    console.error("Error fetching shop blogs:", error);
    throw error;
  }
};

export const queryPreviousBlogs = async ({
  request,
  startCursor,
}: {
  request: Request;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{       
        blogs(last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
          nodes {
            id
            title
            handle
          }
          pageInfo {
            endCursor
            hasNextPage
            hasPreviousPage
            startCursor
          }
        }
      }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.blogs;

    return res;
  } catch (error) {
    console.error("Error fetching shop blogs:", error);
    throw error;
  }
};

export const queryNextPages = async ({
  request,
  endCursor,
}: {
  request: Request;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{       
      pages(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          body
          id
          title
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.pages;

    return res;
  } catch (error) {
    console.error("Error fetching shop pages:", error);
    throw error;
  }
};

export const queryPreviousPages = async ({
  request,
  startCursor,
}: {
  request: Request;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{       
      pages(last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
        nodes {
          body
          id
          title
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.pages;

    return res;
  } catch (error) {
    console.error("Error fetching shop pages:", error);
    throw error;
  }
};

export const queryNextNavigations = async ({
  request,
  endCursor,
}: {
  request: Request;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      menus(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          title
          id
          items {
            id
            title
            items {
              id
              title
              items {
              id
              title
              }  
            }  
          }        
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.menus;

    return res;
  } catch (error) {
    console.error("Error fetching shop menus:", error);
    throw error;
  }
};

export const queryPreviousNavigations = async ({
  request,
  startCursor,
}: {
  request: Request;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      menus(last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) 
        nodes {
          title
          id
          items {
            id
            title
            items {
              id
              title
              items {
              id
              title
              }  
            }  
          }        
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.menus;

    return res;
  } catch (error) {
    console.error("Error fetching shop menus:", error);
    throw error;
  }
};

export const queryNextShopMetafields = async ({
  request,
  endCursor,
}: {
  request: Request;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      shop {
        metafields(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
          nodes {
            value
            id
          }
          pageInfo {
            endCursor
            hasNextPage
            hasPreviousPage
            startCursor
          }
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.shop.metafields;
    return res;
  } catch (error) {
    console.error("Error fetching shop metafields:", error);
    throw error;
  }
};

export const queryPreviousShopMetafields = async ({
  request,
  startCursor,
}: {
  request: Request;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      shop {
        metafields(last: 15  ${startCursor ? `, before: "${startCursor}"` : ""}) {
          nodes {
            value
            id
          }
          pageInfo {
            endCursor
            hasNextPage
            hasPreviousPage
            startCursor
          }
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.shop.metafields;
    return res;
  } catch (error) {
    console.error("Error fetching shop metafields:", error);
    throw error;
  }
};

export const queryAllProductMetafields = async ({
  request,
}: {
  request: Request;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      metafieldDefinitions(ownerType: PRODUCT, first: 250) {
        nodes {
          key
          name
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.metafieldDefinitions;
    return res;
  } catch (error) {
    console.error("Error fetching product metafields:", error);
    throw error;
  }
};

export const queryNextProductMetafields = async ({
  request,
  key,
  endCursor,
}: {
  request: Request;
  key: string;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      metafieldDefinitions(ownerType: PRODUCT, key: "${key}", first: 250) {
        nodes {
          metafields(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
            nodes {
              value
              id
            }
            pageInfo {
              endCursor
              hasNextPage
              hasPreviousPage
              startCursor
            }
          }
          name
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.metafieldDefinitions;
    return res;
  } catch (error) {
    console.error("Error fetching product metafields:", error);
    throw error;
  }
};

export const queryPreviousProductMetafields = async ({
  request,
  key,
  startCursor,
}: {
  request: Request;
  key: string;
  startCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      metafieldDefinitions(ownerType: PRODUCT, key: "${key}", first: 1) {
        nodes {
          metafields(last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
            nodes {
              value
              id
            }
            pageInfo {
              endCursor
              hasNextPage
              hasPreviousPage
              startCursor
            }
          }
          name
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.metafieldDefinitions;
    return res;
  } catch (error) {
    console.error("Error fetching product metafields:", error);
    throw error;
  }
};

export const queryNextTransType = async ({
  request,
  resourceType,
  endCursor,
  locale,
}: {
  request: Request;
  resourceType: string;
  endCursor: string;
  locale: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      translatableResources(resourceType: ${resourceType}, first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          resourceId
          translatableContent {
            key
            digest
            locale
            value
          }
          translations(locale: "${locale}") {
            key
            value
            outdated
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.translatableResources;

    return res;
  } catch (error) {
    console.error("Error fetching translation data:", error);
    throw error;
  }
};

export const queryPreviousTransType = async ({
  request,
  resourceType,
  startCursor,
  locale,
}: {
  request: Request;
  resourceType: string;
  startCursor: string;
  locale: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      translatableResources(resourceType: ${resourceType}, last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
        nodes {
          resourceId
          translatableContent {
            key
            digest
            locale
            value
          }
          translations(locale: "${locale}") {
            key
            value
            outdated
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.translatableResources;

    return res;
  } catch (error) {
    console.error("Error fetching translation data:", error);
    throw error;
  }
};

export const queryNextNestTransType = async ({
  request,
  resourceType,
  nestResourceType,
  endCursor,
  locale,
}: {
  request: Request;
  resourceType: string;
  nestResourceType: string;
  endCursor: string;
  locale: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      translatableResources(resourceType: ${resourceType}, first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          nestedTranslatableResources(first: 15, resourceType: ${nestResourceType}) {
            nodes {
              resourceId
              translatableContent {
                key
                digest
                locale
                value
              }
              translations(locale: "${locale}") {
                key
                value
                outdated
              }
            }
          }
          resourceId
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.translatableResources;

    return res;
  } catch (error) {
    console.error("Error fetching translation data:", error);
    throw error;
  }
};

export const queryPreviousNestTransType = async ({
  request,
  resourceType,
  nestResourceType,
  startCursor,
  locale,
}: {
  request: Request;
  resourceType: string;
  nestResourceType: string;
  startCursor: string;
  locale: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      translatableResources(resourceType: ${resourceType}, last: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
        nodes {
          nestedTranslatableResources(first: 15, resourceType: ${nestResourceType}) {
            nodes {
              resourceId
              translatableContent {
                key
                digest
                locale
                value
              }
              translations(locale: "${locale}") {
                key
                value
                outdated
              }
            }
          }
          resourceId
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.translatableResources;
    return res;
  } catch (error) {
    console.error("Error fetching translation data:", error);
    throw error;
  }
};

export const queryAllLanguages = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      availableLocales {
        isoCode
        name
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.availableLocales;

    return res;
  } catch (error) {
    console.error("Error fetching all languages:", error);
    throw error;
  }
};

export const queryAllMarket = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      markets(first: 250) {
        nodes {
          name
          primary
          webPresences(first: 250) {
            nodes {
              id
            }
          }
        }
      }
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.markets.nodes;

    return res;
  } catch (error) {
    console.error("Error fetching all markets:", error);
    throw error;
  }
};

//查询订单状态
export const queryOrders = async ({
  request,
  id,
}: {
  request: Request;
  id: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const query = `{
    node(id: "${id}") {
      ... on AppPurchaseOneTime {
        id
        status
      }
    }
  }`;
  try {
    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.node;
    console.log(res);
    return res;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

// export const queryAllCustomers = async ({ request }: { request: Request }) => {
//   const adminAuthResult = await authenticate.admin(request);
//   const { shop, accessToken } = adminAuthResult.session;
//   try {
//     const query = `{
//       customersCount {
//         count
//         precision
//       }
//     }`;

//     const response = await axios({
//       url: `https://${shop}/admin/api/2024-10/graphql.json`,
//       method: "POST",
//       headers: {
//         "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
//         "Content-Type": "application/json",
//       },
//       data: JSON.stringify({ query }),
//     });
//     const res = response.data.data;
//     return res;
//   } catch (error) {
//     console.error("Error fetching all orders:", error);
//     throw error;
//   }
// };

export const mutationShopLocaleEnable = async ({
  request,
  addLanguages,
}: {
  request: Request;
  addLanguages: {
    primaryLanguage: ShopLocalesType | undefined;
    selectedLanguages: string[];
  }; // 接受语言数组
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  let shopLanguages: any[] = [];
  let success = true;
  try {
    // 遍历语言数组并逐个执行 GraphQL mutation
    for (const language of addLanguages.selectedLanguages) {
      const mutation = `
        mutation {
          shopLocaleEnable(locale: "${language}") {
            shopLocale {
              published
              primary
              name
              locale
            }
          }
        }
      `;

      // 执行 API 请求
      const shopifyResponse = await axios({
        url: `https://${shop}/admin/api/2024-10/graphql.json`,
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ query: mutation }),
      });

      const serveResponse = await axios({
        url: `${process.env.SERVER_URL}/translate/insertShopTranslateInfo`,
        method: "Post",
        data: {
          shopName: shop,
          accessToken: accessToken,
          source: addLanguages?.primaryLanguage?.locale,
          target: language,
        },
      });
      console.log("serveResponse: ", serveResponse.data.response);
      if (
        serveResponse.status >= 200 &&
        serveResponse.status < 300 &&
        shopifyResponse.status >= 200 &&
        shopifyResponse.status < 300
      ) {
        shopLanguages.push(
          shopifyResponse.data.data.shopLocaleEnable.shopLocale,
        );
      } else {
        success = false;
      }
    }
    return shopLanguages;
  } catch (error) {
    console.error("Error mutating shop languages:", error);
    throw error;
  }
};

export const mutationShopLocaleDisable = async ({
  shop,
  accessToken,
  language,
  primaryLanguageCode,
}: {
  shop: string;
  accessToken: string | undefined;
  language: LanguagesDataType; // 接受语言数组
  primaryLanguageCode: string;
}) => {
  try {
    // 遍历语言数组并逐个执行 GraphQL mutation
    const mutation = `
        mutation {
          shopLocaleDisable(locale: "${language.locale}") {
            locale
          }
        }
      `;

    // 执行 API 请求
    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query: mutation }),
    });

    await axios({
      url: `${process.env.SERVER_URL}/translate/deleteFromTranslates`,
      method: "POST",
      data: {
        shopName: shop,
        source: primaryLanguageCode,
        target: language.locale,
      },
    });

    console.log(response.data.data.shopLocaleDisable.locale);
    const res = response.data.data.shopLocaleDisable.locale;
    return res || language.locale;
  } catch (error) {
    console.error("Error mutating shop languages:", error);
    throw error;
  }
};

export const mutationShopLocalePublish = async ({
  request,
  publishInfos,
}: {
  request: Request;
  publishInfos: PublishInfoType[]; // 接受语言数组
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    // 遍历语言数组并逐个执行 GraphQL mutation
    for (const publishInfo of publishInfos) {
      const confirmMutation = `
        mutation {
          shopLocaleUpdate(
            locale: "${publishInfo.locale}"
            shopLocale: {
              published: ${publishInfo.shopLocale.published},
              marketWebPresenceIds: "${publishInfo.shopLocale.marketWebPresenceIds}"
            }
          ){
            shopLocale {
              published
              primary
              name
              locale
            }
          }
        }
      `;

      // 执行 API 请求
      const response = await axios({
        url: `https://${shop}/admin/api/2024-10/graphql.json`,
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ query: confirmMutation }),
      });
    }
  } catch (error) {
    console.error("Error publish shopLanguage:", error);
    throw error;
  }
};

export const mutationShopLocaleUnpublish = async ({
  request,
  publishInfos,
}: {
  request: Request;
  publishInfos: UnpublishInfoType[]; // 接受语言数组
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    // 遍历语言数组并逐个执行 GraphQL mutation
    for (const publishInfo of publishInfos) {
      const confirmMutation = `
        mutation {
          shopLocaleUpdate(
            locale: "${publishInfo.locale}"
            shopLocale: {
              published: ${publishInfo.shopLocale.published},
            }
          ){
            shopLocale {
              published
              primary
              name
              locale
            }
          }
        }
      `;

      // 执行 API 请求
      const response = await axios({
        url: `https://${shop}/admin/api/2024-10/graphql.json`,
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ query: confirmMutation }),
      });
    }
  } catch (error) {
    console.error("Error publish shopLanguage:", error);
    throw error;
  }
};

//创建一次性订单
export const mutationAppPurchaseOneTimeCreate = async ({
  request,
  name,
  price,
  test,
  returnUrl,
}: {
  request: Request;
  name: String;
  price: {
    amount: number;
    currencyCode: string;
  };
  test?: boolean;
  returnUrl: URL;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    // 执行 API 请求
    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
        query: `mutation AppPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL! $test: Boolean) {
          appPurchaseOneTimeCreate(name: $name, returnUrl: $returnUrl, price: $price, test: $test) {
            userErrors {
              field
              message
            }
            appPurchaseOneTime {
              createdAt
              id
              name
              price {
                amount
                currencyCode
              }
              status
            }
            confirmationUrl
          }
        }`,
        variables: {
          name: name,
          returnUrl: returnUrl,
          price: {
            amount: price.amount,
            currencyCode: price.currencyCode,
          },
          test: test || false,
        },
      },
    });
    const res = response.data;
    console.log(res);
    return res;
  } catch (error) {
    console.error("Payment failed:", error);
    throw error;
  }
};

//创建月度订阅订单
export const mutationAppSubscriptionCreate = async ({
  request,
  name,
  price,
  test,
  trialDays,
  returnUrl,
}: {
  request: Request;
  name: String;
  price: {
    amount: number;
    currencyCode: string;
  };
  test?: boolean;
  trialDays: number;
  returnUrl: URL;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    // 执行 API 请求
    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
        query: `mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int!, $test: Boolean) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            lineItems: $lineItems
            trialDays: $trialDays
            test: $test
          ) {
            userErrors {
              field
              message
            }
            appSubscription {
              id
              createdAt
              currentPeriodEnd
              name
              returnUrl
              status
              test
              trialDays
            }
            confirmationUrl
          }
        }`,
        variables: {
          name: name,
          returnUrl: returnUrl,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount: price.amount,
                    currencyCode: price.currencyCode,
                  },
                },
              },
            },
          ],
          trialDays: trialDays,
          test: test || false,
        },
      },
    });
    const res = response.data;
    console.log(res);
    return res;
  } catch (error) {
    console.error("Payment failed:", error);
    throw error;
  }
};
