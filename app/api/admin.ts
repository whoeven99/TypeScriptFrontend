import axios from "axios";
import { LanguagesDataType } from "~/routes/app.language/route";
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

export interface UnpublishInfoType {
  locale: string;
  shopLocale: { published: boolean };
}

export const queryShopLanguages = async (request: Request) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
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
    console.error("Error fetching shop languages:", error);
    throw error;
  }
};

export const queryShop = async (request: Request) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{       
      shop {
        name

        currencyFormats {
          moneyFormat
          moneyWithCurrencyFormat
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
    console.error("Error fetching shop languages:", error);
    throw error;
  }
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
  endCursor,
}: {
  request: Request;
  endCursor: string | undefined;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      products(first: 15 ${endCursor ? `, after: "${endCursor}"` : ""}) {
        nodes {
          handle
          id
          description
          descriptionHtml
          seo {
            description
            title
          }
          productType
          options(first: 10) {
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
                id
              }
            }
          }
          title
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

export const queryPreviousProducts = async ({
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
                id
              }
            }
          }
          title
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
      pages(first: 15 ${startCursor ? `, before: "${startCursor}"` : ""}) {
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

export const queryTransType = async (
  request: Request,
  resourceType: string,
) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const query = `{
      translatableResources(resourceType: ${resourceType}, first: 250) {
        nodes {
          resourceId
          translatableContent {
            value
            digest
            key
            locale
            type
          }
          translations(locale: "ja") {
            value
            updatedAt
            outdated
            key
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
    const res = response.data.data.translatableResources;

    return res;
  } catch (error) {
    console.error("Error fetching translation data:", error);
    throw error;
  }
};

export const queryAllLanguages = async (request: Request) => {
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

export const queryAllMarket = async (request: Request) => {
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

// export const queryStorePages = async (request: Request) => {
//   const adminAuthResult = await authenticate.admin(request);
//   const { shop, accessToken } = adminAuthResult.session;
//   try {
//     const query = `{
//       markets(first: 208) {
//         nodes {
//           name
//           primary
//           webPresences(first: 208) {
//             nodes {
//               id
//             }
//           }
//         }
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
//     const res = response.data.data.markets.nodes;

//     return res;
//   } catch (error) {
//     console.error("Error fetching all markets:", error);
//     throw error;
//   }
// };

export const mutationShopLocaleEnable = async ({
  request,
  languages,
}: {
  request: Request;
  languages: string[]; // 接受语言数组
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    // 遍历语言数组并逐个执行 GraphQL mutation
    for (const language of languages) {
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
      await axios({
        url: `https://${shop}/admin/api/2024-10/graphql.json`,
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ query: mutation }),
      });
    }
  } catch (error) {
    console.error("Error mutating shop languages:", error);
    throw error;
  }
};

export const mutationShopLocaleDisable = async ({
  request,
  languages,
}: {
  request: Request;
  languages: LanguagesDataType[]; // 接受语言数组
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    // 遍历语言数组并逐个执行 GraphQL mutation
    for (const language of languages) {
      const mutation = `
        mutation {
          shopLocaleDisable(locale: "${language.locale}") {
            locale
          }
        }
      `;

      // 执行 API 请求
      await axios({
        url: `https://${shop}/admin/api/2024-10/graphql.json`,
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ query: mutation }),
      });
    }
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
