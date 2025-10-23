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
import { FullscreenBar, Page, Pagination, Select } from "@shopify/polaris";
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
import { setLocale } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "../app.manage_translation/route";

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
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return json({
    searchTerm,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const startCursor = JSON.parse(formData.get("startCursor") as string);
    const endCursor = JSON.parse(formData.get("endCursor") as string);
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!startCursor:
        try {
          const response = await queryPreviousTransType({
            shop,
            accessToken: accessToken as string,
            resourceType: "SHOP",
            startCursor: startCursor.cursor,
            locale: searchTerm || "",
          }); // 处理逻辑
          console.log(`应用日志: ${shop} 翻译管理-商店页面翻到上一页`);

          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response,
          };
        } catch (error) {
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: undefined,
          };
        }

      case !!endCursor:
        try {
          const response = await queryNextTransType({
            shop,
            accessToken: accessToken as string,
            resourceType: "SHOP",
            endCursor: endCursor.cursor,
            locale: searchTerm || "",
          }); // 处理逻辑
          console.log(`应用日志: ${shop} 翻译管理-商店页面翻到下一页`);

          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response,
          };
        } catch (error) {
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: undefined,
          };
        }
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
    console.error("Error action shop:", error);
    throw new Response("Error action shop", { status: 500 });
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

  const fetcher = useFetcher<any>();
  const dataFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);

  const [shopsData, setShopsData] = useState<any>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const itemOptions = getItemOptions(t);
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("shop");
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [hasNext, setHasNext] = useState<boolean>(false);
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
    dataFetcher.submit(
      {
        endCursor: JSON.stringify({
          cursor: "",
          searchTerm: searchTerm,
        }),
      },
      {
        method: "POST",
      },
    );
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在翻译管理-店铺页面`,
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
    if (shopsData) {
      setHasPrevious(shopsData?.pageInfo?.hasPreviousPage);
      setHasNext(shopsData?.pageInfo?.hasNextPage);
      const data = generateMenuItemsArray(shopsData);
      setResourceData(data);
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  }, [shopsData]);

  useEffect(() => {
    if (dataFetcher.data) {
      if (dataFetcher.data?.success) {
        setShopsData(dataFetcher.data?.response);
        isManualChangeRef.current = false; // 重置
      }
      setConfirmData([]);
    }
  }, [dataFetcher.data]);

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
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
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
                "SHOP",
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

  const handleInputChange = (key: string, value: string) => {
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
          resourceId: shopsData.nodes[0]?.resourceId,
          locale: shopsData.nodes[0]?.translatableContent.find(
            (item: any) => item.key === key,
          )?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest:
            shopsData.nodes[0]?.translatableContent.find(
              (item: any) => item.key === key,
            )?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const generateMenuItemsArray = (items: any) => {
    return items.nodes[0]?.translatableContent.flatMap(
      (item: any, index: number) => {
        // 创建当前项的对象
        const currentItem = {
          key: item.key, // 使用 key 生成唯一的 key
          resource: item.key,
          default_language: item.value, // 默认语言为 item 的标题
          translated:
            items.nodes[0]?.translations.find(
              (translation: any) => translation.key === item.key,
            )?.value || "", // 翻译字段初始化为空字符串
          type: item.type,
        };
        return [currentItem];
      },
    );
  };

  const handleTranslate = async (
    resourceType: string,
    key: string,
    type: string,
    context: string,
  ) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: globalStore?.shop || "",
      source: globalStore?.source || "",
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: globalStore?.server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(key)) {
        handleInputChange(key, data.response);
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
      dataFetcher.submit(
        {
          endCursor: JSON.stringify({
            cursor: "",
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/shop?language=${language}`,
        },
      ); // 提交表单请求
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/shop?language=${language}`);
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
      dataFetcher.submit(
        {
          startCursor: JSON.stringify({
            cursor: shopsData.pageInfo.startCursor,
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/shop?language=${searchTerm}`,
        },
      ); // 提交表单请求
    }
  };

  const onNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      dataFetcher.submit(
        {
          endCursor: JSON.stringify({
            cursor: shopsData.pageInfo.endCursor,
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/shop?language=${searchTerm}`,
        },
      ); // 提交表单请求
    }
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/shop?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    setShopsData({ ...shopsData });
    setConfirmData([]);
  };

  // const handleLeaveItem = (
  //   key: string | boolean | { language: string } | { item: string },
  // ) => {
  //   setIsVisible(false);
  //   if (key === "previous") {
  //     // 向前翻页
  //     const formData = new FormData();
  //     const startCursor = shopsData.pageInfo.startCursor;
  //     formData.append("startCursor", JSON.stringify(startCursor));
  //     submit(formData, {
  //       method: "post",
  //       action: `/app/manage_translation/shop?language=${searchTerm}`,
  //     });
  //   } else if (key === "next") {
  //     // 向后翻页
  //     const formData = new FormData();
  //     const endCursor = shopsData.pageInfo.endCursor;
  //     formData.append("endCursor", JSON.stringify(endCursor));
  //     submit(formData, {
  //       method: "post",
  //       action: `/app/manage_translation/shop?language=${searchTerm}`,
  //     });
  //   } else if (typeof key === "object" && "language" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedLanguage(key.language);
  //     navigate(`/app/manage_translation/shop?language=${key.language}`);
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
      title={t("Shop")}
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
          loading={confirmFetcher.state === "submitting" ? "true" : undefined}
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
        ) : shopsData?.nodes?.length ? (
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
                                  "SHOP",
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
            ) : (
              <Space
                direction="vertical"
                size="middle"
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
