import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { SaveBar } from "@shopify/app-bridge-react";
import { Page, Select } from "@shopify/polaris";
import {
  Button,
  Card,
  Divider,
  Input,
  Layout,
  Result,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  EditTranslatedData,
  ReadTranslatedText,
  SingleTextTranslate,
} from "~/api/JavaServer";
import SideMenu from "~/components/sideMenu/sideMenu";
import { globalStore } from "~/globalStore";
import { authenticate } from "~/shopify.server";
import { getItemOptions } from "../app.manage_translation/route";
import styles from "./styles.module.css";
import { queryPageFlyThemeData } from "~/api/admin";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

const { TextArea } = Input;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return {
    searchTerm,
    server: process.env.SERVER_URL,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;
  const formData = await request.formData();
  const GetMenuData: any = JSON.parse(formData.get("GetMenuData") as string);
  const getContentDataByFilename: any = JSON.parse(
    formData.get("getContentDataByFilename") as string,
  );

  switch (true) {
    case !!GetMenuData:
      try {
        const response = await queryPageFlyThemeData({
          shop,
          accessToken: accessToken as string,
        });

        const aisalesData = response?.aisales?.nodes[0]?.files?.nodes;
        const aispData = response?.aisp?.nodes[0]?.files?.nodes;
        const pagesData = response?.pages?.nodes[0]?.files?.nodes;
        const sectionsData = response?.sections?.nodes[0]?.files?.nodes;

        let themeJsonData: any[] = [];

        if (Array.isArray(aisalesData)) {
          const filteredAisalesData = aisalesData.filter((item) =>
            /^sections\/pf-ai-sales-page-[a-zA-Z0-9]+\.liquid$/.test(
              item?.filename,
            ),
          );

          themeJsonData.push(...filteredAisalesData);
        }

        if (Array.isArray(aispData)) {
          themeJsonData.push(...aispData);
        }

        if (Array.isArray(pagesData)) {
          const filteredPagesData = pagesData.filter((item) =>
            /^sections\/pf-[a-zA-Z0-9]+\.liquid$/.test(item?.filename),
          );

          themeJsonData.push(...filteredPagesData);
        }

        if (Array.isArray(sectionsData)) {
          const filteredSectionsData = sectionsData.filter((item) =>
            /^snippets\/pf-[a-zA-Z0-9]+\.liquid$/.test(item?.filename),
          );

          themeJsonData.push(...filteredSectionsData);
        }

        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: themeJsonData,
        };
      } catch (error) {
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }

    case !!getContentDataByFilename:
      try {
        const response = await admin.graphql(
          `#graphql
            query themeJsonByFilename ($filename: [String!]){     
                themes(first: 1 ,roles: MAIN) {
                    nodes {
                        files(first: 1, filenames: $filename) {
                            nodes {
                                body {
                                    ... on OnlineStoreThemeFileBodyText {
                                    __typename
                                    content
                                    }
                                }
                                filename
                            }
                        }
                    }
                }
            }`,
          {
            variables: {
              filename: getContentDataByFilename.filename
                ? getContentDataByFilename.filename
                : undefined,
            },
          },
        );

        const data = await response.json();

        const res = data.data?.themes?.nodes[0]?.files?.nodes;

        if (Array.isArray(res)) {
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: res[0]?.body,
          };
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      } catch (error) {
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }
  }
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm, server } = useLoaderData<typeof loader>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);
  const shopNameLiquidDataRef = useRef<any>([]);

  const dataFetcher = useFetcher<any>();
  const contentFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [menuData, setMenuData] = useState<
    {
      label: string;
      key: string;
    }[]
  >([]);
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>("");
  const [confirmData, setConfirmData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);
  const [successTranslatedKey, setSuccessTranslatedKey] = useState<string[]>(
    [],
  );
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("pagefly");
  const [loadingStatus, setLoadingStatus] = useState<{
    shopNameLiquidDataIsPost: boolean;
    isSaving: boolean;
  }>({
    shopNameLiquidDataIsPost: false,
    isSaving: false,
  });

  const itemOptions = getItemOptions(t);

  const languageOptions = useMemo(() => {
    return languageTableData
      .filter((item: any) => !item.primary)
      .map((item: any) => ({
        label: item.name,
        value: item.locale,
      }));
  }, [languageTableData]);

  useEffect(() => {
    dataFetcher.submit({ GetMenuData: JSON.stringify({}) }, { method: "POST" });
    setTimeout(() => axiosForTranslatedData(), 100);
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
    if (confirmData.length > 0) {
      shopify.saveBar.show("save-bar");
    } else {
      shopify.saveBar.hide("save-bar");
    }
  }, [confirmData]);

  useEffect(() => {
    if (dataFetcher.data) {
      if (dataFetcher.data?.success) {
        const data = dataFetcher.data?.response
          ?.map((item: any) => {
            const content = item?.body?.content || "";
            if (!content) return null;

            // 1) 先匹配 pageTitle: "xxx"
            const pageTitleMatch = content.match(/"pageTitle"\s*:\s*"([^"]+)"/);
            if (pageTitleMatch) {
              return { label: pageTitleMatch[1], key: item?.filename };
            }

            // 2) 再从 PAGEFLY_AI_SALES_PAGE 脚本里直接提取 campaign.title（兼容单/双引号）
            //    先把脚本块抓出来（贪婪匹配到最近的 </script>）
            const scriptBlockMatch = content.match(
              /<script[^>]*>[\s\S]*?PAGEFLY_AI_SALES_PAGE[\s\S]*?<\/script>/i,
            );
            if (scriptBlockMatch) {
              const scriptBlock = scriptBlockMatch[0];

              // 在脚本块里寻找 campaign: { ... title: 'xxx' ... } 的 title
              const campaignTitleMatch = scriptBlock.match(
                /campaign\s*:\s*\{[\s\S]*?title\s*:\s*['"]([^'"]+)['"]/i,
              );

              if (campaignTitleMatch) {
                return { label: campaignTitleMatch[1], key: item?.filename };
              }

              // 额外尝试直接找 window.PAGEFLY_AI_SALES_PAGE.*title = 'xxx' 或 PAGEFLY_AI_SALES_PAGE.*title:'xxx'
              const genericTitleMatch = scriptBlock.match(
                /PAGEFLY_AI_SALES_PAGE[\s\S]*?title\s*[:=]\s*['"]([^'"]+)['"]/i,
              );
              if (genericTitleMatch) {
                return { label: genericTitleMatch[1], key: item?.filename };
              }
            }

            // 3) 若两者都没有，跳过该项（返回 null）
            if (item?.filename)
              return {
                label: item?.filename,
                key: item?.filename,
              };

            return null;
          })
          // 过滤掉 null（不会出现 undefined）
          .filter(Boolean);

        if (Array.isArray(data)) {
          setMenuData(data);
          setSelectedMenuKey(data[0]?.key);
          isManualChangeRef.current = false; // 重置
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
          contentFetcher.submit(
            {
              getContentDataByFilename: JSON.stringify({
                filename: data[0]?.key,
              }),
            },
            { method: "POST" },
          );
        }
      }
    }
  }, [dataFetcher.data]);

  useEffect(() => {
    if (contentFetcher.data) {
      if (
        contentFetcher.data?.success &&
        shopNameLiquidDataRef.current &&
        !loadingStatus.shopNameLiquidDataIsPost
      ) {
        const pfLiquidData = contentFetcher.data?.response?.content;

        const pfLiquidTexts = extractTextSegmentsFromLiquid(pfLiquidData);

        if (pfLiquidTexts.length) {
          const tableData = pfLiquidTexts.map((item: any, index: number) => {
            return {
              id:
                shopNameLiquidDataRef.current?.find(
                  (shopNameLiquidDataRefItem: any) =>
                    shopNameLiquidDataRefItem?.sourceText == item,
                )?.id || null,
              key: index,
              resource: "Text",
              default_language: item,
              translated:
                shopNameLiquidDataRef.current?.find(
                  (shopNameLiquidDataRefItem: any) =>
                    shopNameLiquidDataRefItem?.sourceText == item,
                )?.targetText || "",
              type: "SINGLE_LINE_TEXT_FIELD",
            };
          });
          setResourceData(tableData);
        }
      }
    }
  }, [
    contentFetcher.data,
    shopNameLiquidDataRef.current,
    loadingStatus.shopNameLiquidDataIsPost,
  ]);

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
      render: (_: any, record: any) => {
        return (
          <TextArea
            autoSize={{
              minRows: 6,
              maxRows: 6,
            }}
            disabled
            value={record?.default_language}
          />
        );
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: any) => {
        return (
          <TextArea
            autoSize={{
              minRows: 6,
              maxRows: 6,
            }}
            disabled={loadingStatus.isSaving}
            className={
              successTranslatedKey?.includes(record?.key)
                ? styles.success_input
                : ""
            }
            value={
              confirmData.find((item: any) => item.key === record?.key)
                ? confirmData.find((item: any) => item.key === record?.key)
                    ?.value
                : record?.translated
            }
            onChange={(e) => handleInputChange(record, e.target.value)}
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
              handleTranslate(record);
            }}
            loading={loadingItems.includes(record?.key)}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const extractTextSegmentsFromLiquid = (liquidCode: string): string[] => {
    if (!liquidCode) return [];

    // HTML 实体解码函数
    const decodeHtmlEntities = (str: string): string => {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = str;
      return textarea.value;
    };

    // 1. 删除 Liquid 变量与逻辑
    let cleaned = liquidCode.replace(/{%[\s\S]*?%}/g, "");

    // 2. 删除 <style> 和 <script>
    cleaned = cleaned
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "");

    // ⭐ 提取 data-default-text
    const defaultTextMatches = [
      ...cleaned.matchAll(/data-default-text="([^"]+)"/g),
    ];
    const defaultTexts = defaultTextMatches.map((m) =>
      decodeHtmlEntities(m[1].trim()),
    );

    // 3. 提取 HTML 标签之间的文本
    const matches = cleaned.match(/>([^<]+)</g);
    const normalTexts = matches
      ? matches
          .map((m) => decodeHtmlEntities(m.replace(/[><]/g, "").trim()))
          .filter((t) => {
            if (!t) return false;
            if (/{{[\s\S]*?}}/.test(t)) return false;
            if (/{%[\s\S]*?%}/.test(t)) return false;
            return true;
          })
      : [];

    // ⭐ 去重输出
    const finalTexts = Array.from(new Set([...defaultTexts, ...normalTexts]));

    return finalTexts;
  };

  const handleInputChange = (record: any, value: string) => {
    setConfirmData((prevData: any) => {
      const existingItemIndex = prevData.findIndex(
        (item: any) => item.key === record?.key,
      );

      // ✅ 新增逻辑：如果输入值与原翻译相同，则移除该项
      if (value === record?.translated) {
        if (existingItemIndex !== -1) {
          const updatedConfirmData = [...prevData];
          updatedConfirmData.splice(existingItemIndex, 1);
          return updatedConfirmData;
        }
        return prevData; // 没有该项就直接返回原数据
      }

      // ✅ 原逻辑：更新或添加新项
      if (existingItemIndex !== -1) {
        const updatedConfirmData = [...prevData];
        updatedConfirmData[existingItemIndex] = {
          ...updatedConfirmData[existingItemIndex],
          value,
        };
        return updatedConfirmData;
      } else {
        return [
          ...prevData,
          {
            id: record?.id,
            key: record?.key,
            default_language: record?.default_language,
            value,
          },
        ];
      }
    });
  };

  const handleTranslate = async (record: any) => {
    if (!record) {
      return;
    }
    setLoadingItems((prev) => [...prev, record?.key]);
    console.log({
      shopName: globalStore?.shop || "",
      source: globalStore?.source || "",
      target: searchTerm || "",
      resourceType: record?.type,
      context: record?.default_language,
      key: record?.key,
      type: record?.type,
      server: server || "",
    });

    const data = await SingleTextTranslate({
      shopName: globalStore?.shop || "",
      source: globalStore?.source || "",
      target: searchTerm || "",
      resourceType: record?.type,
      context: record?.default_language,
      key: record?.key,
      type: record?.type,
      server: server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(record?.key)) {
        handleInputChange(record, data.response);
        setSuccessTranslatedKey((prev) => [...prev, record?.key]);
        shopify.toast.show(t("Translated successfully"));
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
        { GetMenuData: JSON.stringify({}) },
        {
          method: "post",
          action: `/app/manage_translation/pagefly?language=${language}`,
        },
      ); // 提交表单请求
      axiosForTranslatedData(language);
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/pagefly?language=${language}`);
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

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setLoadingItems([]);
      setSelectedMenuKey(key);
      axiosForTranslatedData();
      contentFetcher.submit(
        { getContentDataByFilename: JSON.stringify({ filename: key }) },
        { method: "POST" },
      );
    }
  };

  const axiosForTranslatedData = async (language?: string) => {
    setLoadingStatus({
      ...loadingStatus,
      shopNameLiquidDataIsPost: true,
    });
    const data = await ReadTranslatedText({
      shop: globalStore?.shop || "",
      server: server || "",
      languageCode: language || selectedLanguage,
    });
    if (data.success) {
      shopNameLiquidDataRef.current = data.response || [];
    }
    setLoadingStatus({
      ...loadingStatus,
      shopNameLiquidDataIsPost: false,
    });
  };

  const handleConfirm = async () => {
    setLoadingStatus({
      ...loadingStatus,
      isSaving: true,
    });
    const data = confirmData.map((item) => ({
      id: item?.id || null,
      sourceText: item.default_language,
      targetText: item.value,
      languageCode: selectedLanguage,
    }));
    const editTranslatedData = await EditTranslatedData({
      server: server || "",
      shop: globalStore?.shop || "",
      data,
    });

    if (editTranslatedData?.success) {
      shopify.toast.show(t("Saved successfully"));
    } else {
      shopify.toast.show(t("Some items saved failed"));
    }

    if (confirmData.length > 0) {
      setResourceData((prev) =>
        prev.map((item) => {
          const match = confirmData.find(
            (confirmItem: any) => confirmItem.key === item.key,
          );
          // 只更新存在于 confirmData 中的项
          if (match && match.value !== item.translated) {
            return { ...item, translated: match.value };
          }
          return item;
        }),
      );
    }
    setConfirmData([]);
    setSuccessTranslatedKey([]);
    shopify.saveBar.hide("save-bar");
    setLoadingStatus((prev) => ({
      ...prev,
      isSaving: false,
    }));
  };

  const handleDiscard = () => {
    setConfirmData([]);
    setSuccessTranslatedKey([]);
    shopify.saveBar.hide("save-bar");
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
      title={t("PageFly")}
      fullWidth={true}
      backAction={{
        onAction: onCancel,
      }}
    >
      <SaveBar id="save-bar">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={loadingStatus.isSaving ? "true" : undefined}
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
        ) : menuData.length ? (
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
                    selectedKeys={selectedMenuKey}
                    onClick={handleMenuChange}
                  />
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
                        menuData.find(
                          (item: any) => item?.key === selectedMenuKey,
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
                              <TextArea
                                autoSize={{
                                  minRows: 4,
                                  maxRows: 4,
                                }}
                                disabled
                                value={item?.default_language}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              <Text>{t("Translated")}</Text>
                              <TextArea
                                autoSize={{
                                  minRows: 4,
                                  maxRows: 4,
                                }}
                                disabled={loadingStatus.isSaving}
                                className={
                                  successTranslatedKey?.includes(item?.key)
                                    ? styles.success_input
                                    : ""
                                }
                                value={
                                  confirmData.find(
                                    (item: any) => item.key === item?.key,
                                  )
                                    ? confirmData.find(
                                        (item: any) => item.key === item?.key,
                                      )?.value
                                    : item?.translated
                                }
                                onChange={(e) =>
                                  handleInputChange(item, e.target.value)
                                }
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
                                  handleTranslate(item);
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
                    selectedKeys={selectedMenuKey}
                    onClick={handleMenuChange}
                  />
                  {/* <div style={{ display: "flex", justifyContent: "center" }}>
                    {(hasNext || hasPrevious) && (
                      <Pagination
                        hasPrevious={hasPrevious}
                        onPrevious={onPrevious}
                        hasNext={hasNext}
                        onNext={onNext}
                      />
                    )}
                  </div> */}
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
                        menuData.find(
                          (item: any) => item?.key === selectedMenuKey,
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
                    loading={
                      contentFetcher.state === "submitting" ||
                      loadingStatus.shopNameLiquidDataIsPost
                    }
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
