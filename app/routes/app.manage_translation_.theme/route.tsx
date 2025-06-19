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
import {
  queryNextTransType,
  queryPreviousTransType,
} from "~/api/admin";
import { SearchOutlined } from "@ant-design/icons";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import ManageTableInput from "~/components/manageTableInput";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import { FullscreenBar, Select } from "@shopify/polaris";
import { setTableData } from "~/store/modules/languageTableData";
import { setUserConfig } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";

const { Text } = Typography

const { Content } = Layout;

type TableDataType = {
  key: string;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
  type: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  console.log(`${shop} load manage_translation_theme`);

  try {
    const themes = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "ONLINE_STORE_THEME",
      endCursor: "",
      locale: searchTerm || "",
    });
    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      themes,
    });
  } catch (error) {
    console.error("Error load theme:", error);
    throw new Response("Error load theme", { status: 500 });
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
        const previousThemes = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "METAFIELD",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousThemes: previousThemes });
      case !!endCursor:
        const nextThemes = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "METAFIELD",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑

        return json({ nextThemes: nextThemes });
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
          confirmData,
        });
        return json({ data: data, confirmData });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action theme:", error);
    throw new Response("Error action theme", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm, themes, server, shopName } =
    useLoaderData<typeof loader>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const { t } = useTranslation();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });
  const [resourceData, setResourceData] = useState<any>([]);
  const [filteredResourceData, setFilteredResourceData] = useState<any>([]);
  const [searchInput, setSearchInput] = useState("");
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
  const [selectedItem, setSelectedItem] = useState<string>("theme");
  const [isMobile, setIsMobile] = useState(false);

  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (languageTableData.length === 0) {
      languageFetcher.submit({
        language: JSON.stringify(true),
      }, {
        method: "post",
        action: "/app/manage_translation",
      });
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
    if (themes && isManualChange.current) {
      const start = performance.now();
      const data = generateMenuItemsArray(themes);

      const end = performance.now();
      console.log('generateMenuItemsArray 执行耗时:', (end - start).toFixed(2), 'ms');
      setResourceData(data);
      setFilteredResourceData(data);
      isManualChange.current = false;
    }
    setIsLoading(false);
  }, [themes]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
        item.success === false;
      });
      if (!errorItem) {
        confirmFetcher.data.confirmData.forEach((item: any) => {
          const index = resourceData.findIndex((option: any) => option.key === item.key);
          if (index !== -1) {
            resourceData[index].translated = item.value;
          }
        })
        shopify.toast.show("Saved successfully");
      } else {
        shopify.toast.show(errorItem?.errorMsg);
      }
      setConfirmData([]);
    }
    setConfirmLoading(false);
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (languageFetcher.data) {
      if (languageFetcher.data.data) {
        const shopLanguages = languageFetcher.data.data;
        dispatch(setTableData(shopLanguages.map((language: ShopLocalesType, index: number) => ({
          key: index,
          language: language.name,
          locale: language.locale,
          primary: language.primary,
          published: language.published,
        }))));
        const locale = shopLanguages.find(
          (language: ShopLocalesType) => language.primary === true,
        )?.locale;
        dispatch(setUserConfig({ locale: locale || "" }));
      }
    }
  }, [languageFetcher.data]);

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
              handleTranslate("ONLINE_STORE_THEME", record?.key || "", record?.type || "", record?.default_language || "");
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
          resourceId: themes.nodes[0]?.resourceId,
          locale: themes.nodes[0]?.translatableContent[0]?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest:
            themes.nodes[0]?.translatableContent.find((item: any) => item.key === key)?.digest || themes.nodes[0]?.translatableContent[0]?.digest || "",
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
          key: `${item.key}`, // 使用 key 生成唯一的 key
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

  const handleTranslate = async (resourceType: string, key: string, type: string, context: string) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: themes.nodes
        .find((item: any) => item?.resourceId === key)
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
        handleInputChange(key, data.response)
        shopify.toast.show(t("Translated successfully"))
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
    navigate(`/app/manage_translation/theme?language=${language}`);
  }

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    const filteredData = resourceData.filter((theme: any) =>
      typeof theme.default_language === 'string' &&
      theme.default_language.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredResourceData(filteredData);
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/theme?language=${searchTerm}`,
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
      <TitleBar title={t("Theme")} >
        <button
          variant="primary"
          onClick={handleConfirm}
          disabled={confirmLoading || !confirmData.length}
        >
          {t("Save")}
        </button>
      </TitleBar>
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
        ) : themes.nodes.length ? (
          <Layout
            style={{
              padding: "24px 0",
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Content
              style={{
                padding: "0 24px",
                height: 'calc(100vh - 112px)', // 64px为FullscreenBar高度
                overflow: 'auto',
                minHeight: '70vh',
              }}
            >
              {isMobile ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 2, justifyContent: 'flex-end' }}>
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
                  <Card
                    title={t("Resource")}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {filteredResourceData.length > 20 ? (
                        <List
                          itemLayout="vertical"
                          style={{ listStyle: 'none' }}
                          pagination={{
                            onChange: (page) => {
                              setCurrentPage(page);
                              // 滚动到顶部
                              window.scrollTo(0, 0);
                            },
                            pageSize: 10,
                            total: filteredResourceData.length,
                            current: currentPage,
                            showSizeChanger: false
                          }}
                          dataSource={filteredResourceData}
                          renderItem={(item: any) => (
                            <List.Item key={item.key}>
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <Text
                                  strong
                                  style={{
                                    fontSize: "16px"
                                  }}
                                >
                                  {t(item.resource)}
                                </Text>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <Text>{t("Default Language")}</Text>
                                  <ManageTableInput record={item} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <Text>{t("Translated")}</Text>
                                  <ManageTableInput
                                    translatedValues={translatedValues}
                                    setTranslatedValues={setTranslatedValues}
                                    handleInputChange={handleInputChange}
                                    isRtl={searchTerm === "ar"}
                                    record={item}
                                  />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  <Button
                                    type="primary"
                                    onClick={() => {
                                      handleTranslate("ONLINE_STORE_THEME", item?.key || "", item?.type || "", item?.default_language || "");
                                    }}
                                    loading={loadingItems.includes(item?.key || "")}
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
                        filteredResourceData.map((item: any) => (
                          <Space key={item.key} direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text strong style={{ fontSize: "16px" }}>{t(item.resource)}</Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <Text>{t("Default Language")}</Text>
                              <ManageTableInput record={item} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <Text>{t("Translated")}</Text>
                              <ManageTableInput
                                translatedValues={translatedValues}
                                setTranslatedValues={setTranslatedValues}
                                handleInputChange={handleInputChange}
                                isRtl={searchTerm === "ar"}
                                record={item}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Button
                                onClick={() => {
                                  handleTranslate("ONLINE_STORE_THEME", item?.key || "", item?.type || "", item?.default_language || "");
                                }}
                                loading={loadingItems.includes(item?.key || "")}
                              >
                                {t("Translate")}
                              </Button>
                            </div>
                            <Divider
                              style={{
                                margin: "8px 0"
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: "space-between" }}>
                    <Input
                      placeholder={t("Search...")}
                      prefix={<SearchOutlined />}
                      value={searchInput}
                      onChange={handleSearch}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 2, justifyContent: 'flex-end' }}>
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
                  <Table
                    columns={resourceColumns}
                    dataSource={filteredResourceData}
                    pagination={{ position: ["bottomCenter"], showSizeChanger: false }}
                  />
                </Space>
              )}
            </Content>
          </Layout>
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
