import {
  Button,
  Card,
  Divider,
  Layout,
  Result,
  Space,
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
import { Page, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";
import {
  ConfirmDataType,
  SingleTextTranslate,
  updateManageTranslation,
} from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Modal, SaveBar, TitleBar } from "@shopify/app-bridge-react";
import { setTableData } from "~/store/modules/languageTableData";
import { setUserConfig } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";

const { Content } = Layout;

const { Text } = Typography;

type TableDataType = {
  key: string;
  index: number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
  type: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 如果没有 language 参数，直接返回空数据
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  console.log(`${shop} load manage_translation_metafield`);

  try {
    const metafields = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "METAFIELD",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      metafields,
    });
  } catch (error) {
    console.error("Error load metafield:", error);
    throw new Response("Error load metafield", { status: 500 });
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
        const previousMetafields = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "METAFIELD",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ data: previousMetafields });
      case !!endCursor:
        const nextMetafields = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "METAFIELD",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ data: nextMetafields });
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
          confirmData,
        });
        return json({ data: data });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action metafield:", error);
    throw new Response("Error action metafield", { status: 500 });
  }
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm, metafields, server, shopName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const submit = useSubmit(); // 使用 useSubmit 钩子
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  // const [isVisible, setIsVisible] = useState<
  //   boolean | string | { language: string } | { item: string }
  // >(false);

  const [metafieldsData, setMetafieldsData] = useState(metafields);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
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
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ];
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("metafield");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    metafieldsData.pageInfo.hasPreviousPage || false,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    metafieldsData.pageInfo.hasNextPage || false,
  );
  const [isMobile, setIsMobile] = useState(false);

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
    loadingItemsRef.current = loadingItems;
  }, [loadingItems]);

  useEffect(() => {
    if (metafields && isManualChangeRef.current) {
      setMetafieldsData(metafields);
      isManualChangeRef.current = false; // 重置
    }
  }, [metafields]);

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
    setHasPrevious(metafieldsData.pageInfo.hasPreviousPage);
    setHasNext(metafieldsData.pageInfo.hasNextPage);
    const data = generateMenuItemsArray(metafieldsData);
    setResourceData(data);
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [metafieldsData]);

  useEffect(() => {
    if (actionData && "data" in actionData) {
      setConfirmData([]);
      setMetafieldsData(actionData.data);
    } else {
      // 如果不存在 nexts，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === false,
      );
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
                "METAFIELD",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
                record?.index || 0,
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

  const handleInputChange = (key: string, value: string, index: number) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [key]: value, // 更新对应的 key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex(
        (item) => item?.resourceId === key,
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
        // 如果 key 不存在，新增一条数据
        const newItem = {
          resourceId: metafieldsData.nodes[index]?.resourceId,
          locale: metafieldsData.nodes[index]?.translatableContent[0]?.locale,
          key: "value",
          value: value, // 初始为空字符串
          translatableContentDigest:
            metafieldsData.nodes[index]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const generateMenuItemsArray = (items: any) => {
    return items.nodes.flatMap((item: any, index: number) => {
      // 创建当前项的对象
      const currentItem = {
        key: `${item?.resourceId}`, // 使用 key 生成唯一的 key
        index: index,
        resource: t("value"), // 资源字段固定为 "Menu Items"
        default_language: item?.translatableContent[0]?.value, // 默认语言为 item 的标题
        translated: item?.translations[0]?.value, // 翻译字段初始化为空字符串
        type: item?.translatableContent[0]?.type,
      };
      return [currentItem];
    });
  };

  const handleTranslate = async (
    resourceType: string,
    key: string,
    type: string,
    context: string,
    index: number,
  ) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: metafieldsData.nodes
        .find((item: any) => item?.resourceId === key)
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
      navigate(`/app/manage_translation/metafield?language=${language}`);
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

  const onPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      const formData = new FormData();
      const startCursor = metafieldsData.pageInfo.startCursor;
      formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/metafield?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const onNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      const formData = new FormData();
      const endCursor = metafieldsData.pageInfo.endCursor;
      formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/metafield?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/metafield?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    setMetafieldsData({ ...metafieldsData });
    setConfirmData([]);
  };

  // const handleLeaveItem = (
  //   key: string | boolean | { language: string } | { item: string },
  // ) => {
  //   setIsVisible(false);
  //   if (key === "previous") {
  //     // 向前翻页
  //     const formData = new FormData();
  //     const startCursor = metafieldsData.pageInfo.startCursor;
  //     formData.append("startCursor", JSON.stringify(startCursor));
  //     submit(formData, {
  //       method: "post",
  //       action: `/app/manage_translation/metafield?language=${searchTerm}`,
  //     });
  //   } else if (key === "next") {
  //     // 向后翻页
  //     const formData = new FormData();
  //     const endCursor = metafieldsData.pageInfo.endCursor;
  //     formData.append("endCursor", JSON.stringify(endCursor));
  //     submit(formData, {
  //       method: "post",
  //       action: `/app/manage_translation/metafield?language=${searchTerm}`,
  //     });
  //   } else if (typeof key === "object" && "language" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedLanguage(key.language);
  //     navigate(`/app/manage_translation/metafield?language=${key.language}`);
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
      title={t("Store metadata")}
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
        ) : metafieldsData?.nodes?.length ? (
          <Content
            style={{
              paddingLeft: isMobile ? "16px" : "0",
            }}
          >
            {isMobile ? (
              <Space direction="vertical" style={{ width: "100%" }}>
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
                                  "METAFIELD",
                                  item?.key || "",
                                  item?.type || "",
                                  item?.default_language || "",
                                  item?.index || 0,
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
                style={{ display: "flex" }}
              >
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
                <Table
                  columns={resourceColumns}
                  dataSource={resourceData}
                  pagination={false}
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
            )}
          </Content>
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
