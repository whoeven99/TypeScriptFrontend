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
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import { ShopLocalesType } from "../app.language/route";
import { setUserConfig } from "~/store/modules/userConfig";
import { setTableData } from "~/store/modules/languageTableData";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

interface PageType {
  key: string;
  title: {
    value: string;
    type: string;
  };
  body: {
    value: string;
    type: string;
  };
  handle: {
    value: string;
    type: string;
  };
  seo: {
    title: {
      value: string;
      type: string;
    };
    description: {
      value: string;
      type: string;
    };
  };
  translations: {
    key: string;
    body: string | undefined;
    title: string | undefined;
    handle: string | undefined;
    seo: {
      description: string | undefined;
      title: string | undefined;
    };
  };
}

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

  console.log(`${shop} load manage_translation_page`);

  try {
    const pages = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "PAGE",
      endCursor: "",
      locale: searchTerm || "",
    });
    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      pages,
    });
  } catch (error) {
    console.error("Error load page:", error);
    throw new Response("Error load page", { status: 500 });
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
        const previousPages = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PAGE",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousPages: previousPages });
      case !!endCursor:
        const nextPages = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PAGE",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextPages: nextPages });
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
          confirmData,
        });
        return json({ data: data, confirmData: confirmData });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action page:", error);
    throw new Response("Error action page", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm, pages, server, shopName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();

  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const [menuData, setMenuData] = useState<any[]>([]);
  const [pagesData, setPagesData] = useState(pages);
  const [pageData, setPageData] = useState<PageType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectPageKey, setSelectPageKey] = useState(
    pages.nodes[0]?.resourceId,
  );
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
  const [selectedItem, setSelectedItem] = useState<string>("page");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    pagesData?.pageInfo.hasPreviousPage || false
  );
  const [hasNext, setHasNext] = useState<boolean>(
    pagesData?.pageInfo.hasNextPage || false
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
    if (pages) {
      setMenuData(exMenuData(pages));
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
    if (pages && isManualChange.current) {
      setPagesData(pages);
      setMenuData(exMenuData(pages));
      setSelectPageKey(pages.nodes[0]?.resourceId);
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      setHasPrevious(pagesData.pageInfo.hasPreviousPage);
      setHasNext(pagesData.pageInfo.hasNextPage);
      isManualChange.current = false; // 重置
    }
  }, [pages]);

  useEffect(() => {
    const data = transBeforeData({
      pages: pagesData,
    });
    setPageData(data);
    setConfirmData([]);
    setTranslatedValues({});
    setLoadingItems([]);
  }, [selectPageKey, pagesData]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          resource: t("Title"),
          default_language: pageData?.title.value,
          translated: pageData?.translations?.title,
          type: pageData?.title.type,
        },
        {
          key: "body",
          resource: t("Description"),
          default_language: pageData?.body.value,
          translated: pageData?.translations?.body,
          type: pageData?.body.type,
        },
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
        {
          key: "handle",
          resource: t("URL handle"),
          default_language: pageData?.handle.value,
          translated: pageData?.translations?.handle,
          type: pageData?.handle.type,
        },
        {
          key: "meta_title",
          resource: t("Meta title"),
          default_language: pageData?.seo.title.value,
          translated: pageData?.translations?.seo.title,
          type: pageData?.seo.title.type,
        },
        {
          key: "meta_description",
          resource: t("Meta description"),
          default_language: pageData?.seo.description.value,
          translated: pageData?.translations?.seo.description,
          type: pageData?.seo.description.type,
        },
      ].filter((item) => item.default_language),
    );
  }, [pageData]);

  useEffect(() => {
    if (actionData && "nextPages" in actionData) {
      const nextPages = exMenuData(actionData.nextPages);
      // 在这里处理 nextPages
      setMenuData(nextPages);
      setPagesData(actionData.nextPages);
      setSelectPageKey(actionData.nextPages.nodes[0]?.resourceId);
    } else if (actionData && "previousPages" in actionData) {
      const previousPages = exMenuData(actionData.previousPages);
      // 在这里处理 previousPages
      setMenuData(previousPages);
      setPagesData(actionData.previousPages);
      setSelectPageKey(actionData.previousPages.nodes[0]?.resourceId);
    } else {
      // 如果不存在 nextPages，可以执行其他逻辑
    }
  }, [actionData]);

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
        const index = pagesData.nodes.findIndex((option: any) => option.resourceId === item.data.resourceId);
        if (index !== -1) {
          const page = pagesData.nodes[index].translations.find((option: any) => option.key === item.data.key);
          if (page) {
            page.value = item.data.value;
          } else {
            pagesData.nodes[index].translations.push({
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
            type="primary"
            onClick={() => {
              handleTranslate("PAGE", record?.key || "", record?.type || "", record?.default_language || "");
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
            type="primary"
            onClick={() => {
              handleTranslate("PAGE", record?.key || "", record?.type || "", record?.default_language || "");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const exMenuData = (pages: any) => {
    const data = pages.nodes.map((page: any) => ({
      key: page?.resourceId,
      label: page?.translatableContent.find((item: any) => item.key === "title")
        .value,
    }));
    return data;
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
          resourceId: pagesData.nodes.find(
            (item: any) => item?.resourceId === selectPageKey,
          )?.resourceId,
          locale: pagesData.nodes
            .find((item: any) => item?.resourceId === selectPageKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: pagesData.nodes
            .find((item: any) => item?.resourceId === selectPageKey)
            ?.translatableContent.find((item: any) => item.key === key)?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const transBeforeData = ({ pages }: { pages: any }) => {
    let data: PageType = {
      key: "",
      title: {
        value: "",
        type: "",
      },
      body: {
        value: "",
        type: "",
      },
      handle: {
        value: "",
        type: "",
      },
      seo: {
        description: {
          value: "",
          type: "",
        },
        title: {
          value: "",
          type: "",
        },
      },
      translations: {
        key: "",
        title: "",
        body: "",
        handle: "",
        seo: {
          description: "",
          title: "",
        },
      },
    };
    const page = pages.nodes.find(
      (page: any) => page?.resourceId === selectPageKey,
    );
    data.key = page?.resourceId;
    data.title = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.type,
    }
    data.body = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.type,
    }
    data.handle = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.type,
    }
    data.seo.title = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.type,
    }
    data.seo.description = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.type,
    }
    data.translations.key = page?.resourceId;
    data.translations.title = page?.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.body = page?.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.handle = page?.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.seo.title = page?.translations.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.translations.seo.description = page?.translations.find(
      (item: any) => item.key === "meta_description",
    )?.value;
    return data;
  };

  const handleTranslate = async (resourceType: string, key: string, type: string, context: string) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: pagesData.nodes
        .find((item: any) => item?.resourceId === selectPageKey)
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
    navigate(`/app/manage_translation/page?language=${language}`);
  }

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  }

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = pagesData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/page?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = pagesData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/page?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/page?language=${searchTerm}`,
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
      variant="max"
      open={isVisible}
      onHide={onCancel}
    >
      <TitleBar title={t("Pages")} >
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
        ) : pages.nodes.length ? (
          <>
            {!isMobile && (
              <Sider
                style={{
                  background: colorBgContainer,
                  height: 'calc(100vh - 124px)',
                  minHeight: '70vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'auto',
                }}
              >
                <Menu
                  mode="inline"
                  defaultSelectedKeys={[pagesData.nodes[0]?.resourceId]}
                  defaultOpenKeys={["sub1"]}
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0,
                  }}
                  items={menuData}
                  selectedKeys={[selectPageKey]}
                  onClick={(e: any) => {
                    setSelectPageKey(e.key);
                  }}
                />
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Pagination
                    hasPrevious={hasPrevious}
                    onPrevious={onPrevious}
                    hasNext={hasNext}
                    onNext={onNext}
                  />
                </div>
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
                      {menuData!.find((item: any) => item.key === selectPageKey)?.label}
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
                      {resourceData.map((item: any) => {
                        return (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
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
                                type="primary"
                                onClick={() => {
                                  handleTranslate("PAGE", item?.key || "", item?.type || "", item?.default_language || "");
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
                  <Card
                    title={t("SEO")}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {SeoData.map((item: any) => {
                        return (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
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
                                type="primary"
                                onClick={() => {
                                  handleTranslate("PAGE", item?.key || "", item?.type || "", item?.default_language || "");
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
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[pagesData.nodes[0]?.resourceId]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                    }}
                    items={menuData}
                    selectedKeys={[selectPageKey]}
                    onClick={(e) => setSelectPageKey(e.key)}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Pagination
                      hasPrevious={hasPrevious}
                      onPrevious={onPrevious}
                      hasNext={hasNext}
                      onNext={onNext}
                    />
                  </div>
                </Space>) : (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {menuData!.find((item: any) => item.key === selectPageKey)?.label}
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
                  <Table
                    columns={SEOColumns}
                    dataSource={SeoData}
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
  );
};

export default Index;
