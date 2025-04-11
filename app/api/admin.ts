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
  accessToken: string;
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
    
  }
};

export const queryShop = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
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
    
  }
};

export const queryTheme = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
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
    
  }
};

// export const queryTheme = async ({
//   shop,
//   accessToken,
// }: {
//   shop: string;
//   accessToken: string;
// }) => {
//   try {
//     const query = `{
//       themes(roles: MAIN, first: 1) {
//         nodes {
//           files(filenames: "sections/footer-group.json") {
//             nodes {
//               body {
//                 ... on OnlineStoreThemeFileBodyText {
//                   __typename
//                   content
//                 }
//               }
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
//     const res = response.data.data.themes;
//     return res;
//   } catch (error) {
//     console.error("Error queryTheme:", error);
//     
//   }
// };

export const queryProductsCount = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
  try {
    const query = `{
      productsCount {
        count
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
    const res = response.data?.data?.productsCount?.count;

    return res;
  } catch (error) {
    console.error("Error fetching shop products:", error);
  }
};

export const queryAllProducts = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
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
  }
};

export const queryNextProducts = async ({
  shop,
  accessToken,
  locale,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  locale: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousProducts = async ({
  shop,
  accessToken,
  marketId,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  marketId: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryNextCollections = async ({
  shop,
  accessToken,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousCollections = async ({
  shop,
  accessToken,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryNextArticles = async ({
  shop,
  accessToken,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousArticles = async ({
  shop,
  accessToken,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryNextBlogs = async ({
  shop,
  accessToken,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousBlogs = async ({
  shop,
  accessToken,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryNextPages = async ({
  shop,
  accessToken,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousPages = async ({
  shop,
  accessToken,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryNextNavigations = async ({
  shop,
  accessToken,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousNavigations = async ({
  shop,
  accessToken,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryNextShopMetafields = async ({
  shop,
  accessToken,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousShopMetafields = async ({
  shop,
  accessToken,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryAllProductMetafields = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
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
    
  }
};

export const queryNextProductMetafields = async ({
  shop,
  accessToken,
  key,
  endCursor,
}: {
  shop: string;
  accessToken: string;
  key: string;
  endCursor: string | undefined;
}) => {
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
    
  }
};

export const queryPreviousProductMetafields = async ({
  shop,
  accessToken,
  key,
  startCursor,
}: {
  shop: string;
  accessToken: string;
  key: string;
  startCursor: string | undefined;
}) => {
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
    
  }
};

export const queryNextTransType = async ({
  shop,
  accessToken,
  resourceType,
  endCursor,
  locale,
}: {
  shop: string;
  accessToken: string;
  resourceType: string;
  endCursor: string;
  locale: string;
}) => {
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
    
  }
};

export const queryPreviousTransType = async ({
  shop,
  accessToken,
  resourceType,
  startCursor,
  locale,
}: {
  shop: string;
  accessToken: string;
  resourceType: string;
  startCursor: string;
  locale: string;
}) => {
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
    
  }
};

export const queryNextNestTransType = async ({
  shop,
  accessToken,
  resourceType,
  nestResourceType,
  endCursor,
  locale,
}: {
  shop: string;
  accessToken: string;
  resourceType: string;
  nestResourceType: string;
  endCursor: string;
  locale: string;
}) => {
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
    
  }
};

export const queryPreviousNestTransType = async ({
  shop,
  accessToken,
  resourceType,
  nestResourceType,
  startCursor,
  locale,
}: {
  shop: string;
  accessToken: string;
  resourceType: string;
  nestResourceType: string;
  startCursor: string;
  locale: string;
}) => {
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
    
  }
};

export const queryAllLanguages = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
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
    
  }
};

export const queryAllMarket = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
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
    
  }
};

//查询订单状态
export const queryOrders = async ({
  shop,
  accessToken,
  id,
}: {
  shop: string;
  accessToken: string;
  id: string;
}) => {
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
    return res;
  } catch (error) {
    console.error("Error fetching orders:", error);
    
  }
};

// export const queryAllCustomers = async ({
//   shop,
//   accessToken,
// }: {
//   shop: string;
//   accessToken: string;
// }) => {
//   try {
//     const query = `{
//       customersCount {
//         count
//          precision
//        }
//      }`;

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
//     
//   }
// };

export const mutationShopLocaleEnable = async ({
  shop,
  accessToken,
  addLanguages,
}: {
  shop: string;
  accessToken: string;
  addLanguages: {
    primaryLanguage: ShopLocalesType | undefined;
    selectedLanguages: string[];
  }; // 接受语言数组
}) => {
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

    const res = response.data.data.shopLocaleDisable.locale;
    return res || language.locale;
  } catch (error) {
    console.error("Error mutating shop languages:", error);
    
  }
};

export const mutationShopLocalePublish = async ({
  shop,
  accessToken,
  publishInfo,
}: {
  shop: string;
  accessToken: string;
  publishInfo: PublishInfoType; // 接受语言数组
}) => {
  console.log("publishInfo: ", publishInfo);
  try {
    // 遍历语言数组并逐个执行 GraphQL mutation
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
    // const res = response.data.data.shopLocaleUpdate.shopLocale;
    // return res;
  } catch (error) {
    console.error("Error publish shopLanguage:", error);
    
  }
};

export const mutationShopLocaleUnpublish = async ({
  shop,
  accessToken,
  publishInfos,
}: {
  shop: string;
  accessToken: string;
  publishInfos: UnpublishInfoType[]; // 接受语言数组
}) => {
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
    
  }
};

//创建一次性订单
export const mutationAppPurchaseOneTimeCreate = async ({
  shop,
  accessToken,
  name,
  price,
  test,
  returnUrl,
}: {
  shop: string;
  accessToken: string;
  name: String;
  price: {
    amount: number;
    currencyCode: string;
  };
  test?: boolean;
  returnUrl: URL;
}) => {
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
          name: `${name} Credits`,
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
    return res;
  } catch (error) {
    console.error("Payment failed:", error);
    
  }
};

//创建月度订阅订单
export const mutationAppSubscriptionCreate = async ({
  shop,
  accessToken,
  name,
  price,
  test,
  trialDays,
  returnUrl,
}: {
  shop: string;
  accessToken: string;
  name: String;
  price: {
    amount: number;
    currencyCode: string;
  };
  test?: boolean;
  trialDays: number;
  returnUrl: URL;
}) => {
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
          name: `${name} Credits`,
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
    return res;
  } catch (error) {
    console.error("Payment failed:", error);
    
  }
};
