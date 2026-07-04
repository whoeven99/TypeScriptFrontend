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
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Pagination, Select } from "@shopify/polaris";
import { SingleTextTranslate } from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { SaveBar } from "@shopify/app-bridge-react";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "~/routes/app.manage_translation/route";
import SideMenu from "~/components/sideMenu/sideMenu";

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

type SeoContentFieldConfig = {
  key: string;
  label: string;
};

export type SeoContentResourceConfig = {
  slug: string;
  resourceType: string;
  itemValue: string;
  pageTitle: string;
  primaryFields?: SeoContentFieldConfig[];
  seoFields?: SeoContentFieldConfig[];
};

const DEFAULT_PRIMARY_FIELDS: SeoContentFieldConfig[] = [
  { key: "title", label: "Title" },
  { key: "body_html", label: "Description" },
];

const DEFAULT_SEO_FIELDS: SeoContentFieldConfig[] = [
  { key: "handle", label: "URL handle" },
  { key: "meta_title", label: "Meta title" },
  { key: "meta_description", label: "Meta description" },
];

const SeoContentResourcePage = ({ config }: { config: SeoContentResourceConfig }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm } = useLoaderData<{ searchTerm: string }>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const fetcher = useFetcher<any>();
  const dataFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);

  const [menuData, setMenuData] = useState<any[]>([]);
  const [pagesData, setPagesData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);
  const [SeoData, setSeoData] = useState<any[]>([]);
  const [selectPageKey, setSelectPageKey] = useState<string>("");
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

  const buildRowsFromResource = (
    selectedData: any,
    fields: SeoContentFieldConfig[],
  ) => {
    return fields
      .map((field, index) => {
        const content = selectedData?.translatableContent?.find(
          (item: any) => item.key === field.key,
        );
        const translation = selectedData?.translations?.find(
          (item: any) => item.key === field.key,
        );

        return {
          key: `${field.key}_${selectedData?.resourceId}_${index}`,
          resourceId: selectedData?.resourceId,
          shopifyKey: field.key,
          resource: t(field.label),
          digest: content?.digest || "",
          type: content?.type || "",
          default_language: content?.value || "",
          translated: translation?.value,
        };
      })
      .filter((item) => item.default_language);
  };

  const applySelectedResource = (selectedData: any) => {
    setResourceData(
      buildRowsFromResource(
        selectedData,
        config.primaryFields ?? DEFAULT_PRIMARY_FIELDS,
      ),
    );
    setSeoData(
      buildRowsFromResource(selectedData, config.seoFields ?? DEFAULT_SEO_FIELDS),
    );
  };

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
        log: `${globalStore?.shop} 目前在翻译管�?页面页面`,
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
    if (pagesData) {
      const selectedData = pagesData.find(
        (item: any) => item?.resourceId == selectPageKey,
      );
      applySelectedResource(selectedData);
      setLoadingItems([]);
      setConfirmData([]);
      setSuccessTranslatedKey([]);
      setTranslatedValues({});
    }
  }, [selectPageKey, pagesData]);

  useEffect(() => {
    if (dataFetcher.data) {
      if (dataFetcher.data?.success) {
        const newData = dataFetcher.data.response?.nodes;
        if (Array.isArray(newData)) {
          // Sort by resourceId to ensure stable order
          newData.sort((a, b) => (a.resourceId > b.resourceId ? 1 : -1));
          const menuData = exMenuData(newData);
          setMenuData(menuData);
          setPagesData(newData);
          setSelectPageKey(newData[0]?.resourceId);
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
      const hasInvalidDigestError =
        Array.isArray(errorItem) &&
        errorItem.some((item: any) =>
          String(item?.errorMsg || "")
            .toLowerCase()
            .includes("translatable content hash is invalid"),
        );
      if (Array.isArray(successfulItem) && successfulItem.length) {
        successfulItem.forEach((item: any) => {
          const index = pagesData.findIndex(
            (option: any) => option.resourceId === item?.response?.resourceId,
          );
          if (index !== -1) {
            const data = pagesData[index]?.translations?.find(
              (option: any) => option?.key === item?.response?.key,
            );
            if (data) {
              data.value = item?.response?.value;
            } else {
              pagesData[index].translations.push({
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
            log: `${globalStore?.shop} 翻译管理-页面页面修改数据保存成功`,
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
        return (
          <ManageTableInput
            record={record}
            isHtml={record?.shopifyKey == "body_html"}
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
          <ManageTableInput
            record={record}
            isHtml={record?.shopifyKey == "body_html"}
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

  const SEOColumns = [
    {
      title: "SEO",
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
      [record?.key]: value, // 更新对应�?key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex(
        (item) => item.id === record?.key,
      );
      if (existingItemIndex !== -1) {
        // 如果 key 存在，更新其对应�?value
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
          value: value, // 初始为空字符�?
          translatableContentDigest: record?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加�?confirmData �?
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
        log: `${globalStore?.shop} 从翻译管�?页面页面点击单行翻译`,
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
            log: `${globalStore?.shop} 从翻译管�?页面页面点击单行翻译返回结果 ${data?.response}`,
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
      ); // 提交表单请求
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

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setSelectPageKey(key);
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
      ); // 提交表单请求
    }
  };

  const refreshCurrentPageData = () => {
    const currentResourceIds = pagesData
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
      ); // 提交表单请求
    }
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发�?
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/${config.slug}?language=${searchTerm}`,
    }); // 提交表单请求
    fetcher.submit(
      {
        log: `${globalStore?.shop} 提交翻译管理-页面页面修改数据`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    const selectedData = pagesData.find(
      (item: any) => item?.resourceId == selectPageKey,
    );
    applySelectedResource(selectedData);
    setConfirmData([]);
    setSuccessTranslatedKey([]);
  };

  const onCancel = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转�?/app/manage_translation
    }
  };

  return (
    <Page
      title={t(config.pageTitle)}
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
        ) : pagesData.length ? (
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
                    selectedKeys={selectPageKey}
                    onClick={handleMenuChange}
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
                          (item: any) => item.key === selectPageKey,
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
                      {resourceData.map((item: any) => {
                        return (
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
                  {SeoData.length > 0 ? (
                    <Card title={t("SEO")}>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        {SeoData.map((item: any, index: number) => {
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
                  ) : null}
                  <SideMenu
                    items={menuData}
                    selectedKeys={selectPageKey}
                    onClick={handleMenuChange}
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
                          (item: any) => item.key === selectPageKey,
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
                  {SeoData.length > 0 ? (
                    <Table
                      columns={SEOColumns}
                      dataSource={SeoData}
                      pagination={false}
                    />
                  ) : null}
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

export default SeoContentResourcePage;


