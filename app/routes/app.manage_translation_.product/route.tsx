import {
  Button,
  Card,
  Divider,
  Input,
  Layout,
  Menu,
  Result,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { useEffect, useRef, useState, useMemo } from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate
import { Page, Pagination, Select } from "@shopify/polaris";
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
import { SaveBar } from "@shopify/app-bridge-react";
import { MenuItem } from "../app.manage_translation/components/itemsScroll";
import { setTableData } from "~/store/modules/languageTableData";
import { setLocale } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";
import useReport from "scripts/eventReport";
import { globalStore } from "~/globalStore";
import { SearchOutlined } from "@ant-design/icons";
import { getItemOptions } from "../app.manage_translation/route";
import SideMenu from "~/components/sideMenu/sideMenu";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

type TableDataType = {
  key: string;
  index: number;
  resource: string;
  type: string | undefined;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return json({
    searchTerm,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const formData = await request.formData();
  const startCursor: any = JSON.parse(formData.get("startCursor") as string);
  const endCursor: any = JSON.parse(formData.get("endCursor") as string);
  const productId: any = formData.get("productId") as string;
  const variants: any = JSON.parse(formData.get("variants") as string);
  const confirmData: ConfirmDataType[] = JSON.parse(
    formData.get("confirmData") as string,
  );
  switch (true) {
    case !!startCursor:
      try {
        const response = await admin.graphql(
          `#graphql
            query products($startCursor: String, $query: String) {     
              products(last: 20 ,before: $startCursor, query: $query, reverse: true) {
                nodes {
                  id
                  title
                  options(first: 20) {
                    optionValues {
                      id
                    }
                  }
                }
                pageInfo{
                  endCursor
                  startCursor
                  hasNextPage
                  hasPreviousPage
                }
              }
          }`,
          {
            variables: {
              startCursor: startCursor.cursor ? startCursor.cursor : undefined,
              query: startCursor.query ? startCursor.query : "",
            },
          },
        );

        const data = await response.json();

        return json({
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: {
            data: data.data?.products?.nodes || [],
            pageInfo: data.data?.products?.pageInfo || {
              endCursor: "",
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: "",
            },
          },
        });
      } catch (error) {
        console.error("Error action startCursor product:", error);
        return json({
          success: false,
          errorCode: 0,
          errorMsg: "",
          response: {
            data: [],
            pageInfo: {
              endCursor: "",
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: "",
            },
          },
        });
      }
    case !!endCursor:
      try {
        const response = await admin.graphql(
          `#graphql
            query products($endCursor: String, $query: String) {     
              products(first: 20 ,after: $endCursor, query: $query, reverse: true) {
                nodes {
                  id
                  title
                  options(first: 20) {
                    optionValues {
                      id
                    }
                  }
                }
                pageInfo{
                  endCursor
                  startCursor
                  hasNextPage
                  hasPreviousPage
                }
              }
          }`,
          {
            variables: {
              endCursor: endCursor.cursor ? endCursor.cursor : undefined,
              query: endCursor.query ? endCursor.query : "",
            },
          },
        );

        const data = await response.json();

        return json({
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: {
            data: data.data?.products?.nodes || [],
            pageInfo: data.data?.products?.pageInfo || {
              endCursor: "",
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: "",
            },
          },
        });
      } catch (error) {
        console.error("Error action endCursor product:", error);
        return json({
          success: false,
          errorCode: 0,
          errorMsg: "",
          response: {
            data: [],
            pageInfo: {
              endCursor: "",
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: "",
            },
          },
        });
      }
    case !!productId:
      try {
        const response = await admin.graphql(
          `#graphql
            query {     
              translatableResource(resourceId: "${productId}") {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${searchTerm}") {
                    value
                    key
                  }
                  options: nestedTranslatableResources(first: 20, resourceType: PRODUCT_OPTION) {
                    nodes {
                      resourceId
                      translatableContent {
                        digest
                        key
                        locale
                        type
                        value
                      }
                      translations(locale: "${searchTerm}") {
                        key
                        value
                      }
                    }
                  }
                  metafields: nestedTranslatableResources(first: 20, resourceType: METAFIELD) {
                    nodes {
                      resourceId
                      translatableContent {
                        digest
                        key
                        locale
                        type
                        value
                      }
                      translations(locale: "${searchTerm}") {
                        key
                        value
                      }
                    }
                  }
            }
          }`,
        );

        const data = await response.json();

        return json({
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: data.data?.translatableResource,
        });
      } catch (error) {
        console.error("Error action productId product:", error);
        return json({
          success: false,
          errorCode: 0,
          errorMsg: "",
          response: [],
        });
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

  const { searchTerm } = useLoaderData<typeof loader>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);
  const timeoutIdRef = useRef<any>();

  const fetcher = useFetcher<any>();
  const dataFetcher = useFetcher<any>();
  const productFetcher = useFetcher<any>();
  const variantFetcher = useFetcher<any>();

  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);

  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [productsData, setProductsData] = useState<any>([]);
  const [productBaseData, setProductBaseData] = useState<any[]>([]);
  const [productSeoData, setProductSeoData] = useState<any[]>([]);
  const [optionsData, setOptionsData] = useState<any[]>([]);
  const [metafieldsData, setMetafieldsData] = useState<any[]>([]);
  const [variantsData, setVariantsData] = useState<any[]>([]);

  const [selectProductKey, setSelectProductKey] = useState<string>("");
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [variantsLoading, setVariantsLoading] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [successTranslatedKey, setSuccessTranslatedKey] = useState<string[]>(
    [],
  );
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const [queryText, setQueryText] = useState<string>("");
  const { reportClick } = useReport();
  const itemOptions = getItemOptions(t);
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("product");
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [startCursor, setStartCursor] = useState<string>("");
  const [endCursor, setEndCursor] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
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
    dataFetcher.submit(
      {
        endCursor: JSON.stringify({
          cursor: "",
          searchTerm: searchTerm,
          query: queryText,
        }),
      },
      {
        method: "post",
        action: `/app/manage_translation/product?language=${searchTerm}`,
      },
    );
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在翻译管理-产品页面`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (dataFetcher.data) {
      if (dataFetcher.data.success) {
        const menuData = dataFetcher.data.response.data.map((item: any) => {
          return {
            key: item.id,
            label: item.title,
          };
        });
        setMenuData(menuData);
        setSelectProductKey(dataFetcher.data.response.data[0]?.id);
        setHasPrevious(dataFetcher.data.response.pageInfo.hasPreviousPage);
        setHasNext(dataFetcher.data.response.pageInfo.hasNextPage);
        setStartCursor(dataFetcher.data.response.pageInfo.startCursor);
        setEndCursor(dataFetcher.data.response.pageInfo.endCursor);
        setProductsData(dataFetcher.data.response.data);
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    }
  }, [dataFetcher.data]);

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
    setProductBaseData([]);
    setProductSeoData([]);
    setOptionsData([]);
    setMetafieldsData([]);
    setVariantsData([]);
    setLoadingItems([]);
    setConfirmData([]);
    setSuccessTranslatedKey([]);
    setTranslatedValues({});
    productFetcher.submit(
      {
        productId: selectProductKey,
      },
      {
        method: "POST",
      },
    );
    const variants = productsData
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
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === false,
      );
      const successfulItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === true,
      );
      successfulItem.forEach((item: any) => {
        const key = item?.data?.key || "";
        const resourceId = item?.data?.resourceId || "";
        const targetValue = item?.data?.value || "";

        switch (true) {
          case ["title", "body_html", "product_type"].includes(key):
            setProductBaseData(
              productBaseData.map((item) =>
                item.key === key ? { ...item, translated: targetValue } : item,
              ),
            );
            break;
          case ["handle", "meta_title", "meta_description"].includes(key):
            setProductSeoData(
              productSeoData.map((item) =>
                item.key === key ? { ...item, translated: targetValue } : item,
              ),
            );
            break;
          case !!optionsData.find(
            (item: any) => item?.resourceId == resourceId,
          ):
            setOptionsData(
              optionsData.map((item) =>
                item.resourceId === resourceId
                  ? { ...item, translated: targetValue }
                  : item,
              ),
            );
            break;
          case !!metafieldsData.find(
            (item: any) => item?.resourceId == resourceId,
          ):
            setMetafieldsData(
              metafieldsData.map((item) =>
                item.resourceId === resourceId
                  ? { ...item, translated: targetValue }
                  : item,
              ),
            );
            break;
          case !!variantsData.find(
            (item: any) => item?.resourceId == resourceId,
          ):
            setVariantsData(
              variantsData.map((item) =>
                item.resourceId === resourceId
                  ? { ...item, translated: targetValue }
                  : item,
              ),
            );
            break;
          default:
            console.log(6);

            break;
        }
      });
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
        fetcher.submit(
          {
            log: `${globalStore?.shop} 翻译管理-产品页面修改数据保存成功`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
      setConfirmData([]);
      setSuccessTranslatedKey([]);
    }
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (languageFetcher.data) {
      if (languageFetcher.data.data) {
        const shopLanguages = languageFetcher.data.data;
        dispatch(
          setTableData(
            shopLanguages.map((language: ShopLocalesType, index: number) => ({
              key: language.locale,
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
        dispatch(setLocale({ locale: locale || "" }));
      }
    }
  }, [languageFetcher.data]);

  useEffect(() => {
    if (productFetcher.data) {
      if (productFetcher.data.success) {
        setProductBaseData(
          [
            {
              key: `title_${productFetcher.data.response?.resourceId}_1`,
              resourceId: productFetcher.data.response?.resourceId,
              shopifyKey: "title",
              index: 4,
              resource: t("Title"),
              locale:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "title",
                )?.locale || "",
              digest:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "title",
                )?.digest || "",
              type:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "title",
                )?.type || "",
              default_language:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "title",
                )?.value || "",
              translated: productFetcher.data.response?.translations?.find(
                (item: any) => item.key == "title",
              )?.value,
            },
            {
              key: `body_html_${productFetcher.data.response?.resourceId}_1`,
              resourceId: productFetcher.data.response?.resourceId,
              shopifyKey: "body_html",
              index: 4,
              resource: t("Description"),
              locale:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "body_html",
                )?.locale || "",
              digest:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "body_html",
                )?.digest || "",
              type:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "body_html",
                )?.type || "",
              default_language:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "body_html",
                )?.value || "",
              translated: productFetcher.data.response?.translations?.find(
                (item: any) => item.key == "body_html",
              )?.value,
            },
            {
              key: `product_type_${productFetcher.data.response?.resourceId}_1`,
              resourceId: productFetcher.data.response?.resourceId,
              shopifyKey: "product_type",
              index: 4,
              resource: t("ProductType"),
              locale:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "product_type",
                )?.locale || "",
              digest:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "product_type",
                )?.digest || "",
              type:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "product_type",
                )?.type || "",
              default_language:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "product_type",
                )?.value || "",
              translated: productFetcher.data.response?.translations?.find(
                (item: any) => item.key == "product_type",
              )?.value,
            },
          ].filter((item) => item.default_language),
        );
        setProductSeoData(
          [
            {
              key: `handle_${productFetcher.data.response?.resourceId}_1`,
              resourceId: productFetcher.data.response?.resourceId,
              shopifyKey: "handle",
              index: 4,
              resource: t("URL handle"),
              locale:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "handle",
                )?.locale || "",
              digest:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "handle",
                )?.digest || "",
              type:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "handle",
                )?.type || "",
              default_language:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "handle",
                )?.value || "",
              translated:
                productFetcher.data.response?.translations?.find(
                  (item: any) => item.key == "handle",
                )?.value || "",
            },
            {
              key: `meta_title_${productFetcher.data.response?.resourceId}_2`,
              resourceId: productFetcher.data.response?.resourceId,
              shopifyKey: "meta_title",
              index: 4,
              resource: t("Meta title"),
              locale:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_title",
                )?.locale || "",
              digest:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_title",
                )?.digest || "",
              type:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_title",
                )?.type || "",
              default_language:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_title",
                )?.value || "",
              translated:
                productFetcher.data.response?.translations?.find(
                  (item: any) => item.key == "meta_title",
                )?.value || "",
            },
            {
              key: `meta_description_${productFetcher.data.response?.resourceId}_3`,
              resourceId: productFetcher.data.response?.resourceId,
              shopifyKey: "meta_description",
              index: 4,
              resource: t("Meta description"),
              locale:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_description",
                )?.locale || "",
              digest:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_description",
                )?.digest || "",
              type:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_description",
                )?.type || "",
              default_language:
                productFetcher.data.response?.translatableContent?.find(
                  (item: any) => item.key == "meta_description",
                )?.value || "",
              translated:
                productFetcher.data.response?.translations?.find(
                  (item: any) => item.key == "meta_description",
                )?.value || "",
            },
          ].filter((item) => item.default_language),
        );
        const optionsData = productFetcher.data.response?.options?.nodes
          ?.filter(
            (item: any) =>
              item?.translatableContent[0]?.value !== "Title" &&
              item?.translatableContent[0]?.value,
          )
          ?.map((option: any, index: number) => {
            return {
              key: `${option?.translatableContent[0]?.key}_${option?.resourceId}_${index}`,
              resourceId: option?.resourceId,
              shopifyKey: option?.translatableContent[0]?.key,
              index: index,
              locale: option?.translatableContent[0]?.locale,
              digest: option?.translatableContent[0]?.digest,
              resource: t(option?.translatableContent[0]?.value),
              type: option?.translatableContent[0]?.type,
              default_language: option?.translatableContent[0]?.value,
              translated: option?.translations[0]?.value,
            };
          });
        if (optionsData) setOptionsData(optionsData);
        const metafieldsData =
          productFetcher.data.response?.metafields?.nodes?.map(
            (metafield: any, index: number) => {
              return {
                key: `${metafield?.translatableContent[0]?.key}_${metafield?.resourceId}_${index}`,
                resourceId: metafield?.resourceId,
                shopifyKey: metafield?.translatableContent[0]?.key,
                index: index,
                locale: metafield?.translatableContent[0]?.locale,
                digest: metafield?.translatableContent[0]?.digest,
                resource: t(metafield?.translatableContent[0]?.key),
                type: metafield?.translatableContent[0]?.type,
                default_language: metafield?.translatableContent[0]?.value,
                translated: metafield?.translations[0]?.value,
              };
            },
          );
        if (metafieldsData) setMetafieldsData(metafieldsData);
      }
    }
  }, [productFetcher.data]);

  useEffect(() => {
    if (variantFetcher.data && variantFetcher.data.variantsData) {
      const variantsData = variantFetcher.data.variantsData.flatMap(
        (result: any, index: number) => {
          if (result.status === "fulfilled") {
            return result.value.data.translatableResourcesByIds.nodes
              .filter(
                (variant: any) =>
                  variant?.translatableContent[0]?.value &&
                  variant?.translatableContent[0]?.value !== "Default Title",
              )
              .map((variant: any) => ({
                key: `${variant?.translatableContent[0]?.key}_${variant?.resourceId}_${index}`,
                resourceId: variant?.resourceId,
                shopifyKey: variant?.translatableContent[0]?.key,
                index,
                resource: t(variant?.translatableContent[0]?.key),
                type: variant?.translatableContent[0]?.type,
                locale: variant?.translatableContent[0]?.locale,
                digest: variant?.translatableContent[0]?.digest,
                default_language: variant?.translatableContent[0]?.value,
                translated: variant?.translations[0]?.value,
              }));
          } else {
            console.error("Request failed:", result.reason);
          }
          return []; // 记得返回空数组避免 undefined
        },
      );

      if (variantsData) setVariantsData(variantsData);
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

  const productBaseDataColumns = [
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
        return (
          <ManageTableInput
            record={record}
            isHtml={record?.key == "body_html"}
          />
        );
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
            isHtml={record?.key == "body_html"}
            isSuccess={successTranslatedKey?.includes(record?.key as string)}
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
              handleTranslate({
                resourceType: "PRODUCT",
                record,
                handleInputChange,
              });
              reportClick("editor_list_translate");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const productSeoDataColumns = [
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
            isSuccess={successTranslatedKey?.includes(record?.key as string)}
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
              handleTranslate({
                resourceType: "PRODUCT",
                record,
                handleInputChange,
              });
              reportClick("editor_list_translate");
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
            isSuccess={successTranslatedKey?.includes(record?.key as string)}
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
              handleTranslate({
                resourceType: "PRODUCT_OPTION",
                record,
                handleInputChange,
              });
              reportClick("editor_list_translate");
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
            isSuccess={successTranslatedKey?.includes(record?.key as string)}
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
              handleTranslate({
                resourceType: "METAFIELD",
                record,
                handleInputChange,
              });
              reportClick("editor_list_translate");
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
            isSuccess={successTranslatedKey?.includes(record?.key as string)}
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
              handleTranslate({
                resourceType: "PRODUCT_OPTION_VALUE",
                record,
                handleInputChange,
              });
              reportClick("editor_list_translate");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const handleInputChange = (record: any, value: string) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [record?.key]: value, // 更新对应的 key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex(
        (item) => item.key === record?.key,
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
        const newItem = {
          resourceId: record?.resourceId,
          locale: globalStore?.source || "",
          key: record?.shopifyKey,
          value: value, // 初始为空字符串
          translatableContentDigest: record?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  // const handleProductSeoInputChange = (record: any, value: string) => {
  //   setTranslatedValues((prev) => ({
  //     ...prev,
  //     [record?.key]: value, // 更新对应的 key
  //   }));
  //   setConfirmData((prevData) => {
  //     const existingItemIndex = prevData.findIndex(
  //       (item) => item.key === record?.key,
  //     );
  //     if (existingItemIndex !== -1) {
  //       // 如果 key 存在，更新其对应的 value
  //       const updatedConfirmData = [...prevData];
  //       updatedConfirmData[existingItemIndex] = {
  //         ...updatedConfirmData[existingItemIndex],
  //         value: value,
  //       };
  //       return updatedConfirmData;
  //     } else {
  //       const newItem = {
  //         resourceId: record?.resourceId,
  //         locale: globalStore?.source || "",
  //         key: record?.shopifyKey,
  //         value: value, // 初始为空字符串
  //         translatableContentDigest: record?.digest,
  //         target: searchTerm || "",
  //       };

  //       return [...prevData, newItem]; // 将新数据添加到 confirmData 中
  //     }
  //   });
  // };

  // const handleOptionsInputChange = (key: string, value: string) => {
  //   setTranslatedValues((prev) => ({
  //     ...prev,
  //     [key]: value, // 更新对应的 key
  //   }));
  //   setConfirmData((prevData) => {
  //     const existingItemIndex = prevData.findIndex(
  //       (item) => item.resourceId === key || item.key === key,
  //     );
  //     if (existingItemIndex !== -1) {
  //       // 如果 key 存在，更新其对应的 value
  //       const updatedConfirmData = [...prevData];
  //       updatedConfirmData[existingItemIndex] = {
  //         ...updatedConfirmData[existingItemIndex],
  //         value: value,
  //       };
  //       return updatedConfirmData;
  //     } else {
  //       const newItem = {
  //         resourceId: optionsData?.find((item: any) => item?.key === key)
  //           ?.resourceId,
  //         locale: globalStore?.source || "",
  //         key: key,
  //         value: value, // 初始为空字符串
  //         translatableContentDigest: optionsData?.find(
  //           (item: any) => item?.key === key,
  //         )?.digest,
  //         target: searchTerm || "",
  //       };

  //       return [...prevData, newItem]; // 将新数据添加到 confirmData 中
  //     }
  //   });
  // };

  // const handleMetafieldsInputChange = (key: string, value: string) => {
  //   setTranslatedValues((prev) => ({
  //     ...prev,
  //     [key]: value, // 更新对应的 key
  //   }));
  //   setConfirmData((prevData) => {
  //     const existingItemIndex = prevData.findIndex(
  //       (item) => item.resourceId === key || item.key === key,
  //     );
  //     if (existingItemIndex !== -1) {
  //       // 如果 key 存在，更新其对应的 value
  //       const updatedConfirmData = [...prevData];
  //       updatedConfirmData[existingItemIndex] = {
  //         ...updatedConfirmData[existingItemIndex],
  //         value: value,
  //       };
  //       return updatedConfirmData;
  //     } else {
  //       const newItem = {
  //         resourceId: metafieldsData?.find((item: any) => item?.key === key)
  //           ?.resourceId,
  //         locale: globalStore?.source || "",
  //         key: key,
  //         value: value, // 初始为空字符串
  //         translatableContentDigest: metafieldsData?.find(
  //           (item: any) => item?.key === key,
  //         )?.digest,
  //         target: searchTerm || "",
  //       };

  //       return [...prevData, newItem]; // 将新数据添加到 confirmData 中
  //     }
  //   });
  // };

  // const handleVariantsInputChange = (key: string, value: string) => {
  //   setTranslatedValues((prev) => ({
  //     ...prev,
  //     [key]: value, // 更新对应的 key
  //   }));
  //   setConfirmData((prevData) => {
  //     const existingItemIndex = prevData.findIndex(
  //       (item) => item.resourceId === key || item.key === key,
  //     );
  //     if (existingItemIndex !== -1) {
  //       // 如果 key 存在，更新其对应的 value
  //       const updatedConfirmData = [...prevData];
  //       updatedConfirmData[existingItemIndex] = {
  //         ...updatedConfirmData[existingItemIndex],
  //         value: value,
  //       };
  //       return updatedConfirmData;
  //     } else {
  //       const newItem = {
  //         resourceId: variantsData?.find((item: any) => item?.key === key)
  //           ?.resourceId,
  //         locale: globalStore?.source || "",
  //         key: key,
  //         value: value, // 初始为空字符串
  //         translatableContentDigest: variantsData?.find(
  //           (item: any) => item?.key === key,
  //         )?.digest,
  //         target: searchTerm || "",
  //       };

  //       return [...prevData, newItem]; // 将新数据添加到 confirmData 中
  //     }
  //   });
  // };

  const handleTranslate = async ({
    resourceType,
    record,
    handleInputChange,
  }: {
    resourceType: string;
    record: any;
    handleInputChange: (key: string, value: string) => void;
  }) => {
    fetcher.submit(
      {
        log: `${globalStore?.shop} 从翻译管理-产品页面点击单行翻译`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    setLoadingItems((prev) => [...prev, record?.key]);

    const data = await SingleTextTranslate({
      shopName: globalStore?.shop || "",
      source: globalStore?.source || "",
      target: searchTerm || "",
      resourceType: resourceType,
      context: record?.default_language,
      key: record?.shopifyKey,
      type: record?.type,
      server: globalStore?.server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(record?.key)) {
        handleInputChange(record?.key, data.response);
        setSuccessTranslatedKey((prev) => [...prev, record?.key]);
        shopify.toast.show(t("Translated successfully"));
        fetcher.submit(
          {
            log: `${globalStore?.shop} 从翻译管理-产品页面点击单行翻译返回结果 ${data?.response}`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      }
    } else {
      shopify.toast.show(data.errorMsg);
    }
    setLoadingItems((prev) => prev.filter((item) => item !== record?.key));
  };

  const handleLanguageChange = (language: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setIsLoading(true);
      dataFetcher.submit(
        {
          endCursor: JSON.stringify({
            cursor: "",
            searchTerm: searchTerm,
            query: queryText,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/product?language=${language}`,
        },
      );
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
  };

  // 下一页请求函数
  const throttleNextSubmit = useMemo(() => {
    return throttle(async () => {
      dataFetcher.submit(
        {
          endCursor: JSON.stringify({
            cursor: endCursor,
            searchTerm: searchTerm,
            query: queryText,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/product?language=${searchTerm}`,
        },
      ); // 提交表单请求
    }, 500);
  }, [productsData, searchTerm]);

  // 上一页请求函数
  const throttleBackSubmit = useMemo(() => {
    return throttle(() => {
      dataFetcher.submit(
        {
          startCursor: JSON.stringify({
            cursor: startCursor,
            searchTerm: searchTerm,
            query: queryText,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/product?language=${searchTerm}`,
        },
      );
    }, 500);
  }, [productsData, searchTerm]); // ✅ 必须写依赖

  const throttleMenuChange = useMemo(() => {
    return throttle((key: string) => {
      setSelectProductKey(key);
    }, 300);
  }, []);

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

  const handleSearch = (value: string) => {
    setQueryText(value);

    // 清除上一次的定时器
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      dataFetcher.submit(
        {
          endCursor: JSON.stringify({
            cursor: "",
            searchTerm: searchTerm,
            query: value,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/product?language=${searchTerm}`,
        },
      );
    }, 500);
  };

  const onPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      const now = Date.now();
      clickBackTimestampsRef.current.push(now);
      const recent = clickBackTimestampsRef.current.filter(
        (ts) => now - ts < 2000,
      );
      clickBackTimestampsRef.current = recent;
      if (recent.length >= 5) {
        shopify.toast.show(
          t("You clicked too frequently. Please try again later."),
        );
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
      const recent = clickNextTimestampsRef.current.filter(
        (ts) => now - ts < 2000,
      );
      clickNextTimestampsRef.current = recent;
      if (recent.length >= 5) {
        shopify.toast.show(
          t("You clicked too frequently. Please try again later."),
        );
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
    fetcher.submit(
      {
        log: `${globalStore?.shop} 提交翻译管理-产品页面修改数据`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    const productBaseNewData = JSON.parse(JSON.stringify(productBaseData));

    setProductBaseData(productBaseNewData);
    const productSeoNewData = JSON.parse(JSON.stringify(productSeoData));

    setProductSeoData(productSeoNewData);
    const optionsNewData = JSON.parse(JSON.stringify(optionsData));

    setOptionsData(optionsNewData);
    const metafieldsNewData = JSON.parse(JSON.stringify(metafieldsData));

    setMetafieldsData(metafieldsNewData);
    const variantsNewData = JSON.parse(JSON.stringify(variantsData));

    setVariantsData(variantsNewData);

    setConfirmData([]);
    setSuccessTranslatedKey([]);
  };

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
      backAction={{
        onAction: onCancel,
      }}
    >
      <SaveBar id="save-bar">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={confirmFetcher.state === "submitting" ? "true" : undefined}
        >
          {t("Save")}
        </button>
        <button onClick={handleDiscard}>{t("Cancel")}</button>
      </SaveBar>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "15px",
          gap: "8px",
        }}
      >
        <Input
          placeholder={t("Search...")}
          prefix={<SearchOutlined />}
          value={queryText}
          onChange={(e) => handleSearch(e.target.value)}
        />
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
      <Layout
        style={{
          overflow: "auto",
          backgroundColor: "var(--p-color-bg)",
          height: "calc(100vh - 154px)",
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
        ) : productsData.length ? (
          <>
            {!isMobile && (
              <Sider
                style={{
                  height: "calc(100% - 25px)",
                  minHeight: "70vh",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "auto",
                  backgroundColor: "var(--p-color-bg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <SideMenu
                    defaultSelectedKeys={productsData[0]?.id}
                    items={menuData}
                    selectedKeys={selectProductKey}
                    onClick={handleMenuChange}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {(hasNext || hasPrevious) && (
                      <Pagination
                        hasPrevious={hasPrevious}
                        onPrevious={onPrevious}
                        hasNext={hasNext}
                        onNext={onNext}
                      />
                    )}
                  </div>
                </div>
              </Sider>
            )}
            <Content
              style={{
                paddingLeft: isMobile ? "16px" : "24px",
                height: "calc(100% - 25px)",
                minHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
              }}
            >
              {isMobile ? (
                <Space direction="vertical" style={{ width: "100%" }}>
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
                  <Card title={t("Resource")}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {productBaseData.map((item: any, index: number) => {
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
                              {t(item?.resource)}
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
                                isSuccess={successTranslatedKey?.includes(
                                  item?.key as string,
                                )}
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
                                  handleTranslate({
                                    resourceType: "PRODUCT",
                                    record: item,
                                    handleInputChange,
                                  });
                                  reportClick("editor_list_translate");
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
                      {productSeoData.map((item: any, index: number) => {
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
                              {t(item?.resource)}
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
                                isSuccess={successTranslatedKey?.includes(
                                  item?.key as string,
                                )}
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
                                  handleTranslate({
                                    resourceType: "PRODUCT",
                                    record: item,
                                    handleInputChange,
                                  });
                                  reportClick("editor_list_translate");
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
                                  {t(item?.resource)}
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
                                    isSuccess={successTranslatedKey?.includes(
                                      item?.key as string,
                                    )}
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
                                      handleTranslate({
                                        resourceType: "PRODUCT_OPTION",
                                        record: item,
                                        handleInputChange,
                                      });

                                      reportClick("editor_list_translate");
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
                                  {t(item?.resource)}
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
                                    isSuccess={successTranslatedKey?.includes(
                                      item?.key as string,
                                    )}
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
                                      handleTranslate({
                                        resourceType: "METAFIELD",
                                        record: item,
                                        handleInputChange,
                                      });
                                      reportClick("editor_list_translate");
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
                                  {t(item?.resource)}
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
                                    isSuccess={successTranslatedKey?.includes(
                                      item?.key as string,
                                    )}
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
                                      handleTranslate({
                                        resourceType: "PRODUCT_OPTION_VALUE",
                                        record: item,
                                        handleInputChange,
                                      });
                                      reportClick("editor_list_translate");
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
                  <SideMenu
                    defaultSelectedKeys={productsData[0]?.id}
                    items={menuData}
                    selectedKeys={selectProductKey}
                    onClick={handleMenuChange}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {(hasNext || hasPrevious) && (
                      <Pagination
                        hasPrevious={hasPrevious}
                        onPrevious={onPrevious}
                        hasNext={hasNext}
                        onNext={onNext}
                      />
                    )}
                  </div>
                </Space>
              ) : !productBaseData.length ? (
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
              ) : (
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
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
                  <Table
                    columns={productBaseDataColumns}
                    dataSource={productBaseData}
                    pagination={false}
                  />
                  <Table
                    columns={productSeoDataColumns}
                    dataSource={productSeoData}
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
    </Page>
  );
};

export default Index;
