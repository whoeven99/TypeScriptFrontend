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
  Menu,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { SearchOutlined } from "@ant-design/icons";
import {
  ConfirmDataType,
  SingleTextTranslate,
  updateManageTranslation,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import ManageTableInput from "~/components/manageTableInput";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { SaveBar } from "@shopify/app-bridge-react";
import { Page, Select } from "@shopify/polaris";
import { setTableData } from "~/store/modules/languageTableData";
import { setLocale } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "../app.manage_translation/route";
import pkg from "lodash";
import { isHTML } from "~/utils/ishtml";
const { isArray } = pkg;

const { Text } = Typography;

const { Sider, Content } = Layout;

type TableDataType = {
  key: string;
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
  const { admin } = adminAuthResult;

  try {
    const formData = await request.formData();
    const loading: any = JSON.parse(formData.get("loading") as string);
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
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
            response: data?.data?.translatableResources?.nodes || [],
          };
        } catch (error) {
          console.error("Error manage theme loading:", error);
          return {
            success: false,
            errorCode: 0,
            errorMsg: "",
            response: [],
          };
        }
      case !!confirmData:
        try {
          const data = await updateManageTranslation({
            shop,
            accessToken: accessToken as string,
            confirmData,
          });
          return json({ data: data, confirmData });
        } catch (error) {
          console.error("Error manage theme confirmData:", error);
          return {
            data: [],
            confirmData,
          };
        }

      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action theme:", error);
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
  const themeFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [menuData, setMenuData] = useState<any>(null);
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>("");
  const [themeData, setThemeData] = useState<any>([]);
  const [resourceData, setResourceData] = useState<any>([]);
  const [filteredResourceData, setFilteredResourceData] = useState<any>([]);
  const [searchInput, setSearchInput] = useState("");
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
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
    themeFetcher.submit(
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
    if (themeFetcher.data?.success) {
      const data = generateMenuItemsArray(themeFetcher.data.response);
      setResourceData(data);
      setFilteredResourceData(data);
      isManualChangeRef.current = false;
      setTimeout(() => {
        setIsLoading(false);
      }, 5);
    }
  }, [themeFetcher.data]);

  useEffect(() => {
    const filterMenuData = exMenuData(filteredResourceData);

    setMenuData(filterMenuData);
    const findIndex = filterMenuData.find(
      (item: any) => item.key == selectedThemeKey,
    );
    if (!findIndex) setSelectedThemeKey(filterMenuData[0]?.key);
    const dataSource = filteredResourceData?.filter((item: any) => {
      const { key } = item;
      if (!key) return false;
      const parts = key.split(".");
      const first = parts[0];
      const second = parts[1];
      const label =
        first === "shopify" || first === "section" ? (second ?? first) : first;

      return label == selectedThemeKey;
    });
    setThemeData(dataSource);
    if (currentPage !== 1) setCurrentPage(1);
  }, [filteredResourceData]);

  useEffect(() => {
    const dataSource = filteredResourceData?.filter((item: any) => {
      const { key } = item;
      if (!key) return false;
      const parts = key.split(".");
      const first = parts[0];
      const second = parts[1];
      const label =
        first === "shopify" || first === "section" ? (second ?? first) : first;

      return label == selectedThemeKey;
    });
    setThemeData(dataSource);
    setConfirmData([]);
    setSuccessTranslatedKey([]);
    if (currentPage !== 1) setCurrentPage(1);
  }, [selectedThemeKey]);

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
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
        item.success === false;
      });
      if (!errorItem) {
        confirmFetcher.data.confirmData.forEach((item: any) => {
          const resourceIndex = resourceData.findIndex(
            (option: any) => option.key === item.key,
          );
          if (resourceIndex !== -1) {
            setResourceData((prev: any) => {
              const newResourceData = [...prev];
              newResourceData[resourceIndex].translated = item.value;
              return newResourceData;
            });
          }
          const filteredIndex = filteredResourceData.findIndex(
            (option: any) => option.key === item.key,
          );
          if (filteredIndex !== -1) {
            setFilteredResourceData((prev: any) => {
              const newFilteredResourceData = [...prev];
              newFilteredResourceData[filteredIndex].translated = item.value;
              return newFilteredResourceData;
            });
          }
        });
        shopify.toast.show("Saved successfully");
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
        shopify.toast.show(errorItem?.errorMsg);
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
      render: (_: any, record: TableDataType) => {
        return <Text style={{ display: "inline" }}>{record?.resource}</Text>;
      },
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
            isHtml={isHTML(record?.default_language as string)}
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
          record && (
            <ManageTableInput
              record={record}
              isHtml={isHTML(record?.default_language as string)}
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
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            onClick={() => {
              handleTranslate(
                "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
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

  const exMenuData = (data: any) => {
    const seen = new Set<string>();

    return data
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

  const handleInputChange = (key: string, value: string) => {
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
        const newItem = {
          resourceId: themeFetcher.data.response[0]?.resourceId,
          locale: themeFetcher.data.response[0]?.translatableContent[0]?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest:
            themeFetcher.data.response[0]?.translatableContent.find(
              (item: any) => item.key === key,
            )?.digest ||
            themeFetcher.data.response[0]?.translatableContent[0]?.digest ||
            "",
          target: searchTerm || "",
        };
        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const generateMenuItemsArray = (items: any) => {
    return items[0]?.translatableContent.flatMap((item: any, index: number) => {
      // 创建当前项的对象
      if (!item?.value) return [];
      const currentItem = {
        key: `${item?.key}`, // 使用 key 生成唯一的 key
        resource: item?.key,
        default_language: item?.value, // 默认语言为 item 的标题
        translated:
          items[0]?.translations.find(
            (translation: any) => translation?.key === item?.key,
          )?.value || "", // 翻译字段初始化为空字符串
        type: item?.type,
      };
      return [currentItem];
    });
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
    fetcher.submit(
      {
        log: `${globalStore?.shop} 从翻译管理-主题页面点击单行翻译`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
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
        setSuccessTranslatedKey((prev) => [...prev, key]);
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
    setLoadingItems((prev) => prev.filter((item) => item !== key));
  };

  const handleLanguageChange = (language: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setIsLoading(true);
      themeFetcher.submit(
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
    const filteredData = resourceData.filter(
      (theme: any) =>
        typeof theme.default_language === "string" &&
        theme.default_language.toLowerCase().includes(value.toLowerCase()),
    );
    setFilteredResourceData(filteredData);
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
    const data = generateMenuItemsArray(themeFetcher.data.response);
    setFilteredResourceData(data); // 使用展开运算符创建新数组引用
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
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[menuData[0]?.key]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                      backgroundColor: "var(--p-color-bg)",
                    }}
                    items={menuData}
                    selectedKeys={[selectedThemeKey]}
                    onClick={(e: any) => handleMenuChange(e.key)}
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
                      {themeData.length > 20 ? (
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
                            total: themeData.length,
                            current: currentPage,
                            showSizeChanger: false,
                          }}
                          dataSource={themeData}
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
                                      handleTranslate(
                                        "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
                                        item?.key || "",
                                        item?.type || "",
                                        item?.default_language || "",
                                      );
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
                        themeData.map((item: any, index: number) => (
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
                                  handleTranslate(
                                    "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
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
                        ))
                      )}
                    </Space>
                  </Card>
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[menuData[0]?.key]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                    }}
                    items={menuData}
                    selectedKeys={[selectedThemeKey]}
                    onClick={(e) => handleMenuChange(e.key)}
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
                    dataSource={themeData}
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
