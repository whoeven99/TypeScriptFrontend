import {
  Button,
  Layout,
  Menu,
  MenuProps,
  message,
  Modal,
  Result,
  Table,
  theme,
} from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextNestTransType,
  queryNextTransType,
  queryPreviousNestTransType,
  queryPreviousTransType,
  queryShopLanguages,
} from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";

const { Sider, Content } = Layout;

interface ConfirmFetcherType {
  data: {
    success: boolean;
    errorMsg: string;
    data: {
      resourceId: string;
      key: string;
      value?: string;
    };
  }[];
}

interface ProductType {
  handle: string;
  key: string;
  descriptionHtml: string | undefined;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  productType: string;
  options: [
    {
      key: string;
      name: string | undefined;
      // values: string[] | undefined;
      translation: string | undefined;
    },
  ];
  metafields: [
    {
      key: string;
      name: string | undefined;
      // values: string[] | undefined;
      translation: string | undefined;
    },
  ];
  title: string;
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
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      shop,
      accessToken,
    });
    const products = await queryNextTransType({
      request,
      resourceType: "PRODUCT",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });
    const product_options = await queryNextNestTransType({
      request,
      resourceType: "PRODUCT",
      nestResourceType: "PRODUCT_OPTION",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });
    const product_metafields = await queryNextNestTransType({
      request,
      resourceType: "PRODUCT",
      nestResourceType: "METAFIELD",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      products,
      product_options,
      product_metafields,
      shopLanguagesLoad,
    });
  } catch (error) {
    console.error("Error load product:", error);
    throw new Response("Error load product", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
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
          request,
          resourceType: "PRODUCT",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        const previousOptions = await queryPreviousNestTransType({
          request,
          resourceType: "PRODUCT",
          nestResourceType: "PRODUCT_OPTION",
          startCursor,
          locale: searchTerm || "",
        });
        const previousMetafields = await queryPreviousNestTransType({
          request,
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
          request,
          resourceType: "PRODUCT",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        const nextOptions = await queryNextNestTransType({
          request,
          resourceType: "PRODUCT",
          nestResourceType: "PRODUCT_OPTION",
          endCursor,
          locale: searchTerm || "",
        });
        const nextMetafields = await queryNextNestTransType({
          request,
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
        const updatedConfirmData = confirmData.map((item) => {
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
          request,
          confirmData: updatedConfirmData,
        });
        return json({ data: data });
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
  const {
    products,
    product_options,
    product_metafields,
    shopLanguagesLoad,
    searchTerm,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (products: any) => {
    const data = products.nodes.map((product: any) => ({
      key: product?.resourceId,
      label: product?.translatableContent.find(
        (item: any) => item.key === "title",
      ).value,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(products);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
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
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    productsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    productsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<ConfirmFetcherType>();

  useEffect(() => {
    setHasPrevious(productsData.pageInfo.hasPreviousPage);
    setHasNext(productsData.pageInfo.hasNextPage);
  }, [productsData]);

  useEffect(() => {
    const data = transBeforeData({
      products: productsData,
      options: productOptionsData,
      metafields: productMetafieldsData,
    });
    setProductData(data);
    setConfirmData([]);
    setTranslatedValues({});
  }, [selectProductKey]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          index: 3,
          resource: "Title",
          default_language: productData?.title,
          translated: productData?.translations?.title,
        },
        {
          key: "body_html",
          index: 3,
          resource: "Description",
          default_language: productData?.descriptionHtml,
          translated: productData?.translations?.descriptionHtml,
        },
        {
          key: "product_type",
          index: 3,
          resource: "ProductType",
          default_language: productData?.productType,
          translated: productData?.translations?.productType,
        },
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
        {
          key: "handle",
          index: 3,
          resource: "URL handle",
          default_language: productData?.handle,
          translated: productData?.translations?.handle,
        },
        {
          key: "meta_title",
          index: 3,
          resource: "Meta title",
          default_language: productData?.seo.title,
          translated: productData?.translations?.seo.title,
        },
        {
          key: "meta_description",
          index: 3,
          resource: "Meta description",
          default_language: productData?.seo.description,
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
        resource: "Option name",
        default_language: option?.name,
        translated: option.translation,
      };
    });
    if (optionsData) setOptionsData(optionsData);
    const metafieldsData = productData?.metafields.map((metafield, index) => {
      return {
        key: `value_${index}`,
        index: index,
        resource: "Product metafield",
        default_language: metafield?.name,
        translated: metafield?.translation,
      };
    });
    if (metafieldsData) setMetafieldsData(metafieldsData);
  }, [productData]);

  useEffect(() => {
    if (actionData && "nextProducts" in actionData) {
      const items: MenuProps["items"] = exMenuData(actionData.nextProducts);

      // 在这里处理 nextProducts
      setMenuData(items);
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
      const items: MenuProps["items"] = exMenuData(actionData.previousProducts);

      setMenuData(items);
      setProductsData(actionData.previousProducts);
      setProductOptionsData(actionData.previousOptions);
      setProductMetafieldsData(actionData.previousMetafields);
      setSelectProductKey(actionData.previousProducts.nodes[0]?.resourceId);
    } else {
      // 如果不存在 nextProducts，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item) => {
        item.success === false;
      });
      if (!errorItem) {
        message.success("Saved successfully");
      } else {
        message.error(errorItem?.errorMsg);
      }
      setConfirmData([]);
    }
    setConfirmLoading(false);
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (!isVisible) {
      // Modal 已关闭后再进行路由跳转
      navigate("/app/manage_translation");
    }
  }, [isVisible]);

  const resourceColumns = [
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} textarea={false} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            textarea={false}
          />
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
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} textarea={false} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            textarea={false}
          />
        );
      },
    },
  ];

  const optionsColumns = [
    {
      title: "Product Options",
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <ManageTableInput record={record} textarea={false} />;
        } else {
          return null;
        }
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            textarea={false}
            index={1}
          />
        );
      },
    },
  ];

  const metafieldsColumns = [
    {
      title: "Metafield",
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <ManageTableInput record={record} textarea={false} />;
        } else {
          return null;
        }
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            textarea={false}
            index={2}
          />
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
  //     title: "Default Language",
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
            translatableContentDigest: products.nodes
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
      handle: "",
      key: "",
      descriptionHtml: "",
      seo: {
        description: "",
        title: "",
      },
      productType: "",
      options: [
        {
          key: "",
          name: "",
          translation: "",
        },
      ],
      metafields: [
        {
          key: "",
          name: "",
          translation: "",
        },
      ],
      title: "",
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
    data.title = product?.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.descriptionHtml = product?.translatableContent.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.productType = product?.translatableContent.find(
      (item: any) => item.key === "product_type",
    )?.value;
    data.handle = product?.translatableContent.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.seo.title = product?.translatableContent.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.seo.description = product?.translatableContent.find(
      (item: any) => item.key === "meta_description",
    )?.value;
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
          name: item?.translatableContent[0]?.value,
          translation: item?.translations[0]?.value,
        };
      }) || [];
    data.metafields =
      productMetafield?.nestedTranslatableResources.nodes.map((item: any) => {
        return {
          key: item?.resourceId,
          name: item?.translatableContent[0]?.value,
          translation: item?.translations[0]?.value,
        };
      }) || [];

    return data;
  };

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

  const onClick = (e: any) => {
    setSelectProductKey(e.key);
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
    navigate("/app/manage_translation");
    setIsVisible(false); // 关闭 Modal
  };

  return (
    <div>
      {productsData.nodes.length ? (
        <Modal
          open={isVisible}
          onCancel={onCancel}
          width={"100%"}
          footer={[
            <div
              key={"footer_buttons"}
              style={{
                display: "flex",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Button
                key={"manage_cancel_button"}
                onClick={onCancel}
                style={{ marginRight: "10px" }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                key={"manage_confirm_button"}
                type="primary"
                disabled={confirmLoading}
                loading={confirmLoading}
              >
                Save
              </Button>
            </div>,
          ]}
        >
          <Layout
            style={{
              padding: "24px 0",
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Sider style={{ background: colorBgContainer }} width={200}>
              <Menu
                mode="inline"
                defaultSelectedKeys={[productsData.nodes[0]?.resourceId]}
                defaultOpenKeys={["sub1"]}
                style={{ height: "100%" }}
                items={menuData}
                selectedKeys={[selectProductKey]}
                onClick={onClick}
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
            <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
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
          </Layout>
        </Modal>
      ) : (
        <Modal open={isVisible} footer={null} onCancel={onCancel}>
          <Result
            title="The specified fields were not found in the store.
"
            extra={
              <Button type="primary" onClick={onCancel}>
                OK
              </Button>
            }
          />
        </Modal>
      )}
    </div>
  );
};

export default Index;
