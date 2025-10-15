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
  theme,
  Typography,
  List,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";
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
import { Modal, SaveBar, TitleBar } from "@shopify/app-bridge-react";
import { Page, Select } from "@shopify/polaris";
import { setTableData } from "~/store/modules/languageTableData";
import { setLocale } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";
import { S } from "node_modules/vite/dist/node/types.d-aGj9QkWt";
import { globalStore } from "~/globalStore";

const { Text } = Typography;

const { Content } = Layout;

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
    server: process.env.SERVER_URL,
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
    const loading: string = JSON.parse(formData.get("loading") as string);
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!loading:
        try {
          const response = await admin.graphql(
            `#graphql
            query {     
              translatableResources(resourceType: ONLINE_STORE_THEME, first: 1) {
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

  const { server, searchTerm } = useLoaderData<typeof loader>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  // const [isVisible, setIsVisible] = useState<
  //   boolean | number | { language: string } | { item: string }
  // >(false);
  const [themes, setThemes] = useState<any>([]);
  const [resourceData, setResourceData] = useState<any>([]);
  const [filteredResourceData, setFilteredResourceData] = useState<any>([]);
  const [searchInput, setSearchInput] = useState("");
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
    { label: t("Product images"), value: "productImage" },
    { label: t("Product image alt text"), value: "productImageAlt" },
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ];
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("theme");
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
        loading: JSON.stringify(true),
      },
      {
        method: "POST",
        action: `/app/manage_translation/theme?language=${searchTerm}`,
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
      setThemes(themeFetcher.data.response);
    }
  }, [themeFetcher.data]);

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
    if (themes.length && isManualChangeRef.current) {
      const data = generateMenuItemsArray(themes);
      setResourceData(data);
      setFilteredResourceData(data);
      isManualChangeRef.current = false;
      setIsLoading(false);
    }
  }, [themes]);

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
          record && (
            <ManageTableInput
              record={record}
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
                "ONLINE_STORE_THEME",
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
          resourceId: themes[0]?.resourceId,
          locale: themes[0]?.translatableContent[0]?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest:
            themes[0]?.translatableContent.find((item: any) => item.key === key)
              ?.digest ||
            themes[0]?.translatableContent[0]?.digest ||
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
      const currentItem = {
        key: `${item.key}`, // 使用 key 生成唯一的 key
        resource: item.key,
        default_language: item.value, // 默认语言为 item 的标题
        translated:
          items[0]?.translations.find(
            (translation: any) => translation.key === item.key,
          )?.value || "", // 翻译字段初始化为空字符串
        type: item.type,
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
      source: themes[0]?.translatableContent.find(
        (item: any) => item.key === key,
      )?.locale,
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: server as string,
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(key)) {
        handleInputChange(key, data.response);
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
          loading: JSON.stringify(true),
        },
        {
          method: "POST",
          action: `/app/manage_translation/theme?language=${language}`,
        },
      );
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/theme?language=${language}`);
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
      action: `/app/manage_translation/theme?language=${searchTerm}`,
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
    const data = generateMenuItemsArray(themes);
    setFilteredResourceData(data); // 使用展开运算符创建新数组引用
    setConfirmData([]);
  };

  // const handleLeaveItem = (
  //   key: number | boolean | { language: string } | { item: string },
  // ) => {
  //   setIsVisible(false);
  //   if (typeof key === "number") {
  //     // 向前翻页
  //     setCurrentPage(key);
  //     setConfirmData([]);
  //   } else if (typeof key === "object" && "language" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedLanguage(key.language);
  //     navigate(`/app/manage_translation/theme?language=${key.language}`);
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
      title={t("Theme")}
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
        ) : themes.length ? (
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
                <Input
                  placeholder={t("Search...")}
                  prefix={<SearchOutlined />}
                  value={searchInput}
                  onChange={handleSearch}
                />
                <Card title={t("Resource")}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {filteredResourceData.length > 20 ? (
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
                          total: filteredResourceData.length,
                          current: currentPage,
                          showSizeChanger: false,
                        }}
                        dataSource={filteredResourceData}
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
                                      "ONLINE_STORE_THEME",
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
                      filteredResourceData.map((item: any, index: number) => (
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
                                  "ONLINE_STORE_THEME",
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
                    justifyContent: "space-between",
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
                  dataSource={filteredResourceData}
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
