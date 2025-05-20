import {
  Button,
  Layout,
  Menu,
  Result,
  Spin,
  Table,
  theme,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { FullscreenBar, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Modal } from "@shopify/app-bridge-react";
import { MenuItem } from "../app.manage_translation/components/itemsScroll";

const { Sider, Content } = Layout;

const { Text } = Typography;

interface ProductType {
  key: string;
  handle: {
    value: string;
    type: string;
  };
  title: {
    value: string;
    type: string;
  };
  descriptionHtml: {
    value: string;
    type: string;
  };
  productType: {
    value: string;
    type: string;
  };
  seo: {
    description: {
      value: string;
      type: string;
    };
    title: {
      value: string;
      type: string;
    };
  };
  options: [
    {
      key: string;
      name: string;
      type: string;
      translatableContent: string | undefined;
      translation: string | undefined;
    },
  ];
  metafields: [
    {
      key: string;
      name: string;
      type: string;
      translatableContent: string | undefined;
      translation: string | undefined;
    },
  ];
  translations: {
    handle: string | undefined;
    key: string;
    descriptionHtml: string | undefined;
    seo: {
      description: string | undefined;
      title: string | undefined;
    };
    productType: string | undefined;
    title: string | undefined;
  };
}

type TableDataType = {
  key: string;
  index: number;
  resource: string;
  type: string | undefined;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const response = await admin.graphql(
      `#graphql
        query {     
          translatableResources(resourceType: PRODUCT, first: 20) {
            nodes {
              resourceId
              translatableContent {
                digest
                key
                locale
                type
                value
              }
              translations(locale: "${searchTerm || " "}") {
                value
                key
              }
              options: nestedTranslatableResources(first: 10, resourceType: PRODUCT_OPTION) {
                nodes {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${searchTerm || " "}") {
                    key
                    value
                  }
                }
              }
              metafields: nestedTranslatableResources(first: 10, resourceType: METAFIELD) {
                nodes {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${searchTerm || " "}") {
                    key
                    value
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
          products(first: 20) {
            nodes {
              id
              options(first: 10) {
                optionValues {
                  id
                }
              }
            }
          }
      }`,
    );

    const products = await response.json();

    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      products,
    });
  } catch (error) {
    console.error("Error load product:", error);
    throw new Response("Error load product", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;


  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    const variants: string[] = JSON.parse(formData.get("variants") as string);
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!startCursor:
        try {
          const response = await admin.graphql(
            `#graphql
            query {     
              translatableResources(resourceType: PRODUCT, last: 20, before: "${startCursor}") {
                nodes {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${searchTerm || " "}") {
                    value
                    key
                  }
                  options: nestedTranslatableResources(first: 10, resourceType: PRODUCT_OPTION) {
                    nodes {
                      resourceId
                      translatableContent {
                        digest
                        key
                        locale
                        type
                        value
                      }
                      translations(locale: "${searchTerm || " "}") {
                        key
                        value
                      }
                    }
                  }
                  metafields: nestedTranslatableResources(first: 10, resourceType: METAFIELD) {
                    nodes {
                      resourceId
                      translatableContent {
                        digest
                        key
                        locale
                        type
                        value
                      }
                      translations(locale: "${searchTerm || " "}") {
                        key
                        value
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
              products(first: 20) {
                nodes {
                  id
                  options(first: 10) {
                    optionValues {
                      id
                    }
                  }
                }
              }
          }`,
          );

          const previousProducts = await response.json();

          return json({
            previousProducts: previousProducts,
          });
        } catch (error) {
          console.error("Error action product:", error);
        }
      case !!endCursor:
        try {
          const response = await admin.graphql(
            `#graphql
            query {     
              translatableResources(resourceType: PRODUCT, first: 20, after: "${endCursor}") {
                nodes {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${searchTerm || " "}") {
                    value
                    key
                  }
                  options: nestedTranslatableResources(first: 10, resourceType: PRODUCT_OPTION) {
                    nodes {
                      resourceId
                      translatableContent {
                        digest
                        key
                        locale
                        type
                        value
                      }
                      translations(locale: "${searchTerm || " "}") {
                        key
                        value
                      }
                    }
                  }
                  metafields: nestedTranslatableResources(first: 10, resourceType: METAFIELD) {
                    nodes {
                      resourceId
                      translatableContent {
                        digest
                        key
                        locale
                        type
                        value
                      }
                      translations(locale: "${searchTerm || " "}") {
                        key
                        value
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
              products(first: 20) {
                nodes {
                  id
                  options(first: 10) {
                    optionValues {
                      id
                    }
                  }
                }
              }
          }`,
          );

          const nextProducts = await response.json();

          return json({
            nextProducts: nextProducts,
          });
        } catch (error) {
          console.error("Error action product:", error);
        }
      case !!variants:
        try {
          const promise = variants.map(
            async (variant: string) => {
              const response = await admin.graphql(
                `#graphql
                query {
                  translatableResourcesByIds(resourceIds: "${variant}", first: 1) {
                    nodes {
                      resourceId
                      translatableContent {
                        digest
                        key
                        locale
                        type
                        value
                      }
                      translations(locale: "${searchTerm || " "}") {
                        key
                        value
                      }
                    }
                  }
                }`
              );
              return await response.json();
            },
          );
          const variantsData = await Promise.allSettled(promise);
          variantsData.forEach((result) => {
            if (result.status === "fulfilled") {
              console.log("Request successful:", result.value);
            } else {
              console.error("Request failed:", result.reason);
            }
          });
          return json({ variantsData: variantsData });
        } catch (error) {
          console.error("Error action product:", error);
        }
      case !!confirmData:
        const originalConfirmData = confirmData;
        confirmData.map((item) => {
          // 检查 key 是否是字符串并包含下划线
          if (
            typeof item.key === "string" &&
            item.key.includes("_") &&
            item.key.split("_")[1] !== "type" &&
            item.key.split("_")[0] !== "meta" &&
            item.key.split("_")[0] !== "body"
          ) {
            console.log(item);

            // 将 key 修改为下划线前的部分
            item.key = item.key.split("_")[0]; // 取下划线前的部分
          }

          return item;
        });
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
          confirmData,
        });
        return json({ data: data, confirmData: originalConfirmData });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action product:", error);
    throw new Response("Error action product", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm, products, server, shopName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const { t } = useTranslation();

  const navigate = useNavigate();
  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();
  const variantFetcher = useFetcher<any>();

  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [productsData, setProductsData] = useState(products);
  const [productData, setProductData] = useState<ProductType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [optionsData, setOptionsData] = useState<TableDataType[]>([]);
  const [metafieldsData, setMetafieldsData] = useState<TableDataType[]>([]);
  const [variantsData, setVariantsData] = useState<any>([]);
  const [selectProductKey, setSelectProductKey] = useState(
    products.data.translatableResources.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [variantsLoading, setVariantsLoading] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const itemOptions = [
    { label: t("Products"), value: "product" },
    { label: t("Collection"), value: "collection" },
    { label: t("Theme"), value: "theme" },
    { label: t("Shop"), value: "shop" },
    { label: t("Store metadata"), value: "metafield" },
    { label: t("Articles"), value: "article" },
    { label: t("Blog titles"), value: "blog" },
    { label: t("Pages"), value: "page" },
    { label: t("Filters"), value: "filter" },
    { label: t("Metaobjects"), value: "metaobject" },
    { label: t("Navigation"), value: "navigation" },
    { label: t("Email"), value: "email" },
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ]
  const [languageOptions, setLanguageOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(searchTerm || "");
  const [selectedItem, setSelectedItem] = useState<string>("product");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    products.data.translatableResources.pageInfo.hasPreviousPage || false
  );
  const [hasNext, setHasNext] = useState<boolean>(
    products.data.translatableResources.pageInfo.hasNextPage || false
  );

  useEffect(() => {
    if (products) {
      setMenuData(exMenuData(products));
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log(confirmData);
  }, [confirmData]);

  // 更新 loadingItemsRef 的值
  useEffect(() => {
    loadingItemsRef.current = loadingItems;
  }, [loadingItems]);

  useEffect(() => {
    if (languageTableData) {
      setLanguageOptions(languageTableData
        .filter((item: any) => !item.primary)
        .map((item: any) => ({
          label: item.language,
          value: item.locale,
        })));
    }
  }, [languageTableData])

  useEffect(() => {
    if (products && isManualChange.current) {
      setProductsData(products);
      setMenuData(exMenuData(products));
      setSelectProductKey(products.data.translatableResources.nodes[0]?.resourceId);
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      isManualChange.current = false; // 重置
    }
  }, [products]);

  useEffect(() => {
    setVariantsLoading(true);
    setVariantsData([]);
    const data = transBeforeData({
      products: productsData,
    });
    setProductData(data);
    setLoadingItems([]);
    setConfirmData([]);
    setTranslatedValues({});
    setHasPrevious(productsData.data.translatableResources.pageInfo.hasPreviousPage);
    setHasNext(productsData.data.translatableResources.pageInfo.hasNextPage);
    const variants = productsData.data.products.nodes.find((item: any) => item.id === selectProductKey)?.options.flatMap((item: any) =>
      item.optionValues.map((opt: any) => opt.id)
    );
    if (variants) {
      variantFetcher.submit({ variants: JSON.stringify(variants) }, {
        method: "post",
        action: "/app/manage_translation/product",
      });
    } else {
      setVariantsLoading(false);
    }
  }, [selectProductKey, productsData]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          index: 4,
          resource: t("Title"),
          type: productData?.title?.type,
          default_language: productData?.title?.value,
          translated: productData?.translations?.title,
        },
        {
          key: "body_html",
          index: 4,
          resource: t("Description"),
          type: productData?.descriptionHtml?.type,
          default_language: productData?.descriptionHtml?.value,
          translated: productData?.translations?.descriptionHtml,
        },
        {
          key: "product_type",
          index: 4,
          resource: t("ProductType"),
          type: productData?.productType?.type,
          default_language: productData?.productType?.value,
          translated: productData?.translations?.productType,
        },
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
        {
          key: "handle",
          index: 4,
          resource: t("URL handle"),
          type: productData?.handle?.type,
          default_language: productData?.handle?.value,
          translated: productData?.translations?.handle,
        },
        {
          key: "meta_title",
          index: 4,
          resource: t("Meta title"),
          type: productData?.seo.title?.type,
          default_language: productData?.seo.title?.value,
          translated: productData?.translations?.seo.title,
        },
        {
          key: "meta_description",
          index: 4,
          resource: t("Meta description"),
          type: productData?.seo.description?.type,
          default_language: productData?.seo.description?.value,
          translated: productData?.translations?.seo.description,
        },
      ].filter((item) => item.default_language),
    );
    const optionsData = productData?.options.map((option, index) => {
      if (option?.name === "Title") {
        return null;
      }
      return {
        key: option.key,
        index: index,
        resource: t(option?.name),
        type: option?.type,
        default_language: option?.translatableContent,
        translated: option.translation,
      };
    });
    if (optionsData) setOptionsData(optionsData);
    const metafieldsData = productData?.metafields.map((metafield, index) => {
      return {
        key: metafield.key,
        index: index,
        resource: t(metafield?.name),
        type: metafield?.type,
        default_language: metafield?.translatableContent,
        translated: metafield?.translation,
      };
    });
    if (metafieldsData) setMetafieldsData(metafieldsData);
  }, [productData]);

  useEffect(() => {
    if (actionData && "nextProducts" in actionData) {
      // 在这里处理 nextProducts
      setMenuData(exMenuData(actionData.nextProducts));
      setProductsData(actionData.nextProducts);
      setSelectProductKey(actionData.nextProducts.data.translatableResources.nodes[0]?.resourceId);
    } else if (
      actionData &&
      "previousProducts" in actionData
    ) {
      setMenuData(exMenuData(actionData.previousProducts));
      setProductsData(actionData.previousProducts);
      setSelectProductKey(actionData.previousProducts.data.translatableResources.nodes[0]?.resourceId);
    } else {
      // 如果不存在 nextProducts，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const successfulItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === true
      );
      const errorItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === false
      );

      successfulItem.forEach((item: any) => {
        if (item.data.resourceId.split("/")[3] === "Product") {
          const index = productsData.data.translatableResources.nodes.findIndex((option: any) => option.resourceId === item.data.resourceId);
          if (index !== -1) {
            const product = productsData.data.translatableResources.nodes[index].translations.find((option: any) => option.key === item.data.key);
            if (product) {
              product.value = item.data.value;
            } else {
              productsData.data.translatableResources.nodes[index].translations.push({
                key: item.data.key,
                value: item.data.value,
              });
            }
          }
        } else if (item.data.resourceId.split("/")[3] === "ProductOption") {
          const index = productsData.data.translatableResources.nodes.findIndex((productOption: any) =>
            productOption.options.nodes.some(
              (option: any) => option.resourceId === item.data.resourceId
            )
          );
          if (index !== -1) {
            const productOption = productsData.data.translatableResources.nodes[index].options.nodes.find((option: any) => option.resourceId === item.data.resourceId);
            if (productOption.translations.length > 0) {
              productOption.translations[0].value = item.data.value;
            } else {
              productOption.translations.push({
                key: item.data.key,
                value: item.data.value,
              });
            }
          }
        } else if (item.data.resourceId.split("/")[3] === "Metafield") {
          const index = productsData.data.translatableResources.nodes.findIndex((productMetafield: any) =>
            productMetafield.metafields.nodes.some(
              (option: any) => option.resourceId === item.data.resourceId
            )
          );
          if (index !== -1) {
            const productMetafield = productsData.data.translatableResources.nodes[index].metafields.nodes.find((option: any) => option.resourceId === item.data.resourceId);
            if (productMetafield.translations.length > 0) {
              productMetafield.translations[0].value = item.data.value;
            } else {
              productMetafield.translations.push({
                key: item.data.key,
                value: item.data.value,
              });
            }
          }
        }
      })
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
      setConfirmData([]);
    }
    setConfirmLoading(false);
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (variantFetcher.data && variantFetcher.data.variantsData) {
      console.log(variantFetcher.data.variantsData);
      variantFetcher.data.variantsData.forEach((result: any) => {
        if (result.status === "fulfilled") {
          setVariantsData((prev: any) => {
            const newData = result.value.data.translatableResourcesByIds.nodes
              .filter((variant: any) =>
                variant?.translatableContent[0]?.value &&
                variant?.translatableContent[0]?.value !== "Default Title"
              )
              .map((variant: any, index: number) => ({
                key: variant?.resourceId,
                index: index,
                resource: t(variant?.translatableContent[0]?.key),
                type: variant?.translatableContent[0]?.type,
                locale: variant?.translatableContent[0]?.locale,
                digest: variant?.translatableContent[0]?.digest,
                default_language: variant?.translatableContent[0]?.value,
                translated: variant?.translations[0]?.value,
              }));
            return [...prev, ...newData];
          });
        } else {
          console.error("Request failed:", result.reason);
        }
      });
      setVariantsLoading(false);
    }
  }, [variantFetcher.data]);

  const resourceColumns = [
    {
      title: t("Resource"),
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: t("Default Language"),
      dataIndex: "default_language",
      key: "default_language",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            isRtl={searchTerm === "ar"}
          />
        );
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            type="primary"
            onClick={() => {
              handleTranslate("PRODUCT", record?.key || "", record?.type || "", record?.default_language || "");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const SEOColumns = [
    {
      title: "SEO",
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: t("Default Language"),
      dataIndex: "default_language",
      key: "default_language",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            isRtl={searchTerm === "ar"}
          />
        );
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            type="primary"
            onClick={() => {
              handleTranslate("PRODUCT", record?.key || "", record?.type || "", record?.default_language || "");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const optionsColumns = [
    {
      title: t("Product Options"),
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: t("Default Language"),
      dataIndex: "default_language",
      key: "default_language",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <ManageTableInput record={record} />;
        } else {
          return null;
        }
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            index={1}
            isRtl={searchTerm === "ar"}
          />
        );
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            type="primary"
            onClick={() => {
              handleTranslate("PRODUCT_OPTION", record?.key || "", record?.type || "", record?.default_language || "", Number(1 + "" + record?.index));
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const metafieldsColumns = [
    {
      title: t("Metafield"),
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: t("Default Language"),
      dataIndex: "default_language",
      key: "default_language",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <ManageTableInput record={record} />;
        } else {
          return null;
        }
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            index={2}
            isRtl={searchTerm === "ar"}
          />
        );
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            type="primary"
            onClick={() => {
              handleTranslate("METAFIELD", record?.key || "", record?.type || "", record?.default_language || "", Number(2 + "" + record?.index));
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const variantsColumns = [
    {
      title: t("Variants"),
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: t("Default Language"),
      dataIndex: "default_language",
      key: "default_language",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <ManageTableInput record={record} />;
        } else {
          return null;
        }
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput
          record={record}
          translatedValues={translatedValues}
          setTranslatedValues={setTranslatedValues}
          handleInputChange={handleInputChange}
          index={3}
          isRtl={searchTerm === "ar"}
        />;
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            type="primary"
            onClick={() => {
              handleTranslate("PRODUCT_OPTION_VALUE", record?.key || "", record?.type || "", record?.default_language || "", Number(3 + "" + record?.index));
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const exMenuData = (products: any) => {
    const data = products.data.translatableResources.nodes.map((product: any) => ({
      key: product?.resourceId,
      label: product?.translatableContent.find(
        (item: any) => item.key === "title",
      ).value,
    }));
    return data;
  };

  const handleInputChange = (key: string, value: string, index?: number) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [key]: value, // 更新对应的 key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex((item) => item.resourceId === key || item.key === key);
      if (existingItemIndex !== -1) {
        // 如果 key 存在，更新其对应的 value
        const updatedConfirmData = [...prevData];
        updatedConfirmData[existingItemIndex] = {
          ...updatedConfirmData[existingItemIndex],
          value: value,
        };
        return updatedConfirmData;
      } else {
        if (index && index.toString()[0] === "3") {
          const newItem = {
            resourceId: key,
            locale: variantsData[0]?.locale,
            key: "name",
            value: value, // 初始为空字符串
            translatableContentDigest: variantsData?.find(
              (item: any) => item?.key === key,
            )?.digest,
            target: searchTerm || "",
          };
          return [...prevData, newItem]; // 将新数据添加到 confirmData 中
        } else if (index && index.toString()[0] === "2") {
          const count: number = Number(index.toString().slice(1));
          const newItem = {
            resourceId: productsData.data.translatableResources.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.metafields.nodes[count]?.resourceId,
            locale: productsData.data.translatableResources.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.metafields.nodes[
              count
            ]?.translatableContent[0]
              ?.locale,
            key: "value",
            value: value, // 初始为空字符串
            translatableContentDigest: productsData.data.translatableResources.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.metafields.nodes.find((item: any) => item.resourceId === key)?.translatableContent[0]
              ?.digest,
            target: searchTerm || "",
          };
          return [...prevData, newItem]; // 将新数据添加到 confirmData 中
        } else if (index && index.toString()[0] === "1") {
          const count: number = Number(index.toString().slice(1));
          const newItem = {
            resourceId: productsData.data.translatableResources.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.options.nodes[count]?.resourceId,
            locale: productsData.data.translatableResources.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.options.nodes[
              count
            ]?.translatableContent[0]?.locale,
            key: "name",
            value: value, // 初始为空字符串
            translatableContentDigest: productsData.data.translatableResources.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.options.nodes.find((item: any) => item.resourceId === key)?.translatableContent[0]
              ?.digest,
            target: searchTerm || "",
          };
          return [...prevData, newItem]; // 将新数据添加到 confirmData 中
        } else {
          const newItem = {
            resourceId: productsData.data.translatableResources.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.resourceId,
            locale: productsData.data.translatableResources.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.translatableContent.find((item: any) => item.key === key)
              ?.locale,
            key: key,
            value: value, // 初始为空字符串
            translatableContentDigest: productsData.data.translatableResources.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.translatableContent.find((item: any) => item.key === key)
              ?.digest,
            target: searchTerm || "",
          };

          return [...prevData, newItem]; // 将新数据添加到 confirmData 中
        }
      }
    });
  };

  const transBeforeData = ({
    products,
  }: {
    products: any;
  }) => {
    let data: ProductType = {
      key: "",
      title: {
        value: "",
        type: "",
      },
      descriptionHtml: {
        value: "",
        type: "",
      },
      seo: {
        description: {
          value: "",
          type: "",
        },
        title: {
          value: "",
          type: "",
        },
      },
      handle: {
        value: "",
        type: "",
      },
      productType: {
        value: "",
        type: "",
      },
      options: [
        {
          key: "",
          name: "",
          type: "",
          translatableContent: "",
          translation: "",
        },
      ],
      metafields: [
        {
          key: "",
          name: "",
          type: "",
          translatableContent: "",
          translation: "",
        },
      ],
      translations: {
        handle: "",
        key: "",
        descriptionHtml: "",
        seo: {
          description: "",
          title: "",
        },
        productType: "",
        title: "",
      },
    };
    const product = products.data.translatableResources.nodes.find(
      (product: any) => product?.resourceId === selectProductKey,
    );
    const productOption = product.options
    const productMetafield = product.metafields
    data.key = product?.resourceId;
    data.title = {
      value: product?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.value,
      type: product?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.type,
    };
    data.descriptionHtml = {
      value: product?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.value,
      type: product?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.type,
    };
    data.productType = {
      value: product?.translatableContent.find(
        (item: any) => item.key === "product_type",
      )?.value,
      type: product?.translatableContent.find(
        (item: any) => item.key === "product_type",
      )?.type,
    }
    data.handle = {
      value: product?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.value,
      type: product?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.type,
    };
    data.seo.title = {
      value: product?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.value,
      type: product?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.type,
    };
    data.seo.description = {
      value: product?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.value,
      type: product?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.type,
    };
    data.translations.key = product?.resourceId;
    data.translations.title = product?.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.descriptionHtml = product?.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.productType = product?.translations.find(
      (item: any) => item.key === "product_type",
    )?.value;
    data.translations.handle = product?.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.seo.title = product?.translations.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.translations.seo.description = product?.translations.find(
      (item: any) => item.key === "meta_description",
    )?.value;
    data.options =
      productOption?.nodes.map((item: any) => {
        return {
          key: item?.resourceId,
          name: item?.translatableContent[0]?.key,
          type: item?.translatableContent[0]?.type,
          translatableContent: item?.translatableContent[0]?.value,
          translation: item?.translations[0]?.value,
        };
      }) || [];
    data.metafields =
      productMetafield?.nodes.map((item: any) => {
        return {
          key: item?.resourceId,
          name: item?.translatableContent[0]?.key,
          type: item?.translatableContent[0]?.type,
          translatableContent: item?.translatableContent[0]?.value,
          translation: item?.translations[0]?.value,
        };
      }) || [];

    return data;
  };

  const handleTranslate = async (resourceType: string, key: string, type: string, context: string, index?: number) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: productsData.data.translatableResources.nodes
        .find((item: any) => item?.resourceId === selectProductKey)
        ?.translatableContent.find((item: any) => item.key === key)
        ?.locale,
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(key)) {
        handleInputChange(key, data.response, index)
      }
    } else {
      shopify.toast.show(data.errorMsg)
    }
    setLoadingItems((prev) => prev.filter((item) => item !== key));
  }

  const handleLanguageChange = (language: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedLanguage(language);
    navigate(`/app/manage_translation/product?language=${language}`);
  }

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  }

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = productsData.data.translatableResources.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/product?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = productsData.data.translatableResources.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/product?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/product?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate(`/app/manage_translation?language=${searchTerm}`, {
      state: { key: searchTerm },
    }); // 跳转到 /app/manage_translation
  };

  return (
    <Modal
      id="manage-modal"
      variant="max"
      open={isVisible}
      onHide={onCancel}
    >
      <FullscreenBar
        onAction={onCancel}
      >
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <div style={{ marginLeft: '1rem', flexGrow: 1 }}>
            <Text>
              {t("Products")}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 2, justifyContent: 'center' }}>
            <div
              style={{
                width: "150px",
              }}
            >
              <Select
                label={""}
                options={languageOptions}
                value={selectedLanguage}
                onChange={(value) => handleLanguageChange(value)}
              />
            </div>
            <div
              style={{
                width: "150px",
              }}
            >
              <Select
                label={""}
                options={itemOptions}
                value={selectedItem}
                onChange={(value) => handleItemChange(value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 1, justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              onClick={handleConfirm}
              disabled={confirmLoading || !confirmData.length}
              loading={confirmLoading}
            >
              {t("Save")}
            </Button>
          </div>
        </div>
      </FullscreenBar>
      <Layout
        style={{
          padding: "24px 0",
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><Spin /></div>
        ) : productsData.data.translatableResources.nodes.length ? (
          <>
            <Sider
              style={{
                background: colorBgContainer,
                height: 'calc(100vh - 124px)',
                width: '200px',
                minHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
              }}
            >
              {/* <ItemsScroll
                selectItem={selectProductKey}
                menuData={menuData}
                setSelectItem={setSelectProductKey}
              /> */}
              <Menu
                mode="inline"
                defaultSelectedKeys={[productsData.data.translatableResources.nodes[0]?.resourceId]}
                defaultOpenKeys={["sub1"]}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
                items={menuData}
                selectedKeys={[selectProductKey]}
                onClick={(e: any) => setSelectProductKey(e.key)}
              />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Pagination
                  hasPrevious={hasPrevious}
                  onPrevious={onPrevious}
                  hasNext={hasNext}
                  onNext={onNext}
                />
              </div>
            </Sider>
            <Content
              style={{
                padding: "0 24px",
                height: 'calc(100vh - 112px)', // 64px为FullscreenBar高度
                overflow: 'auto',
                minHeight: '70vh',
              }}
            >
              <Table
                columns={resourceColumns}
                dataSource={resourceData}
                pagination={false}
              />
              <Table
                columns={SEOColumns}
                dataSource={SeoData}
                pagination={false}
              />
              {Array.isArray(optionsData) && optionsData[0] !== undefined && (
                <Table
                  columns={optionsColumns}
                  dataSource={optionsData}
                  pagination={false}
                />
              )}
              {Array.isArray(metafieldsData) &&
                metafieldsData[0] !== undefined && (
                  <Table
                    columns={metafieldsColumns}
                    dataSource={metafieldsData}
                    pagination={false}
                  />
                )}
              {Array.isArray(variantsData) && variantsData[0] !== undefined && (
                <Table
                  loading={variantFetcher.state === "submitting" || variantsLoading}
                  columns={variantsColumns}
                  dataSource={variantsData}
                  pagination={false}
                />
              )}
            </Content>
          </>
        ) : (
          <Result
            title={t("The specified fields were not found in the store.")}
            extra={
              <Button type="primary" onClick={onCancel}>
                {t("Yes")}
              </Button>
            }
          />
        )}
      </Layout>
    </Modal>
  );
};

export default Index;
