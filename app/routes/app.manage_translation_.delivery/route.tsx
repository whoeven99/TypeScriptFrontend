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
import { FullscreenBar, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextTransType,
  queryPreviousTransType,
} from "~/api/admin";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Modal, SaveBar, TitleBar } from "@shopify/app-bridge-react";
import { setTableData } from "~/store/modules/languageTableData";
import { setUserConfig } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";

const { Content } = Layout;

const { Text } = Typography

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
  console.log(`${shop} load manage_translation_delivery`);

  try {
    const deliverys = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "DELIVERY_METHOD_DEFINITION",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      deliverys,
    });
  } catch (error) {
    console.error("Error load delivery:", error);
    throw new Response("Error load delivery", { status: 500 });
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
        const previousDeliverys = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "DELIVERY_METHOD_DEFINITION",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ data: previousDeliverys });
      case !!endCursor:
        const nextDeliverys = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "DELIVERY_METHOD_DEFINITION",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ data: nextDeliverys });
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
    console.error("Error action delivery:", error);
    throw new Response("Error action delivery", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm, deliverys, server, shopName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const { t } = useTranslation();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const [deliverysData, setDeliverysData] = useState(deliverys);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
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
  const [selectedItem, setSelectedItem] = useState<string>("delivery");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    deliverys.pageInfo.hasPreviousPage || false
  );
  const [hasNext, setHasNext] = useState<boolean>(
    deliverys.pageInfo.hasNextPage || false
  );
  const [isMobile, setIsMobile] = useState(false);

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
    if (deliverys && isManualChange.current) {
      setDeliverysData(deliverys);
      isManualChange.current = false; // 重置
    }
  }, [deliverys]);

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
    setHasPrevious(deliverysData.pageInfo.hasPreviousPage);
    setHasNext(deliverysData.pageInfo.hasNextPage);
    const data = generateMenuItemsArray(deliverysData);
    setResourceData(data);
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [deliverysData]);

  useEffect(() => {
    if (actionData && "data" in actionData) {
      // 在这里处理 nexts
      setDeliverysData(actionData.data);
    } else {
      // 如果不存在 nexts，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    if (confirmData.length > 0) {
      shopify.saveBar.show("delivery-confirm-save");
    } else {
      shopify.saveBar.hide("delivery-confirm-save");
    }
  }, [confirmData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === false
      );
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
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
              handleTranslate("DELIVERY_METHOD_DEFINITION", record?.key || "", record?.type || "", record?.default_language || "", record?.index || 0);
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
          resourceId: deliverysData.nodes[index]?.resourceId,
          locale: deliverysData.nodes[index]?.translatableContent[0]?.locale,
          key: "name",
          value: value, // 初始为空字符串
          translatableContentDigest:
            deliverysData.nodes[index]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const generateMenuItemsArray = (items: any) => {
    return items.nodes.flatMap((item: any, index: number) => {
      if (item?.translatableContent.length !== 0) {
        // 创建当前项的对象
        const currentItem = {
          key: `${item?.resourceId}`, // 使用 key 生成唯一的 key
          index: index,
          resource: t("name"), // 资源字段固定为 "Menu Items"
          default_language: item?.translatableContent[0]?.value, // 默认语言为 item 的标题
          translated: item?.translations[0]?.value, // 翻译字段初始化为空字符串
          type: item?.translatableContent[0]?.type, // 翻译字段初始化为空字符串
        };
        return currentItem.default_language !== "" ? [currentItem] : [];
      }
      return [];
    });
  };

  const handleTranslate = async (resourceType: string, key: string, type: string, context: string, index: number) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: deliverysData.nodes
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
        handleInputChange(key, data.response, index)
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
    navigate(`/app/manage_translation/delivery?language=${language}`);
  }

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  }

  const onPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      const formData = new FormData();
      const startCursor = deliverysData.pageInfo.startCursor;
      formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/delivery?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const onNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      const formData = new FormData();
      const endCursor = deliverysData.pageInfo.endCursor;
      formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/delivery?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/delivery?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("delivery-confirm-save");
    setDeliverysData({ ...deliverysData });
    setConfirmData([]);
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    shopify.saveBar.hide("delivery-confirm-save");
    navigate(`/app/manage_translation?language=${searchTerm}`, {
      state: { key: searchTerm },
    }); // 跳转到 /app/manage_translation
  };

  return (
    <>
      <SaveBar id="delivery-confirm-save">
        <button
          variant="primary"
          onClick={handleConfirm}
        >
        </button>
        <button
          onClick={handleDiscard}
        >
        </button>
      </SaveBar>
      <Modal
        variant="max"
        open={isVisible}
        onHide={onCancel}
      >
        <TitleBar title={t("Delivery")} >
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
          ) : deliverys.nodes.length ? (
            <Content
              style={{
                padding: "0 24px",
                height: 'calc(100vh - 112px)', // 64px为FullscreenBar高度
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
                  <Card
                    title={t("Resource")}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {resourceData.map((item: any, index: number) => {
                        return (
                          <Space
                            key={item.key}
                            direction="vertical"
                            size="small"
                            style={{ width: '100%' }}
                          >
                            <Text
                              strong
                              style={{
                                fontSize: "16px"
                              }}>
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
                                onClick={() => {
                                  handleTranslate("DELIVERY_METHOD_DEFINITION", item?.key || "", item?.type || "", item?.default_language || "", item?.index || 0);
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
                        )
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 2, justifyContent: 'flex-end' }}>
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
      </Modal>
    </>
  );
};

export default Index;
