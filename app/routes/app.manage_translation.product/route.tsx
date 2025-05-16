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
import {
  queryNextNestTransType,
  queryNextTransType,
  queryPreviousNestTransType,
  queryPreviousTransType,
} from "~/api/admin";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/serve";
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
  const { shop, accessToken } = adminAuthResult.session;

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const products = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "PRODUCT",
      endCursor: "",
      locale: searchTerm || "",
    });
    const product_options = await queryNextNestTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "PRODUCT",
      nestResourceType: "PRODUCT_OPTION",
      endCursor: "",
      locale: searchTerm || "",
    });
    const product_metafields = await queryNextNestTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "PRODUCT",
      nestResourceType: "METAFIELD",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      products,
      product_options,
      product_metafields,
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

  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!startCursor:
        const previousProducts = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PRODUCT",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        const previousOptions = await queryPreviousNestTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PRODUCT",
          nestResourceType: "PRODUCT_OPTION",
          startCursor,
          locale: searchTerm || "",
        });
        const previousMetafields = await queryPreviousNestTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PRODUCT",
          nestResourceType: "METAFIELD",
          startCursor,
          locale: searchTerm || "",
        });
        return json({
          previousProducts: previousProducts,
          previousOptions: previousOptions,
          previousMetafields: previousMetafields,
        });
      case !!endCursor:
        const nextProducts = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PRODUCT",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        const nextOptions = await queryNextNestTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PRODUCT",
          nestResourceType: "PRODUCT_OPTION",
          endCursor,
          locale: searchTerm || "",
        });
        const nextMetafields = await queryNextNestTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PRODUCT",
          nestResourceType: "METAFIELD",
          endCursor,
          locale: searchTerm || "",
        });
        return json({
          nextProducts: nextProducts,
          nextOptions: nextOptions,
          nextMetafields: nextMetafields,
        });
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
  } catch (error) {
    console.error("Error action product:", error);
    throw new Response("Error action product", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm, products, product_options, product_metafields, server, shopName } =
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

  const isManualChange = useRef(false);
  const loadingItemsRef = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [productsData, setProductsData] = useState(products);
  const [productOptionsData, setProductOptionsData] = useState(product_options);
  const [productMetafieldsData, setProductMetafieldsData] =
    useState(product_metafields);
  const [productData, setProductData] = useState<ProductType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [optionsData, setOptionsData] = useState<TableDataType[]>([]);
  const [metafieldsData, setMetafieldsData] = useState<TableDataType[]>([]);
  // const [variantsData, setVariantsData] = useState<TableDataType[]>([]);
  const [selectProductKey, setSelectProductKey] = useState(
    products.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
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
    productsData.pageInfo.hasPreviousPage || false
  );
  const [hasNext, setHasNext] = useState<boolean>(
    productsData.pageInfo.hasNextPage || false
  );

  useEffect(() => {
    if (products) {
      setMenuData(exMenuData(products));
      setIsLoading(false);
    }
  }, []);

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
      setProductOptionsData(product_options);
      setProductMetafieldsData(product_metafields);
      setMenuData(exMenuData(products));
      setSelectProductKey(products.nodes[0]?.resourceId);
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      isManualChange.current = false; // 重置
    }
  }, [products]);

  useEffect(() => {
    const data = transBeforeData({
      products: productsData,
      options: productOptionsData,
      metafields: productMetafieldsData,
    });
    setProductData(data);
    setLoadingItems([]);
    setConfirmData([]);
    setTranslatedValues({});
    setHasPrevious(productsData.pageInfo.hasPreviousPage);
    setHasNext(productsData.pageInfo.hasNextPage);
  }, [selectProductKey, productsData, productOptionsData, productMetafieldsData]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          index: 3,
          resource: t("Title"),
          type: productData?.title?.type,
          default_language: productData?.title?.value,
          translated: productData?.translations?.title,
        },
        {
          key: "body_html",
          index: 3,
          resource: t("Description"),
          type: productData?.descriptionHtml?.type,
          default_language: productData?.descriptionHtml?.value,
          translated: productData?.translations?.descriptionHtml,
        },
        {
          key: "product_type",
          index: 3,
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
          index: 3,
          resource: t("URL handle"),
          type: productData?.handle?.type,
          default_language: productData?.handle?.value,
          translated: productData?.translations?.handle,
        },
        {
          key: "meta_title",
          index: 3,
          resource: t("Meta title"),
          type: productData?.seo.title?.type,
          default_language: productData?.seo.title?.value,
          translated: productData?.translations?.seo.title,
        },
        {
          key: "meta_description",
          index: 3,
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
        key: `name_${index}`,
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
        key: `value_${index}`,
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
      setProductOptionsData(actionData.nextOptions);
      setProductMetafieldsData(actionData.nextMetafields);
      setSelectProductKey(actionData.nextProducts.nodes[0]?.resourceId);
    } else if (
      actionData &&
      "previousProducts" in actionData &&
      "previousOptions" in actionData &&
      "previousMetafields" in actionData
    ) {
      setMenuData(exMenuData(actionData.previousProducts));
      setProductsData(actionData.previousProducts);
      setProductOptionsData(actionData.previousOptions);
      setProductMetafieldsData(actionData.previousMetafields);
      setSelectProductKey(actionData.previousProducts.nodes[0]?.resourceId);
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
          const index = productsData.nodes.findIndex((option: any) => option.resourceId === item.data.resourceId);
          if (index !== -1) {
            const product = productsData.nodes[index].translations.find((option: any) => option.key === item.data.key);
            if (product) {
              product.value = item.data.value;
            } else {
              productsData.nodes[index].translations.push({
                key: item.data.key,
                value: item.data.value,
              });
            }
          }
        } else if (item.data.resourceId.split("/")[3] === "ProductOption") {
          const index = productOptionsData.nodes.findIndex((productOption: any) =>
            productOption.nestedTranslatableResources.nodes.some(
              (option: any) => option.resourceId === item.data.resourceId
            )
          );
          if (index !== -1) {
            const productOption = productOptionsData.nodes[index].nestedTranslatableResources.nodes.find((option: any) => option.resourceId === item.data.resourceId);
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
          const index = productMetafieldsData.nodes.findIndex((productMetafield: any) =>
            productMetafield.nestedTranslatableResources.nodes.some(
              (option: any) => option.resourceId === item.data.resourceId
            )
          );
          if (index !== -1) {
            const productMetafield = productMetafieldsData.nodes[index].nestedTranslatableResources.nodes.find((option: any) => option.resourceId === item.data.resourceId);
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

  // const variantsColumns = [
  //   {
  //     title: "Variants",
  //     dataIndex: "resource",
  //     key: "resource",
  //     width: 150,
  //   },
  //   {
  //     title: t("Default Language"),
  //     dataIndex: "default_language",
  //     key: "default_language",
  //     render: (_: any, record: TableDataType) => {
  //       if (record) {
  //         return <Input disabled value={record.default_language} />;
  //       } else {
  //         return null;
  //       }
  //     },
  //   },
  //   {
  //     title: "Translated",
  //     dataIndex: "translated",
  //     key: "translated",
  //     render: (_: any, record: TableDataType) => {
  //       if (record) {
  //         return <Input disabled value={record.translated} />;
  //       } else {
  //         return null;
  //       }
  //     },
  //   },
  // ];

  const exMenuData = (products: any) => {
    const data = products.nodes.map((product: any) => ({
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
      const existingItemIndex = prevData.findIndex((item) => item.key === key);    
      if (existingItemIndex !== -1) {
        // 如果 key 存在，更新其对应的 value
        const updatedConfirmData = [...prevData];
        updatedConfirmData[existingItemIndex] = {
          ...updatedConfirmData[existingItemIndex],
          value: value,
        };
        return updatedConfirmData;
      } else {
        // 如果 key 不存在，新增一条数据
        if (index && index.toString()[0] === "2") {
          const count: number = Number(index.toString().slice(1));
          const newItem = {
            resourceId: productMetafieldsData.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.nestedTranslatableResources.nodes[count]?.resourceId,
            locale: productMetafieldsData.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.nestedTranslatableResources.nodes[
              count
            ]?.translatableContent.find((item: any) => item.key === key.split("_")[0])
              ?.locale,
            key: key,
            value: value, // 初始为空字符串
            translatableContentDigest: productMetafieldsData.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.nestedTranslatableResources.nodes[
              count
            ]?.translatableContent.find((item: any) => item.key === key.split("_")[0])
              ?.digest,
            target: searchTerm || "",
          };
          return [...prevData, newItem]; // 将新数据添加到 confirmData 中
        } else if (index && index.toString()[0] === "1") {
          const count: number = Number(index.toString().slice(1));
          const newItem = {
            resourceId: productOptionsData.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.nestedTranslatableResources.nodes[count]?.resourceId,
            locale: productOptionsData.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.nestedTranslatableResources.nodes[
              count
            ]?.translatableContent.find((item: any) => item.key === key.split("_")[0])
              ?.locale,
            key: key,
            value: value, // 初始为空字符串
            translatableContentDigest: productOptionsData.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.nestedTranslatableResources.nodes[
              count
            ]?.translatableContent.find((item: any) => item.key === key.split("_")[0])
              ?.digest,
            target: searchTerm || "",
          };
          return [...prevData, newItem]; // 将新数据添加到 confirmData 中
        } else {
          const newItem = {
            resourceId: productsData.nodes.find(
              (item: any) => item?.resourceId === selectProductKey,
            )?.resourceId,
            locale: productsData.nodes
              .find((item: any) => item?.resourceId === selectProductKey)
              ?.translatableContent.find((item: any) => item.key === key)
              ?.locale,
            key: key,
            value: value, // 初始为空字符串
            translatableContentDigest: productsData.nodes
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
    options,
    metafields,
  }: {
    products: any;
    options: any;
    metafields: any;
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
    const product = products.nodes.find(
      (product: any) => product?.resourceId === selectProductKey,
    );
    const productOption = options.nodes.find(
      (option: any) => option?.resourceId === selectProductKey,
    );
    const productMetafield = metafields.nodes.find(
      (metafield: any) => metafield?.resourceId === selectProductKey,
    );
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
      productOption?.nestedTranslatableResources.nodes.map((item: any) => {
        return {
          key: item?.resourceId,
          name: item?.translatableContent[0]?.key,
          type: item?.translatableContent[0]?.type,
          translatableContent: item?.translatableContent[0]?.value,
          translation: item?.translations[0]?.value,
        };
      }) || [];
    data.metafields =
      productMetafield?.nestedTranslatableResources.nodes.map((item: any) => {
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
      source: productsData.nodes
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
    const startCursor = productsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/product?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = productsData.pageInfo.endCursor;
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
        ) : products.nodes.length ? (
          <>
            <Sider
              style={{
                background: colorBgContainer,
                height: 'calc(100vh - 124px)',
                width: '200px',
              }}
            >
              {/* <ItemsScroll
                selectItem={selectProductKey}
                menuData={menuData}
                setSelectItem={setSelectProductKey}
              /> */}
              <Menu
                mode="inline"
                defaultSelectedKeys={[productsData?.nodes[0]?.resourceId]}
                defaultOpenKeys={["sub1"]}
                style={{ height: "100%" }}
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
              {Array.isArray(optionsData) && optionsData[0] !== null && (
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
