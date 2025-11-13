import {
  Button,
  Card,
  Divider,
  Layout,
  Result,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate, useLocation, useSearchParams
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
import { SaveBar } from "@shopify/app-bridge-react";
import { useSelector } from "react-redux";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "../app.manage_translation/route";
import SideMenu from "~/components/sideMenu/sideMenu";

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 如果没有 language 参数，直接返回空数据
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

  const formData = await request.formData();
  const startCursor = JSON.parse(formData.get("startCursor") as string);
  const endCursor = JSON.parse(formData.get("endCursor") as string);
  const confirmData: any[] = JSON.parse(formData.get("confirmData") as string);
  switch (true) {
    case !!startCursor:
      try {
        const response = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "BLOG",
          startCursor: startCursor.cursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        console.log(`应用日志: ${shop} 翻译管理-博客页面翻到上一页`);

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
          resourceType: "BLOG",
          endCursor: endCursor.cursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        console.log(`应用日志: ${shop} 翻译管理-博客页面翻到下一页`);

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

      return {
        success: true,
        errorCode: 0,
        errorMsg: "",
        response: data,
      };

    default:
      // 你可以在这里处理一个默认的情况，如果没有符合的条件
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
  }
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm } = useLoaderData<typeof loader>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const fetcher = useFetcher<any>();
  const dataFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);

  const [menuData, setMenuData] = useState<any[]>([]);
  const [blogsData, setBlogsData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);
  const [selectBlogKey, setSelectBlogKey] = useState<string>("");
  const [confirmData, setConfirmData] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [successTranslatedKey, setSuccessTranslatedKey] = useState<string[]>(
    [],
  );
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
  const [selectedItem, setSelectedItem] = useState<string>("blog");
  const [pageInfo, setPageInfo] = useState<{
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  }>({
    hasPreviousPage: false,
    hasNextPage: false,
    startCursor: "",
    endCursor: "",
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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
        log: `${globalStore?.shop} 目前在翻译管理-博客页面`,
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
            label: item.name,
            value: item.locale,
          })),
      );
    }
  }, [languageTableData]);

  useEffect(() => {
    if (blogsData) {
      const selectedData = blogsData.find(
        (item: any) => item?.resourceId == selectBlogKey,
      );
      setResourceData(
        [
          {
            key: `title_${selectedData?.resourceId}_0`,
            resourceId: selectedData?.resourceId,
            shopifyKey: "title",
            resource: t("Title"),
            digest:
              selectedData?.translatableContent?.find(
                (item: any) => item.key == "title",
              )?.digest || "",
            type:
              selectedData?.translatableContent?.find(
                (item: any) => item.key == "title",
              )?.type || "",
            default_language:
              selectedData?.translatableContent?.find(
                (item: any) => item.key == "title",
              )?.value || "",
            translated: selectedData?.translations?.find(
              (item: any) => item.key == "title",
            )?.value,
          },
          {
            key: `handle_${selectedData?.resourceId}_1`,
            resourceId: selectedData?.resourceId,
            shopifyKey: "handle",
            resource: t("URL handle"),
            digest:
              selectedData?.translatableContent?.find(
                (item: any) => item.key == "handle",
              )?.digest || "",
            type:
              selectedData?.translatableContent?.find(
                (item: any) => item.key == "handle",
              )?.type || "",
            default_language:
              selectedData?.translatableContent?.find(
                (item: any) => item.key == "handle",
              )?.value || "",
            translated: selectedData?.translations?.find(
              (item: any) => item.key == "handle",
            )?.value,
          },
        ].filter((item) => item.default_language),
      );
      setLoadingItems([]);
      setConfirmData([]);
      setSuccessTranslatedKey([]);
      setTranslatedValues({});
    }
  }, [selectBlogKey, blogsData]);

  useEffect(() => {
    if (dataFetcher.data) {
      if (dataFetcher.data?.success) {
        const newData = dataFetcher.data.response?.nodes;
        if (Array.isArray(newData)) {
          const menuData = exMenuData(newData);
          setMenuData(menuData);
          setBlogsData(newData);
          setSelectBlogKey(newData[0]?.resourceId);
        }
        const newPageInfo = dataFetcher.data.response?.pageInfo;

        if (newPageInfo) setPageInfo(newPageInfo);
        isManualChangeRef.current = false; // 重置
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    }
  }, [dataFetcher.data]);

  useEffect(() => {
    if (confirmFetcher.data?.success) {
      const errorItem = confirmFetcher.data?.response?.filter(
        (item: any) => item?.success === false,
      );
      const successfulItem = confirmFetcher.data?.response?.filter(
        (item: any) => item?.success === true,
      );
      if (Array.isArray(successfulItem) && successfulItem.length) {
        successfulItem.forEach((item: any) => {
          const index = blogsData.findIndex(
            (option: any) => option.resourceId === item?.response?.resourceId,
          );
          if (index !== -1) {
            const data = blogsData[index]?.translations?.find(
              (option: any) => option?.key === item?.response?.key,
            );
            if (data) {
              data.value = item?.response?.value;
            } else {
              blogsData[index].translations.push({
                key: item.response.key,
                value: item.response.value,
              });
            }
          }
        });
      }
      if (Array.isArray(errorItem) && errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
        fetcher.submit(
          {
            log: `${globalStore?.shop} 翻译管理-文章页面修改数据保存成功`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
    }
    setConfirmData([]);
    setSuccessTranslatedKey([]);
  }, [confirmFetcher.data]);

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
      render: (_: any, record: any) => {
        return <ManageTableInput record={record} isRtl={searchTerm === "ar"} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: any) => {
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
      render: (_: any, record: any) => {
        return (
          <Button
            onClick={() => {
              handleTranslate({
                resourceType: "BLOG",
                record,
                handleInputChange,
              });
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const exMenuData = (menuData: any) => {
    const data = menuData.map((item: any) => ({
      key: item?.resourceId,
      label: item?.translatableContent.find((item: any) => item.key === "title")
        .value,
    }));
    return data;
  };

  const handleInputChange = (record: any, value: string) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [record?.key]: value, // 更新对应的 key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex(
        (item) => item.id === record?.key,
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
          id: record?.key,
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
        log: `${globalStore?.shop} 从翻译管理-文章页面点击单行翻译`,
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
        handleInputChange(record, data.response);
        setSuccessTranslatedKey((prev) => [...prev, record?.key]);
        shopify.toast.show(t("Translated successfully"));
        fetcher.submit(
          {
            log: `${globalStore?.shop} 从翻译管理-文章页面点击单行翻译返回结果 ${data?.response}`,
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
          }),
        },
        {
          method: "POST",
          action: `/app/manage_translation/article?language=${language}`,
        },
      );
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/blog?language=${language}`);
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
            cursor: pageInfo.startCursor,
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/blog?language=${searchTerm}`,
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
            cursor: pageInfo.endCursor,
            searchTerm: searchTerm,
          }),
        },
        {
          method: "post",
          action: `/app/manage_translation/blog?language=${searchTerm}`,
        },
      ); // 提交表单请求
    }
  };

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setSelectBlogKey(key);
    }
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/blog?language=${searchTerm}`,
    }); // 提交表单请求
    fetcher.submit(
      {
        log: `${globalStore?.shop} 提交翻译管理-博客页面修改数据`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    const selectedData = blogsData.find(
      (item: any) => item?.resourceId == selectBlogKey,
    );
    setResourceData(
      [
        {
          key: `title_${selectedData?.resourceId}_0`,
          resourceId: selectedData?.resourceId,
          shopifyKey: "title",
          resource: t("Title"),
          digest:
            selectedData?.translatableContent?.find(
              (item: any) => item.key == "title",
            )?.digest || "",
          type:
            selectedData?.translatableContent?.find(
              (item: any) => item.key == "title",
            )?.type || "",
          default_language:
            selectedData?.translatableContent?.find(
              (item: any) => item.key == "title",
            )?.value || "",
          translated: selectedData?.translations?.find(
            (item: any) => item.key == "title",
          )?.value,
        },
        {
          key: `handle_${selectedData?.resourceId}_1`,
          resourceId: selectedData?.resourceId,
          shopifyKey: "handle",
          resource: t("URL handle"),
          digest:
            selectedData?.translatableContent?.find(
              (item: any) => item.key == "handle",
            )?.digest || "",
          type:
            selectedData?.translatableContent?.find(
              (item: any) => item.key == "handle",
            )?.type || "",
          default_language:
            selectedData?.translatableContent?.find(
              (item: any) => item.key == "handle",
            )?.value || "",
          translated: selectedData?.translations?.find(
            (item: any) => item.key == "handle",
          )?.value,
        },
      ].filter((item) => item.default_language),
    );
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
      title={t("Blog titles")}
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
        ) : blogsData.length ? (
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <SideMenu
                    items={menuData}
                    selectedKeys={selectBlogKey}
                    onClick={handleMenuChange}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {pageInfo && (
                      <Pagination
                        hasPrevious={pageInfo.hasPreviousPage}
                        onPrevious={onPrevious}
                        hasNext={pageInfo.hasNextPage}
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
                          (item: any) => item.key === selectBlogKey,
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
                            key={item.key}
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
                                isSuccess={successTranslatedKey?.includes(
                                  item?.key as string,
                                )}
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
                                    resourceType: "BLOG",
                                    record: item,
                                    handleInputChange,
                                  });
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
                  <SideMenu
                    items={menuData}
                    selectedKeys={selectBlogKey}
                    onClick={handleMenuChange}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {pageInfo && (
                      <Pagination
                        hasPrevious={pageInfo.hasPreviousPage}
                        onPrevious={onPrevious}
                        hasNext={pageInfo.hasNextPage}
                        onNext={onNext}
                      />
                    )}
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
                          (item: any) => item.key === selectBlogKey,
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
