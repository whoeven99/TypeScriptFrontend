import {
  Button,
  Card,
  Divider,
  Layout,
  Menu,
  Result,
  Space,
  Spin,
  Table,
  theme,
  Typography,
  message
} from "antd";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { FullscreenBar, Page, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  ConfirmDataType,
  SingleTextTranslate,
  updateManageTranslation,
} from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Modal, SaveBar, TitleBar,useAppBridge  } from "@shopify/app-bridge-react";
import { MenuItem } from "../app.manage_translation/components/itemsScroll";
import { setTableData } from "~/store/modules/languageTableData";
import { setUserConfig } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

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

const modelOptions = [
  {
    label: "OpenAI/GPT-4",
    value: "1",
  },
  {
    label: "Google/Gemini-1.5",
    value: "2",
  },
  {
    label: "DeepL/DeepL-translator",
    value: "3",
  },
  {
    label: "Qwen/Qwen-Max",
    value: "4",
  },
  {
    label: "DeepSeek-ai/DeepSeek-V3",
    value: "5",
  },
  {
    label: "Meta/Llama-3",
    value: "6",
  },
  {
    label: "Google/Google translate",
    value: "7",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  console.log(`${shop} load manage_translation_product`);
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
  } catch (error: any) {
    console.error("Error load product:", error);
    console.error("Error load product:", error?.errors);
    console.error("Error load product:", error?.errors?.graphQLErrors);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const startCursor: any = JSON.parse(formData.get("startCursor") as string);
  const endCursor: any = JSON.parse(formData.get("endCursor") as string);
  const variants: any = JSON.parse(formData.get("variants") as string);
  const confirmData: ConfirmDataType[] = JSON.parse(
    formData.get("confirmData") as string,
  );
  switch (true) {
    case !!startCursor:
      try {
        const response = await admin.graphql(
          `#graphql
            query {     
              translatableResources(resourceType: PRODUCT, last: 20, before: "${startCursor?.cursor}") {
                nodes {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${startCursor?.searchTerm || " "}") {
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
                      translations(locale: "${startCursor?.searchTerm || " "}") {
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
                      translations(locale: "${startCursor?.searchTerm || " "}") {
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
        console.error("Error action startCursor product:", error);
      }
    case !!endCursor:
      try {
        const response = await admin.graphql(
          `#graphql
            query {     
              translatableResources(resourceType: PRODUCT, first: 20, after: "${endCursor?.cursor}") {
                nodes {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${endCursor?.searchTerm || " "}") {
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
                      translations(locale: "${endCursor?.searchTerm || " "}") {
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
                      translations(locale: "${endCursor?.searchTerm || " "}") {
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
        console.error("Error action endCursor product:", error);
      }
    case !!variants:
      try {
        const promise = variants.data.map(async (variant: string) => {
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
                      translations(locale: "${variants?.searchTerm || " "}") {
                        key
                        value
                      }
                    }
                  }
                }`,
          );
          return await response.json();
        });
        const variantsData = await Promise.allSettled(promise);
        return json({ variantsData: variantsData });
      } catch (error) {
        console.error("Error action variants product:", error);
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
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm, products, server, shopName } =
    useLoaderData<typeof loader>();

  const actionData = useActionData<typeof action>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const submit = useSubmit(); // 使用 useSubmit 钩子
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();
  const variantFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  // const [isVisible, setIsVisible] = useState<
  //   boolean | string | { language: string } | { item: string }
  // >(false);

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
    { label: t("Policies"), value: "policy" },
    { label: t("Product images"), value: "productImage" },
    { label: t("Product image alt text"), value: "productImageAlt" },
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ];
  const languagePackOptions = [
    {
      label: t("General"),
      value: "1",
    },
    {
      label: t("Fashion & Apparel"),
      value: "2",
    },
    {
      label: t("Electronics & Technology"),
      value: "3",
    },
    {
      label: t("Home Goods & Daily Essentials"),
      value: "4",
    },
    {
      label: t("Pet Supplies"),
      value: "5",
    },
    {
      label: t("Beauty & Personal Care"),
      value: "6",
    },
    {
      label: t("Furniture & Gardening"),
      value: "7",
    },
    {
      label: t("Hardware & Tools"),
      value: "8",
    },
    {
      label: t("Baby & Toddler Products"),
      value: "9",
    },
    {
      label: t("Toys & Games"),
      value: "10",
    },
    {
      label: t("Luggage & Accessories"),
      value: "11",
    },
    {
      label: t("Health & Nutrition"),
      value: "12",
    },
    {
      label: t("Outdoor & Sports"),
      value: "13",
    },
    {
      label: t("Crafts & Small Goods"),
      value: "14",
    },
    {
      label: t("Home Appliances"),
      value: "15",
    },
    {
      label: t("Automotive Parts"),
      value: "16",
    },
  ];
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("product");
  // const [selectedModel, setSelectedModel] = useState<string>("1");
  // const [selectedLanguagePack, setSelectedLanguagePack] = useState<string>("en");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    products.data.translatableResources.pageInfo.hasPreviousPage || false,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    products.data.translatableResources.pageInfo.hasNextPage || false,
  );
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // setSelectedModel(localStorage.getItem("translateModel") || "1");
    // setSelectedLanguagePack(localStorage.getItem("translateLanguagePack") || "1");
    if (languageTableData.length === 0) {
      languageFetcher.submit(
        {
          language: JSON.stringify(true),
        },
        {
          method: "post",
          action: "/app/manage_translation",
        },
      );
    }
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    if (products) {
      setMenuData(exMenuData(products));
      setIsLoading(false);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 更新 loadingItemsRef 的值
  useEffect(() => {
    loadingItemsRef.current = loadingItems;
  }, [loadingItems]);

  useEffect(() => {
    if (languageTableData) {
      setLanguageOptions(
        languageTableData
          .filter((item: any) => !item.primary)
          .map((item: any) => ({
            label: item.language,
            value: item.locale,
          })),
      );
    }
  }, [languageTableData]);

  useEffect(() => {
    if (products && isManualChangeRef.current) {
      setProductsData(products);
      setMenuData(exMenuData(products));
      setSelectProductKey(
        products.data.translatableResources.nodes[0]?.resourceId,
      );
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      isManualChangeRef.current = false; // 重置
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
    setHasPrevious(
      productsData.data.translatableResources.pageInfo.hasPreviousPage,
    );
    setHasNext(productsData.data.translatableResources.pageInfo.hasNextPage);
    const variants = productsData.data.products.nodes
      .find((item: any) => item.id === selectProductKey)
      ?.options.flatMap((item: any) =>
        item.optionValues.map((opt: any) => opt.id),
      );
    if (variants && Array.isArray(variants)) {
      variantFetcher.submit(
        {
          variants: JSON.stringify({
            data: variants,
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: "/app/manage_translation/product",
        },
      );
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
      setSelectProductKey(
        actionData.nextProducts.data.translatableResources.nodes[0]?.resourceId,
      );
    } else if (actionData && "previousProducts" in actionData) {
      setMenuData(exMenuData(actionData.previousProducts));
      setProductsData(actionData.previousProducts);
      setSelectProductKey(
        actionData.previousProducts.data.translatableResources.nodes[0]
          ?.resourceId,
      );
    } else {
      // 如果不存在 nextProducts，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const successfulItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === true,
      );
      const errorItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === false,
      );

      successfulItem.forEach((item: any) => {
        if (item.data.resourceId.split("/")[3] === "Product") {
          const index = productsData.data.translatableResources.nodes.findIndex(
            (option: any) => option.resourceId === item.data.resourceId,
          );
          if (index !== -1) {
            const product = productsData.data.translatableResources.nodes[
              index
            ].translations.find((option: any) => option.key === item.data.key);
            if (product) {
              product.value = item.data.value;
            } else {
              productsData.data.translatableResources.nodes[
                index
              ].translations.push({
                key: item.data.key,
                value: item.data.value,
              });
            }
          }
        } else if (item.data.resourceId.split("/")[3] === "ProductOption") {
          const index = productsData.data.translatableResources.nodes.findIndex(
            (productOption: any) =>
              productOption.options.nodes.some(
                (option: any) => option.resourceId === item.data.resourceId,
              ),
          );
          if (index !== -1) {
            const productOption = productsData.data.translatableResources.nodes[
              index
            ].options.nodes.find(
              (option: any) => option.resourceId === item.data.resourceId,
            );
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
          const index = productsData.data.translatableResources.nodes.findIndex(
            (productMetafield: any) =>
              productMetafield.metafields.nodes.some(
                (option: any) => option.resourceId === item.data.resourceId,
              ),
          );
          if (index !== -1) {
            const productMetafield =
              productsData.data.translatableResources.nodes[
                index
              ].metafields.nodes.find(
                (option: any) => option.resourceId === item.data.resourceId,
              );
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
      });
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
      setConfirmData([]);
    }
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (languageFetcher.data) {
      if (languageFetcher.data.data) {
        const shopLanguages = languageFetcher.data.data;
        dispatch(
          setTableData(
            shopLanguages.map((language: ShopLocalesType, index: number) => ({
              key: index,
              language: language.name,
              locale: language.locale,
              primary: language.primary,
              published: language.published,
            })),
          ),
        );
        const locale = shopLanguages.find(
          (language: ShopLocalesType) => language.primary === true,
        )?.locale;
        dispatch(setUserConfig({ locale: locale || "" }));
      }
    }
  }, [languageFetcher.data]);

  useEffect(() => {
    if (variantFetcher.data && variantFetcher.data.variantsData) {
      variantFetcher.data.variantsData.forEach((result: any) => {
        if (result.status === "fulfilled") {
          setVariantsData((prev: any) => {
            const newData = result.value.data.translatableResourcesByIds.nodes
              .filter(
                (variant: any) =>
                  variant?.translatableContent[0]?.value &&
                  variant?.translatableContent[0]?.value !== "Default Title",
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

  useEffect(() => {
    if (confirmData.length > 0) {
      shopify.saveBar.show("save-bar");
    } else {
      shopify.saveBar.hide("save-bar");
    }
  }, [confirmData]);

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
            onClick={() => {
              handleTranslate(
                "PRODUCT",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
              );
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
      title: t("Seo"),
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
            onClick={() => {
              handleTranslate(
                "PRODUCT",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
              );
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
            onClick={() => {
              handleTranslate(
                "PRODUCT_OPTION",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
                Number(1 + "" + record?.index),
              );
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
            onClick={() => {
              handleTranslate(
                "METAFIELD",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
                Number(2 + "" + record?.index),
              );
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
      title: t("OptionValue"),
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
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            index={3}
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
            onClick={() => {
              handleTranslate(
                "PRODUCT_OPTION_VALUE",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
                Number(3 + "" + record?.index),
              );
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
    const data = products.data.translatableResources.nodes.map(
      (product: any) => ({
        key: product?.resourceId,
        label: product?.translatableContent.find(
          (item: any) => item.key === "title",
        ).value,
      }),
    );
    return data;
  };

  const handleInputChange = (key: string, value: string, index?: number) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [key]: value, // 更新对应的 key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex(
        (item) => item.resourceId === key || item.key === key,
      );
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
            locale: productsData.data.translatableResources.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.metafields.nodes[count]?.translatableContent[0]?.locale,
            key: "value",
            value: value, // 初始为空字符串
            translatableContentDigest:
              productsData.data.translatableResources.nodes
                .find((item: any) => item?.resourceId === selectProductKey)
                ?.metafields.nodes.find((item: any) => item.resourceId === key)
                ?.translatableContent[0]?.digest,
            target: searchTerm || "",
          };
          return [...prevData, newItem]; // 将新数据添加到 confirmData 中
        } else if (index && index.toString()[0] === "1") {
          const count: number = Number(index.toString().slice(1));
          const newItem = {
            resourceId: productsData.data.translatableResources.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.options.nodes[count]?.resourceId,
            locale: productsData.data.translatableResources.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.options.nodes[count]?.translatableContent[0]?.locale,
            key: "name",
            value: value, // 初始为空字符串
            translatableContentDigest:
              productsData.data.translatableResources.nodes
                .find((item: any) => item?.resourceId === selectProductKey)
                ?.options.nodes.find((item: any) => item.resourceId === key)
                ?.translatableContent[0]?.digest,
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
            translatableContentDigest:
              productsData.data.translatableResources.nodes
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

  const transBeforeData = ({ products }: { products: any }) => {
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
    const productOption = product.options;
    const productMetafield = product.metafields;
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
    };
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

  const handleTranslate = async (
    resourceType: string,
    key: string,
    type: string,
    context: string,
    index?: number,
  ) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    console.log({
      shopName: shopName,
      source: productsData.data.translatableResources.nodes
        .find((item: any) => item?.resourceId === selectProductKey)
        ?.translatableContent.find((item: any) => item.key === key)?.locale,
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: server || "",
    });

    const data = await SingleTextTranslate({
      shopName: shopName,
      source: productsData.data.translatableResources.nodes
        .find((item: any) => item?.resourceId === selectProductKey)
        ?.translatableContent.find((item: any) => item.key === key)?.locale,
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(key)) {
        handleInputChange(key, data.response, index);
        shopify.toast.show(t("Translated successfully"));
      }
    } else {
      shopify.toast.show(data.errorMsg);
    }
    setLoadingItems((prev) => prev.filter((item) => item !== key));
  };

  const handleLanguageChange = (language: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setIsLoading(true);
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/product?language=${language}`);
    }
  };

  const handleItemChange = (item: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setIsLoading(true);
      isManualChangeRef.current = true;
      setSelectedItem(item);
      navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
    }
  };

  // const handleModelChange = (model: string) => {
  //   setSelectedModel(model);
  //   localStorage.setItem("translateModel", model);
  // }

  // const handleLanguagePackChange = (languagePack: string) => {
  //   setSelectedLanguagePack(languagePack);
  //   localStorage.setItem("translateLanguagePack", languagePack);
  // }

  
  // 防抖函数
  const debounce = (func: Function, delay: number) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        func(...args);
      }, delay);
    };
  }
  // 节流函数
  const throttle = (func: Function, delay: number) => {
    let lastTime = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastTime >= delay) {
        func(...args);
        lastTime = now;
      }
    };
  }
  // 下一页请求函数
  const throttleNextSubmit = useMemo(() => {
    return throttle(async () => {
      submit(
        {
          endCursor: JSON.stringify({
            cursor: productsData.data.translatableResources.pageInfo.endCursor,
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/product?language=${searchTerm}`,
        },
      ); // 提交表单请求
    }, 500)
  }, [productData, searchTerm])
  // 上一页请求函数
  const throttleBackSubmit = useMemo(() => {
    return throttle(() => {
      submit(
        {
          startCursor: JSON.stringify({
            cursor: productsData.data.translatableResources.pageInfo.startCursor,
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/product?language=${searchTerm}`,
        }
      );
    }, 500);
  }, [productsData.data.translatableResources.pageInfo.endCursor, searchTerm]); // ✅ 必须写依赖

  const throttleMenuChange = useMemo(() => {
    return throttle((key: string) => {
      setSelectProductKey(key);
    }, 300);
  }, [productsData, searchTerm]);

  const clickNextTimestampsRef = useRef<number[]>([]); // 用于存储点击时间戳
  const clickBackTimestampsRef = useRef<number[]>([]); // 用于存储点击时间戳

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      throttleMenuChange(key);
    }
  };

  const onPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      const now = Date.now();
      clickBackTimestampsRef.current.push(now);
      const recent = clickBackTimestampsRef.current.filter((ts) => now - ts < 2000);
      clickBackTimestampsRef.current = recent;
      if (recent.length >= 5) {
        shopify.toast.show(t("You clicked too frequently. Please try again later."));
        return;  
      }
      throttleBackSubmit();
    }
  };

  const onNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      const now = Date.now();
      clickNextTimestampsRef.current.push(now);
      const recent = clickNextTimestampsRef.current.filter((ts) => now - ts < 2000);
      clickNextTimestampsRef.current = recent; 
      if (recent.length >= 5) {
        shopify.toast.show(t("You clicked too frequently. Please try again later."));
        return;
      }
      throttleNextSubmit();
    }
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/product?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    const data = transBeforeData({
      products: productsData,
    });
    setProductData(data);
    setConfirmData([]);
  };

  // const handleLeaveItem = (
  //   key: string | boolean | { language: string } | { item: string },
  // ) => {
  //   setIsVisible(false);
  //   if (typeof key === "string" && key !== "previous" && key !== "next") {
  //     setSelectProductKey(key);
  //   } else if (key === "previous") {
  //     // 向前翻页
  //     submit(
  //       {
  //         startCursor: JSON.stringify({
  //           cursor:
  //             productsData.data.translatableResources.pageInfo.startCursor,
  //           searchTerm: searchTerm,
  //         }),
  //       },
  //       {
  //         method: "post",
  //         action: `/app/manage_translation/product?language=${searchTerm}`,
  //       },
  //     ); // 提交表单请求
  //   } else if (key === "next") {
  //     // 向后翻页
  //     submit(
  //       {
  //         endCursor: JSON.stringify({
  //           cursor: productsData.data.translatableResources.pageInfo.endCursor,
  //           searchTerm: searchTerm,
  //         }),
  //       },
  //       {
  //         method: "post",
  //         action: `/app/manage_translation/product?language=${searchTerm}`,
  //       },
  //     ); // 提交表单请求
  //   } else if (typeof key === "object" && "language" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedLanguage(key.language);
  //     navigate(`/app/manage_translation/product?language=${key.language}`);
  //   } else if (typeof key === "object" && "item" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedItem(key.item);
  //     navigate(`/app/manage_translation/${key.item}?language=${searchTerm}`);
  //   } else {
  //     navigate(`/app/manage_translation?language=${searchTerm}`, {
  //       state: { key: searchTerm },
  //     }); // 跳转到 /app/manage_translation
  //   }
  // };

  const onCancel = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      navigate(`/app/manage_translation?language=${searchTerm}`, {
        state: { key: searchTerm },
      }); // 跳转到 /app/manage_translation
    }
  };

  return (
    <Page
      title={t("Products")}
      fullWidth={true}
      // primaryAction={{
      //   content: t("Save"),
      //   loading: confirmFetcher.state === "submitting",
      //   disabled:
      //     confirmData.length == 0 || confirmFetcher.state === "submitting",
      //   onAction: handleConfirm,
      // }}
      // secondaryActions={[
      //   {
      //     content: t("Cancel"),
      //     loading: confirmFetcher.state === "submitting",
      //     disabled:
      //       confirmData.length == 0 || confirmFetcher.state === "submitting",
      //     onAction: handleDiscard,
      //   },
      // ]}
      backAction={{
        onAction: onCancel,
      }}
    >
      <SaveBar id="save-bar">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={confirmFetcher.state === "submitting" && ""}
        >
          {t("Save")}
        </button>
        <button onClick={handleDiscard}>{t("Cancel")}</button>
      </SaveBar>
      <Layout
        style={{
          overflow: "auto",
          backgroundColor: "var(--p-color-bg)",
          height: "calc(100vh - 104px)",
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Spin />
          </div>
        ) : productsData.data.translatableResources.nodes.length ? (
          <>
            {!isMobile && (
              <Sider
                style={{
                  height: "100%",
                  minHeight: "70vh",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "auto",
                  backgroundColor: "var(--p-color-bg)",
                }}
              >
                {/* <ItemsScroll
                selectItem={selectProductKey}
                menuData={menuData}
                setSelectItem={setSelectProductKey}
              /> */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[
                      productsData.data.translatableResources.nodes[0]
                        ?.resourceId,
                    ]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                      backgroundColor: "var(--p-color-bg)",
                    }}
                    items={menuData}
                    selectedKeys={[selectProductKey]}
                    onClick={(e: any) => handleMenuChange(e.key)}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Pagination
                      hasPrevious={hasPrevious}
                      onPrevious={onPrevious}
                      hasNext={hasNext}
                      onNext={onNext}
                    />
                  </div>
                </div>
              </Sider>
            )}
            <Content
              style={{
                paddingLeft: isMobile ? "16px" : "24px",
              }}
            >
              {isMobile ? (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {
                        menuData!.find(
                          (item: any) => item.key === selectProductKey,
                        )?.label
                      }
                    </Title>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexGrow: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "100px",
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
                          width: "100px",
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
                  </div>
                  <Card title={t("Resource")}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {resourceData.map((item: any, index: number) => {
                        return (
                          <Space
                            key={index}
                            direction="vertical"
                            size="small"
                            style={{ width: "100%" }}
                          >
                            <Text
                              strong
                              style={{
                                fontSize: "16px",
                              }}
                            >
                              {t(item.resource)}
                            </Text>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              <Text>{t("Default Language")}</Text>
                              <ManageTableInput record={item} />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              <Text>{t("Translated")}</Text>
                              <ManageTableInput
                                translatedValues={translatedValues}
                                setTranslatedValues={setTranslatedValues}
                                handleInputChange={handleInputChange}
                                isRtl={searchTerm === "ar"}
                                record={item}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <Button
                                onClick={() => {
                                  handleTranslate(
                                    "PRODUCT",
                                    item?.key || "",
                                    item?.type || "",
                                    item?.default_language || "",
                                  );
                                }}
                                loading={loadingItems.includes(item?.key || "")}
                              >
                                {t("Translate")}
                              </Button>
                            </div>
                            <Divider
                              style={{
                                margin: "8px 0",
                              }}
                            />
                          </Space>
                        );
                      })}
                    </Space>
                  </Card>
                  <Card title={t("Seo")}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {SeoData.map((item: any, index: number) => {
                        return (
                          <Space
                            key={index}
                            direction="vertical"
                            size="small"
                            style={{ width: "100%" }}
                          >
                            <Text
                              strong
                              style={{
                                fontSize: "16px",
                              }}
                            >
                              {t(item.resource)}
                            </Text>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              <Text>{t("Default Language")}</Text>
                              <ManageTableInput record={item} />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              <Text>{t("Translated")}</Text>
                              <ManageTableInput
                                translatedValues={translatedValues}
                                setTranslatedValues={setTranslatedValues}
                                handleInputChange={handleInputChange}
                                isRtl={searchTerm === "ar"}
                                record={item}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <Button
                                onClick={() => {
                                  handleTranslate(
                                    "PRODUCT",
                                    item?.key || "",
                                    item?.type || "",
                                    item?.default_language || "",
                                  );
                                }}
                                loading={loadingItems.includes(item?.key || "")}
                              >
                                {t("Translate")}
                              </Button>
                            </div>
                            <Divider
                              style={{
                                margin: "8px 0",
                              }}
                            />
                          </Space>
                        );
                      })}
                    </Space>
                  </Card>
                  {Array.isArray(optionsData) &&
                    optionsData[0] !== undefined && (
                      <Card title={t("Product Options")}>
                        <Space direction="vertical" style={{ width: "100%" }}>
                          {optionsData.map((item: any, index: number) => {
                            return (
                              <Space
                                key={index}
                                direction="vertical"
                                size="small"
                                style={{ width: "100%" }}
                              >
                                <Text
                                  strong
                                  style={{
                                    fontSize: "16px",
                                  }}
                                >
                                  {t(item.resource)}
                                </Text>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  <Text>{t("Default Language")}</Text>
                                  <ManageTableInput record={item} />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  <Text>{t("Translated")}</Text>
                                  <ManageTableInput
                                    translatedValues={translatedValues}
                                    setTranslatedValues={setTranslatedValues}
                                    handleInputChange={handleInputChange}
                                    isRtl={searchTerm === "ar"}
                                    record={item}
                                  />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <Button
                                    onClick={() => {
                                      handleTranslate(
                                        "PRODUCT_OPTION",
                                        item?.key || "",
                                        item?.type || "",
                                        item?.default_language || "",
                                        Number(1 + "" + item?.index),
                                      );
                                    }}
                                    loading={loadingItems.includes(
                                      item?.key || "",
                                    )}
                                  >
                                    {t("Translate")}
                                  </Button>
                                </div>
                                <Divider
                                  style={{
                                    margin: "8px 0",
                                  }}
                                />
                              </Space>
                            );
                          })}
                        </Space>
                      </Card>
                    )}
                  {Array.isArray(metafieldsData) &&
                    metafieldsData[0] !== undefined && (
                      <Card title={t("Metafield")}>
                        <Space direction="vertical" style={{ width: "100%" }}>
                          {metafieldsData.map((item: any, index: number) => {
                            return (
                              <Space
                                key={index}
                                direction="vertical"
                                size="small"
                                style={{ width: "100%" }}
                              >
                                <Text
                                  strong
                                  style={{
                                    fontSize: "16px",
                                  }}
                                >
                                  {t(item.resource)}
                                </Text>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  <Text>{t("Default Language")}</Text>
                                  <ManageTableInput record={item} />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  <Text>{t("Translated")}</Text>
                                  <ManageTableInput
                                    translatedValues={translatedValues}
                                    setTranslatedValues={setTranslatedValues}
                                    handleInputChange={handleInputChange}
                                    isRtl={searchTerm === "ar"}
                                    record={item}
                                  />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <Button
                                    onClick={() => {
                                      handleTranslate(
                                        "METAFIELD",
                                        item?.key || "",
                                        item?.type || "",
                                        item?.default_language || "",
                                        Number(2 + "" + item?.index),
                                      );
                                    }}
                                    loading={loadingItems.includes(
                                      item?.key || "",
                                    )}
                                  >
                                    {t("Translate")}
                                  </Button>
                                </div>
                                <Divider
                                  style={{
                                    margin: "8px 0",
                                  }}
                                />
                              </Space>
                            );
                          })}
                        </Space>
                      </Card>
                    )}
                  {Array.isArray(variantsData) &&
                    variantsData[0] !== undefined && (
                      <Card title={t("OptionValue")}>
                        <Space direction="vertical" style={{ width: "100%" }}>
                          {variantsData.map((item: any, index: number) => {
                            return (
                              <Space
                                key={index}
                                direction="vertical"
                                size="small"
                                style={{ width: "100%" }}
                              >
                                <Text
                                  strong
                                  style={{
                                    fontSize: "16px",
                                  }}
                                >
                                  {t(item.resource)}
                                </Text>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  <Text>{t("Default Language")}</Text>
                                  <ManageTableInput record={item} />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  <Text>{t("Translated")}</Text>
                                  <ManageTableInput
                                    translatedValues={translatedValues}
                                    setTranslatedValues={setTranslatedValues}
                                    handleInputChange={handleInputChange}
                                    isRtl={searchTerm === "ar"}
                                    record={item}
                                  />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <Button
                                    onClick={() => {
                                      handleTranslate(
                                        "PRODUCT_OPTION_VALUE",
                                        item?.key || "",
                                        item?.type || "",
                                        item?.default_language || "",
                                        Number(3 + "" + item?.index),
                                      );
                                    }}
                                    loading={loadingItems.includes(
                                      item?.key || "",
                                    )}
                                  >
                                    {t("Translate")}
                                  </Button>
                                </div>
                                <Divider
                                  style={{
                                    margin: "8px 0",
                                  }}
                                />
                              </Space>
                            );
                          })}
                        </Space>
                      </Card>
                    )}
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[
                      productsData.data.translatableResources.nodes[0]
                        ?.resourceId,
                    ]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                    }}
                    items={menuData}
                    selectedKeys={[selectProductKey]}
                    onClick={(e) => handleMenuChange(e.key)}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Pagination
                      hasPrevious={hasPrevious}
                      onPrevious={onPrevious}
                      hasNext={hasNext}
                      onNext={onNext}
                    />
                  </div>
                </Space>
              ) : (
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {
                        menuData!.find(
                          (item: any) => item.key === selectProductKey,
                        )?.label
                      }
                    </Title>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexGrow: 2,
                        justifyContent: "flex-end",
                      }}
                    >
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
                  </div>
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
                  {Array.isArray(optionsData) &&
                    optionsData[0] !== undefined && (
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
                  {Array.isArray(variantsData) &&
                    variantsData[0] !== undefined && (
                      <Table
                        loading={
                          variantFetcher.state === "submitting" ||
                          variantsLoading
                        }
                        columns={variantsColumns}
                        dataSource={variantsData}
                        pagination={false}
                      />
                    )}
                </Space>
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
      {/* <Modal
        variant={"base"}
        open={!!isVisible}
        onHide={() => setIsVisible(false)}
      >
        <div
          style={{
            padding: "16px",
          }}
        >
          <Text>
            {t("If you leave this page, any unsaved changes will be lost.")}
          </Text>
        </div>
        <TitleBar title={t("Unsaved changes")}>
          <button
            variant="primary"
            tone="critical"
            onClick={() => handleLeaveItem(isVisible)}
          >
            {t("Leave Anyway")}
          </button>
          <button onClick={() => setIsVisible(false)}>
            {t("Stay on Page")}
          </button>
        </TitleBar>
      </Modal> */}
    </Page>
  );
};

export default Index;
