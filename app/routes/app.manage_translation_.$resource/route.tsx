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
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from "@remix-run/react"; // 寮曞叆 useNavigate
import { Page, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";
import { SingleTextTranslate } from "~/api/JavaServer";
import { registerManageTranslations } from "~/server/shopify/translations.server";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { SaveBar } from "@shopify/app-bridge-react";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "../app.manage_translation/route";
import {
  getManageTranslationLanguage,
  manageTranslationLanguageLoader,
} from "~/server/manageTranslation/manageTranslationRoute.server";

const { Content } = Layout;

const { Text } = Typography;


type SimpleResourceConfig = {
  slug: string;
  resourceType: string;
  itemValue: string;
  fieldKey?: string;
  fieldLabel?: string;
  expandAllContent?: boolean;
};

const SIMPLE_RESOURCE_CONFIG: Record<string, SimpleResourceConfig> = {
  filter: { slug: "filter", resourceType: "FILTER", itemValue: "filter", fieldKey: "label", fieldLabel: "label" },
  metafield: { slug: "metafield", resourceType: "METAFIELD", itemValue: "metafield", fieldKey: "value", fieldLabel: "value" },
  metaobject: { slug: "metaobject", resourceType: "METAOBJECT", itemValue: "metaobject", fieldLabel: "name" },
  delivery: { slug: "delivery", resourceType: "DELIVERY_METHOD_DEFINITION", itemValue: "delivery", fieldKey: "name", fieldLabel: "name" },
  shop: { slug: "shop", resourceType: "SHOP", itemValue: "shop", expandAllContent: true },
};

function resolveSimpleResourceConfig(resource?: string): SimpleResourceConfig {
  const config = resource ? SIMPLE_RESOURCE_CONFIG[resource] : null;
  if (!config) {
    throw new Response("Not Found", { status: 404 });
  }
  return config;
}
export const loader = manageTranslationLanguageLoader;

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const searchTerm = getManageTranslationLanguage(request);
  const config = resolveSimpleResourceConfig(params.resource);

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const startCursor = JSON.parse(formData.get("startCursor") as string);
  const endCursor = JSON.parse(formData.get("endCursor") as string);
  const confirmData: any[] = JSON.parse(formData.get("confirmData") as string);
  const refreshResourceIds: string[] = JSON.parse(
    (formData.get("refreshResourceIds") as string) || "[]",
  );
  switch (true) {
    case !!startCursor:
      try {
        const response = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: config.resourceType,
          startCursor: startCursor.cursor,
          locale: searchTerm || "",
        }); // 澶勭悊閫昏緫
        console.log(`Manage translation simple resource previous page: ${shop}`);

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
          resourceType: config.resourceType,
          endCursor: endCursor.cursor,
          locale: searchTerm || "",
        }); // 澶勭悊閫昏緫
        console.log(`Manage translation simple resource next page: ${shop}`);

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
    case refreshResourceIds.length > 0:
      try {
        const response = await admin.graphql(
          `#graphql
            query refreshSimpleResources($resourceIds: [ID!]!, $locale: String!) {
              translatableResourcesByIds(resourceIds: $resourceIds, first: 250) {
                nodes {
                  resourceId
                  translatableContent {
                    key
                    digest
                    locale
                    type
                    value
                  }
                  translations(locale: $locale) {
                    key
                    value
                  }
                }
              }
            }`,
          {
            variables: {
              resourceIds: refreshResourceIds,
              locale: searchTerm || "",
            },
          },
        );
        const data = await response.json();

        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: {
            nodes: data.data?.translatableResourcesByIds?.nodes || [],
            pageInfo: null,
          },
        };
      } catch (error) {
        console.error("Error refreshing current page:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }

    case !!confirmData:
      const data = await registerManageTranslations({
        admin,
        shop,
        confirmData,
      });

      return {
        success: true,
        errorCode: 0,
        errorMsg: "",
        response: data,
      };

    default:
      // 浣犲彲浠ュ湪杩欓噷澶勭悊涓€涓粯璁ょ殑鎯呭喌锛屽鏋滄病鏈夌鍚堢殑鏉′欢
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
  const params = useParams();
  const config = resolveSimpleResourceConfig(params.resource);
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

  const [filtersData, setFiltersData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);
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
  const [selectedItem, setSelectedItem] = useState<string>(config.itemValue);
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
        log: `${globalStore?.shop} 鐩墠鍦ㄧ炕璇戠锟?绛涢€夊櫒椤甸潰`,
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
    if (filtersData) {
      const data = generateMenuItemsArray(filtersData);
      setResourceData(data);
      setLoadingItems([]);
      setConfirmData([]);
      setSuccessTranslatedKey([]);
      setTranslatedValues({});
    }
  }, [filtersData]);

  useEffect(() => {
    if (dataFetcher.data) {
      if (dataFetcher.data?.success) {
        const newData = dataFetcher.data.response?.nodes;
        if (Array.isArray(newData)) {
          // Sort by resourceId to ensure stable order
          newData.sort((a, b) => (a.resourceId > b.resourceId ? 1 : -1));
          setFiltersData(newData);
        }
        const newPageInfo = dataFetcher.data.response?.pageInfo;

        if (newPageInfo) setPageInfo(newPageInfo);
        isManualChangeRef.current = false; // 閲嶇疆
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
      const hasInvalidDigestError =
        Array.isArray(errorItem) &&
        errorItem.some((item: any) =>
          String(item?.errorMsg || "")
            .toLowerCase()
            .includes("translatable content hash is invalid"),
        );
      if (Array.isArray(successfulItem) && successfulItem.length) {
        successfulItem.forEach((item: any) => {
          const index = filtersData.findIndex(
            (option: any) => option.resourceId === item?.response?.resourceId,
          );
          if (index !== -1) {
            const data = filtersData[index]?.translations?.find(
              (option: any) => option?.key === item?.response?.key,
            );
            if (data) {
              data.value = item?.response?.value;
            } else {
              filtersData[index].translations.push({
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
            log: `${globalStore?.shop} 缈昏瘧绠＄悊-绛涢€夊櫒椤甸潰淇敼鏁版嵁淇濆瓨鎴愬姛`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      } else {
        shopify.toast.show(t("Some items saved failed"));
        if (
          hasInvalidDigestError ||
          (Array.isArray(successfulItem) && successfulItem.length > 0)
        ) {
          refreshCurrentPageData();
        }
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
                resourceType: config.resourceType,
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

  const buildResourceRow = (item: any, content: any, index: number) => {
    const shopifyKey = config.fieldKey ?? content?.key;
    const resourceLabel = config.fieldLabel ?? content?.key ?? "";
    const translated = item?.translations?.find(
      (translation: any) => translation?.key === shopifyKey,
    )?.value;
    const currentItem = {
      key: `${shopifyKey}_${item?.resourceId}_${index}`,
      resourceId: item?.resourceId,
      shopifyKey,
      index,
      resource: config.fieldLabel ? t(resourceLabel) : resourceLabel,
      digest: content?.digest || "",
      type: content?.type || "",
      default_language: content?.value || "",
      translated,
    };

    return currentItem.default_language !== "" ? currentItem : null;
  };

  const generateMenuItemsArray = (items: any) => {
    if (config.expandAllContent) {
      const firstItem = items?.[0];
      if (!firstItem?.translatableContent?.length) return [];

      return firstItem.translatableContent
        .map((content: any, index: number) =>
          buildResourceRow(firstItem, content, index),
        )
        .filter(Boolean);
    }

    return items.flatMap((item: any, index: number) => {
      const content = item?.translatableContent?.[0];
      if (!content) return [];

      const currentItem = buildResourceRow(item, content, index);
      return currentItem ? [currentItem] : [];
    });
  };

  const handleInputChange = (record: any, value: string) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [record?.key]: value, // 鏇存柊瀵瑰簲锟?key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex(
        (item) => item.id === record?.key,
      );
      if (existingItemIndex !== -1) {
        // 濡傛灉 key 瀛樺湪锛屾洿鏂板叾瀵瑰簲锟?value
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
          value: value, // 鍒濆涓虹┖瀛楃锟?
          translatableContentDigest: record?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 灏嗘柊鏁版嵁娣诲姞锟?confirmData 锟?
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
        log: `${globalStore?.shop} 浠庣炕璇戠锟?绛涢€夊櫒椤甸潰鐐瑰嚮鍗曡缈昏瘧`,
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
      resourceId: record?.resourceId,
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(record?.key)) {
        handleInputChange(record, data.response);
        setSuccessTranslatedKey((prev) => [...prev, record?.key]);
        shopify.toast.show(t("Translated successfully"));
        fetcher.submit(
          {
            log: `${globalStore?.shop} 浠庣炕璇戠锟?绛涢€夊櫒椤甸潰鐐瑰嚮鍗曡缈昏瘧杩斿洖缁撴灉 ${data?.response}`,
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
          method: "post",
          action: `/app/manage_translation/${config.slug}?language=${language}`,
        },
      ); // 鎻愪氦琛ㄥ崟璇锋眰
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/${config.slug}?language=${language}`);
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
          action: `/app/manage_translation/${config.slug}?language=${searchTerm}`,
        },
      ); // 鎻愪氦琛ㄥ崟璇锋眰
    }
  };

  const refreshCurrentPageData = () => {
    const currentResourceIds = filtersData
      .map((item: any) => item?.resourceId)
      .filter(Boolean);

    if (currentResourceIds.length === 0) return;

    setIsLoading(true);
    dataFetcher.submit(
      {
        refreshResourceIds: JSON.stringify(currentResourceIds),
      },
      {
        method: "post",
        action: `/app/manage_translation/${config.slug}?language=${selectedLanguage}`,
      },
    );
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
          action: `/app/manage_translation/${config.slug}?language=${searchTerm}`,
        },
      ); // 鎻愪氦琛ㄥ崟璇锋眰
    }
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 灏嗛€変腑鐨勮瑷€浣滀负瀛楃涓插彂锟?
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/${config.slug}?language=${searchTerm}`,
    }); // 鎻愪氦琛ㄥ崟璇锋眰
    fetcher.submit(
      {
        log: `${globalStore?.shop} 鎻愪氦缈昏瘧绠＄悊-绛涢€夊櫒椤甸潰淇敼鏁版嵁`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    setFiltersData([...filtersData]);
    setConfirmData([]);
    setSuccessTranslatedKey([]);
  };

  const onCancel = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      navigate(`/app/manage_translation?language=${searchTerm}`); // 璺宠浆锟?/app/manage_translation
    }
  };

  return (
    <Page
      title={t("Filters")}
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
          gap: "8px",
          flexGrow: 2,
          justifyContent: "flex-end",
          marginBottom: "15px",
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
        ) : filtersData.length ? (
          <Content
            style={{
              paddingLeft: isMobile ? "16px" : "0",
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
                                  resourceType: config.resourceType,
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
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {(pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
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
                style={{ display: "flex" }}
              >
                <Table
                  columns={resourceColumns}
                  dataSource={resourceData}
                  pagination={false}
                />
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {(pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
                    <Pagination
                      hasPrevious={pageInfo.hasPreviousPage}
                      onPrevious={onPrevious}
                      hasNext={pageInfo.hasNextPage}
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
    </Page>
  );
};

export default Index;


