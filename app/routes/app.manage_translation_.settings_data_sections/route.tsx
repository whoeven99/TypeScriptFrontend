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
  List,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { SearchOutlined } from "@ant-design/icons";
import { SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import ManageTableInput from "~/components/manageTableInput";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { SaveBar } from "@shopify/app-bridge-react";
import { Page, Select } from "@shopify/polaris";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "../app.manage_translation/route";
import pkg from "lodash";
import SideMenu from "~/components/sideMenu/sideMenu";
const { isArray } = pkg;

const { Text } = Typography;

const { Sider, Content } = Layout;

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
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const loading: any = JSON.parse(formData.get("loading") as string);
  const confirmData: any[] = JSON.parse(formData.get("confirmData") as string);
  switch (true) {
    case !!loading:
      try {
        const response = await admin.graphql(
          `#graphql
            query {     
              translatableResources(resourceType: ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS, first: 1) {
                nodes {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    type
                    value
                  }
                  translations(locale: "${loading?.searchTerm || searchTerm}") {
                    value
                    key
                  }
                }
              }
            }`,
        );

        const data = await response.json();

        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: data?.data?.translatableResources || [],
        };
      } catch (error) {
        console.error("Error manage theme loading:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
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
  const [menuData, setMenuData] = useState<any>(null);
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>("");
  const [themesData, setThemesData] = useState<any[]>([]);
  const [filteredThemesData, setFilteredThemesData] = useState<any>([]);
  const [resourceData, setResourceData] = useState<any>([]);
  const [searchInput, setSearchInput] = useState("");
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
  const [selectedItem, setSelectedItem] = useState<string>(
    "settings_data_sections",
  );
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dataFetcher.submit(
      {
        loading: JSON.stringify({}),
      },
      {
        method: "POST",
      },
    );
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在翻译管理-主题页面`,
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
    if (dataFetcher.data) {
      if (dataFetcher.data?.success) {
        const newData = dataFetcher.data?.response?.nodes || [];
        if (Array.isArray(newData)) {
          const menuData = exMenuData(newData);
          setMenuData(menuData);
          setThemesData(newData);
          setFilteredThemesData(newData);
          setSelectedThemeKey(menuData[0]?.key);
        }
        isManualChangeRef.current = false; // 重置
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    }
  }, [dataFetcher.data]);

  useEffect(() => {
    const filterMenuData = exMenuData(filteredThemesData) || [];

    setMenuData(filterMenuData);

    const findIndex = filterMenuData.find(
      (item: any) => item.key == selectedThemeKey,
    );

    if (!findIndex) {
      setSelectedThemeKey(filterMenuData[0]?.key);
      return;
    }

    setResourceData(generateMenuItemsArray(filteredThemesData));
    if (currentPage !== 1) setCurrentPage(1);
  }, [filteredThemesData]);

  useEffect(() => {
    setResourceData(generateMenuItemsArray(filteredThemesData));
    setConfirmData([]);
    setSuccessTranslatedKey([]);
    if (currentPage !== 1) setCurrentPage(1);
  }, [selectedThemeKey]);

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
          const themesIndex = themesData.findIndex(
            (option: any) => option.resourceId === item?.response?.resourceId,
          );
          if (themesIndex !== -1) {
            const data = themesData[themesIndex]?.translations?.find(
              (option: any) => option?.key === item?.response?.key,
            );
            if (data) {
              data.value = item?.response?.value;
            } else {
              themesData[themesIndex].translations.push({
                key: item.response.key,
                value: item.response.value,
              });
            }
          }
          const filteredThemesIndex = themesData.findIndex(
            (option: any) => option.resourceId === item?.response?.resourceId,
          );
          if (filteredThemesIndex !== -1) {
            const data = themesData[filteredThemesIndex]?.translations?.find(
              (option: any) => option?.key === item?.response?.key,
            );
            if (data) {
              data.value = item?.response?.value;
            } else {
              themesData[filteredThemesIndex].translations.push({
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
            log: `${globalStore?.shop} 翻译管理-主题页面修改数据保存成功`,
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
      width: "20%",
      render: (_: any, record: any) => {
        return <Text style={{ display: "inline" }}>{record?.resource}</Text>;
      },
    },
    {
      title: t("Default Language"),
      dataIndex: "default_language",
      key: "default_language",
      width: "40%",
      render: (_: any, record: any) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: any) => {
        return (
          record && (
            <ManageTableInput
              record={record}
              isSuccess={successTranslatedKey?.includes(record?.key as string)}
              translatedValues={translatedValues}
              setTranslatedValues={setTranslatedValues}
              handleInputChange={handleInputChange}
              isRtl={searchTerm === "ar"}
            />
          )
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
                resourceType: "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
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

  const exMenuData = (data: any) => {
    const seen = new Set<string>();

    return data[0]?.translatableContent
      ?.map(({ key }: { key: string }) => {
        const parts = key.split(".");
        const first = parts[0];
        const second = parts[1];
        const rawLabel =
          first === "shopify" || first === "section"
            ? (second ?? first)
            : first;

        // ✅ 首字母大写
        const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

        return { key: rawLabel, label };
      })
      .filter((item: any) => {
        if (seen.has(item.label)) return false;
        seen.add(item.label);
        return true;
      });
  };

  const generateMenuItemsArray = (items: any) => {
    return items[0]?.translatableContent?.flatMap(
      (item: any, index: number) => {
        // 创建当前项的对象
        if (!item?.value) return [];
        const parts = item?.key.split(".");
        const first = parts[0];
        const second = parts[1];
        const label =
          first === "shopify" || first === "section"
            ? (second ?? first)
            : first;
        if (label !== selectedThemeKey) return [];
        const currentItem = {
          key: `${item?.key}_${items[0]?.resourceId}_${index}`,
          resourceId: items[0]?.resourceId,
          shopifyKey: item?.key,
          resource: item?.key,
          digest: item?.digest || "",
          type: item?.type || "",
          default_language: item?.value || "",
          translated: items[0]?.translations?.find(
            (translation: any) => translation.key == item?.key,
          )?.value,
        };
        return [currentItem];
      },
    );
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
    handleInputChange: (record: any, value: string) => void;
  }) => {
    fetcher.submit(
      {
        log: `${globalStore?.shop} 从翻译管理-主题页面点击单行翻译`,
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
            log: `${globalStore?.shop} 从翻译管理-主题页面点击单行翻译返回结果 ${data?.response}`,
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
          loading: JSON.stringify({
            searchTerm: language,
          }),
        },
        {
          method: "POST",
        },
      );
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(
        `/app/manage_translation/settings_data_sections?language=${language}`,
      );
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
      setSelectedThemeKey(key);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    const filteredData = [
      {
        ...themesData[0],
        translatableContent: themesData[0]?.translatableContent?.filter(
          (theme: any) =>
            typeof theme.value === "string" &&
            theme.value.toLowerCase().includes(value.toLowerCase()),
        ),
      },
    ];
    setFilteredThemesData(filteredData);
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
    }); // 提交表单请求
    fetcher.submit(
      {
        log: `${globalStore?.shop} 提交翻译管理-主题页面修改数据`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    setFilteredThemesData([...filteredThemesData]); // 使用展开运算符创建新数组引用
    setConfirmData([]);
    setSuccessTranslatedKey([]);
  };

  const onCancel = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
    }
  };

  return (
    <Page
      title={t("Settings Data Sections")}
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
          value={searchInput}
          onChange={handleSearch}
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
        ) : isArray(menuData) && menuData?.length ? (
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
                    defaultSelectedKeys={menuData[0]?.key}
                    items={menuData}
                    selectedKeys={selectedThemeKey}
                    onClick={handleMenuChange}
                  />
                </div>
              </Sider>
            )}
            <Content
              style={{
                paddingLeft: isMobile ? "0" : "24px",
                height: "calc(100% - 25px)",
                minHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
              }}
            >
              {isMobile ? (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card title={t("Resource")}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {resourceData.length > 20 ? (
                        <List
                          itemLayout="vertical"
                          style={{ listStyle: "none" }}
                          pagination={{
                            onChange: (page) => {
                              if (page !== currentPage) {
                                if (confirmData.length > 0) {
                                  shopify.saveBar.leaveConfirmation();
                                } else {
                                  setCurrentPage(page);
                                }
                              }
                            },
                            pageSize: 10,
                            total: resourceData.length,
                            current: currentPage,
                            showSizeChanger: false,
                          }}
                          dataSource={resourceData}
                          renderItem={(item: any) => (
                            <List.Item key={item.key}>
                              <Space
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
                                        resourceType:
                                          "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
                                        record: item,
                                        handleInputChange,
                                      });
                                    }}
                                    loading={loadingItems.includes(
                                      item?.key || "",
                                    )}
                                  >
                                    {t("Translate")}
                                  </Button>
                                </div>
                                <Divider style={{ margin: "8px 0" }} />
                              </Space>
                            </List.Item>
                          )}
                        />
                      ) : (
                        resourceData.map((item: any, index: number) => (
                          <Space
                            key={index}
                            direction="vertical"
                            size="small"
                            style={{ width: "100%" }}
                          >
                            <Text strong style={{ fontSize: "16px" }}>
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
                                    resourceType:
                                      "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
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
                        ))
                      )}
                    </Space>
                  </Card>
                  <SideMenu
                    defaultSelectedKeys={menuData[0]?.key}
                    items={menuData}
                    selectedKeys={selectedThemeKey}
                    onClick={handleMenuChange}
                  />
                </Space>
              ) : (
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ display: "flex" }}
                >
                  <Table
                    columns={resourceColumns}
                    dataSource={resourceData}
                    pagination={{
                      current: currentPage,
                      position: ["bottomCenter"],
                      showSizeChanger: false,
                      onChange: (page) => {
                        if (page !== currentPage) {
                          if (confirmData.length > 0) {
                            shopify.saveBar.leaveConfirmation();
                          } else {
                            setCurrentPage(page);
                          }
                        }
                      },
                    }}
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
