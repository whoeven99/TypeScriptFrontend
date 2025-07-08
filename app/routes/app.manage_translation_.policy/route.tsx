import {
  Button,
  Card,
  Divider,
  Layout,
  Menu,
  MenuProps,
  Result,
  Space,
  Spin,
  Table,
  theme,
  Typography,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType } from "~/api/admin";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import ManageTableInput from "~/components/manageTableInput";
import { useDispatch, useSelector } from "react-redux";
import { Modal, SaveBar, TitleBar } from "@shopify/app-bridge-react";
import { FullscreenBar, Select } from "@shopify/polaris";
import { setTableData } from "~/store/modules/languageTableData";
import { setUserConfig } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

type TableDataType = {
  key: string;
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

  console.log(`${shop} load manage_translation_policy`);

  try {
    const policies = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "SHOP_POLICY",
      endCursor: "",
      locale: searchTerm || "",
    });
    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      policies,
    });
  } catch (error) {
    console.error("Error load policy:", error);
    throw new Response("Error load policy", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
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
    console.error("Error action policy:", error);
    throw new Response("Error action policy", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm, policies, server, shopName } =
    useLoaderData<typeof loader>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const { t } = useTranslation();
  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const languageTableData = useSelector((state: any) => state.languageTableData.rows);

  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const menuData: any = useMemo(() => policies.nodes.map((policy: any) => ({
    key: policy.resourceId,
    label: policy.translatableContent.find((item: any) => item.key === "body")
      .value,
  })), [policies]);

  const [policyData, setPolicyData] = useState<any>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectPolicyKey, setSelectPolicyKey] = useState(policies.nodes[0]?.resourceId);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{ [key: string]: string }>({});
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
  ]
  const [languageOptions, setLanguageOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(searchTerm || "");
  const [selectedItem, setSelectedItem] = useState<string>("policy");
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
    if (policies) {
      setIsLoading(false);
    }
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
    if (policies && isManualChange.current) {
      setSelectPolicyKey(policies?.nodes[0]?.resourceId);
      isManualChange.current = false;
      setIsLoading(false);
    }
  }, [policies]);

  useEffect(() => {
    const data: any = policies.nodes.find(
      (policy: any) => policy.resourceId === selectPolicyKey,
    );
    setConfirmData([]);
    setPolicyData(data);
    setTranslatedValues({});
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
    setLoadingItems([]);
  }, [selectPolicyKey, policies]);

  useEffect(() => {
    setResourceData([
      {
        key: "body",
        resource: "Content",
        default_language: policyData?.translatableContent[0]?.value,
        translated: policyData?.translations[0]?.value,
        type: policyData?.translatableContent[0]?.type,
      },
    ]);
  }, [policyData]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const successfulItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === true
      );
      const errorItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === false
      );

      successfulItem.forEach((item: any) => {
        const index = policies.nodes.findIndex((option: any) => option.resourceId === item.data.resourceId);
        if (index !== -1) {
          const policy = policies.nodes[index].translations.find((option: any) => option.key === item.data.key);
          if (policy) {
            policy.value = item.data.value;
          } else {
            policies.nodes[index].translations.push({
              key: item.data.key,
              value: item.data.value,
            });
          }
        }
      })
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

  useEffect(() => {
    if (confirmData.length > 0) {
      shopify.saveBar.show("policy-confirm-save");
    } else {
      shopify.saveBar.hide("policy-confirm-save");
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
        return (
          <ManageTableInput record={record} />
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
              translatedValues={translatedValues}
              setTranslatedValues={setTranslatedValues}
              handleInputChange={handleInputChange}
              isRtl={searchTerm === "ar"}
            />
          )
        );
      },
    },
    // {
    //   title: t("Translate"),
    //   width: "10%",
    //   render: (_: any, record: TableDataType) => {
    //     return (
    //       <Button
    //         onClick={() => {
    //           handleTranslate("SHOP_POLICY", record?.key || "", record?.type || "", record?.default_language || "");
    //         }}
    //         loading={loadingItems.includes(record?.key || "")}
    //       >
    //         {t("Translate")}
    //       </Button>
    //     );
    //   },
    // },
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
          resourceId: policyData.resourceId,
          locale: policyData.translatableContent.find(
            (item: any) => item.key === key,
          )?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: policyData.translatableContent.find(
            (item: any) => item.key === key,
          )?.digest,
          target: searchTerm || "",
        };
        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const handleTranslate = async (resourceType: string, key: string, type: string, context: string) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: policies.nodes
        .find((item: any) => item?.resourceId === selectPolicyKey)
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
    navigate(`/app/manage_translation/policy?language=${language}`);
  }

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  }

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      setSelectPolicyKey(key);
    }
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/policy?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("policy-confirm-save");
    const data: any = policies.nodes.find(
      (policy: any) => policy.resourceId === selectPolicyKey,
    );
    setPolicyData(data);
    setConfirmData([]);
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    shopify.saveBar.hide("policy-confirm-save");
    navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
  };

  return (
    <>
      <SaveBar id="policy-confirm-save">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={confirmLoading && ""}
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
        <TitleBar title={t("Policies")} >
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
          ) : policies.nodes.length ? (
            <>
              {!isMobile
                &&
                (
                  <Sider
                    style={{
                      background: colorBgContainer,
                      height: 'calc(100vh - 124px)',
                      width: '200px',
                    }}
                  >
                    <Menu
                      mode="inline"
                      style={{ height: "100%" }}
                      items={menuData}
                      selectedKeys={[selectPolicyKey]}
                      onClick={(e: any) => {
                        handleMenuChange(e.key);
                      }}
                    />
                  </Sider>
                )}
              <Content
                style={{
                  padding: "0 24px",
                  height: 'calc(100vh - 112px)', // 64px为FullscreenBar高度
                }}
              >
                {isMobile ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {menuData!.find((item: any) => item.key === selectPolicyKey)?.label}
                      </Title>
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
                              {/* <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                  onClick={() => {
                                    handleTranslate("ARTICLE", item?.key || "", item?.type || "", item?.default_language || "");
                                  }}
                                  loading={loadingItems.includes(item?.key || "")}
                                >
                                  {t("Translate")}
                                </Button>
                              </div> */}
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
                    <Menu
                      mode="inline"
                      style={{ height: "100%" }}
                      items={menuData}
                      selectedKeys={[selectPolicyKey]}
                      onClick={(e: any) => {
                        handleMenuChange(e.key);
                      }}
                    />
                  </Space>
                ) : (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title
                        level={4}
                        style={{
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                        {menuData!.find((item: any) => item.key === selectPolicyKey)?.label}
                      </Title>
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
      </Modal>
    </>
  );
};

export default Index;
