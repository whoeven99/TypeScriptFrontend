import {
  Button,
  Card,
  Divider,
  Layout,
  Menu,
  Result,
  Space,
  Spin,
  Table,
  theme,
  Typography,
} from "antd";
import {
  useEffect,
  useState,
  useRef
} from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextTransType,
  queryPreviousTransType,
} from "~/api/admin";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { Modal, SaveBar, TitleBar } from "@shopify/app-bridge-react";
import { useDispatch, useSelector } from "react-redux";
import { ShopLocalesType } from "../app.language/route";
import { setTableData } from "~/store/modules/languageTableData";
import { setUserConfig } from "~/store/modules/userConfig";

const { Sider, Content } = Layout;

const { Title, Text } = Typography

interface ArticleType {
  key: string;
  handle: {
    value: string;
    type: string;
  };
  title: {
    value: string;
    type: string;
  };
  body: {
    value: string;
    type: string;
  };
  summary: {
    value: string;
    type: string;
  };
  seo: {
    description: {
      value: string | undefined;
      type: string;
    };
    title: {
      value: string | undefined;
      type: string;
    };
  };
  translations: {
    handle: string | undefined;
    key: string;
    title: string | undefined;
    body: string | undefined;
    summary: string | undefined;
    seo: {
      description: string | undefined;
      title: string | undefined;
    };
  };
}

type TableDataType = {
  key: string;
  resource: string;
  type: string | undefined;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  console.log(`${shop} load manage_translation_article`);

  try {
    const articles = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "ARTICLE",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      articles,
    });
  } catch (error) {
    console.error("Error load article:", error);
    throw new Response("Error load article", { status: 500 });
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
        const previousArticles = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "ARTICLE",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousArticles: previousArticles });
      case !!endCursor:
        const nextArticles = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "ARTICLE",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextArticles: nextArticles });
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
    console.error("Error action article:", error);
    throw new Response("Error action article", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, articles, server, shopName } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t } = useTranslation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const actionData = useActionData<typeof action>();
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });
  const [menuData, setMenuData] = useState<any[]>([]);
  const [articlesData, setArticlesData] = useState<any>(articles);
  const [articleData, setArticleData] = useState<ArticleType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectArticleKey, setSelectArticleKey] = useState(
    articles.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const itemOptions: { label: string; value: string }[] = [
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
  const [selectedItem, setSelectedItem] = useState<string>("article");

  const [hasPrevious, setHasPrevious] = useState<boolean>(
    articles?.pageInfo.hasPreviousPage || false
  );
  const [hasNext, setHasNext] = useState<boolean>(
    articles?.pageInfo.hasNextPage || false
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
    if (articles) {
      setMenuData(exMenuData(articles));
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
    if (articles && isManualChange.current) {
      setArticlesData(articles);
      setMenuData(exMenuData(articles));
      setSelectArticleKey(articles?.nodes[0]?.resourceId);
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      isManualChange.current = false; // 重置
    }
  }, [articles]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    const data = transBeforeData({
      articles: articlesData,
    });
    setArticleData(data);
    setLoadingItems([]);
    setConfirmData([]);
    setTranslatedValues({});
    setHasPrevious(articlesData.pageInfo.hasPreviousPage);
    setHasNext(articlesData.pageInfo.hasNextPage);
  }, [selectArticleKey, articlesData]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          resource: t("Title"),
          default_language: articleData?.title.value,
          translated: articleData?.translations?.title,
          type: articleData?.title.type,
        },
        {
          key: "body_html",
          resource: t("Description"),
          default_language: articleData?.body.value,
          translated: articleData?.translations?.body,
          type: articleData?.body.type,
        },
        {
          key: "summary",
          resource: t("Summary"),
          default_language: articleData?.summary.value,
          translated: articleData?.translations?.summary,
          type: articleData?.summary.type,
        },
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
        {
          key: "handle",
          resource: t("URL handle"),
          default_language: articleData?.handle.value,
          translated: articleData?.translations?.handle,
          type: articleData?.handle.type,
        },
        {
          key: "meta_title",
          resource: t("Meta title"),
          default_language: articleData?.seo.title.value,
          translated: articleData?.translations?.seo.title,
          type: articleData?.seo.title.type,
        },
        {
          key: "meta_description",
          resource: "Meta description",
          default_language: articleData?.seo.description.value,
          translated: articleData?.translations?.seo.description,
          type: articleData?.seo.description.type,
        },
      ].filter((item) => item.default_language),
    );
  }, [articleData]);

  useEffect(() => {
    if (actionData && "nextArticles" in actionData) {
      const nextArticles = exMenuData(actionData.nextArticles);
      // 在这里处理 nextArticles
      setMenuData(nextArticles);
      setArticlesData(actionData.nextArticles);
      setSelectArticleKey(actionData.nextArticles.nodes[0]?.resourceId);
    } else if (actionData && "previousArticles" in actionData) {
      const previousArticles = exMenuData(actionData.previousArticles);
      // 在这里处理 previousArticles
      setMenuData(previousArticles);
      setArticlesData(actionData.previousArticles);
      setSelectArticleKey(actionData.previousArticles.nodes[0]?.resourceId);
    } else {
      // 如果不存在 nextArticles，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const successfulItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === true
      );
      const errorItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === false
      );

      successfulItem.forEach((item: any) => {
        const index = articlesData.nodes.findIndex((option: any) => option.resourceId === item.data.resourceId);
        if (index !== -1) {
          const article = articlesData.nodes[index].translations.find((option: any) => option.key === item.data.key);
          if (article) {
            article.value = item.data.value;
          } else {
            articlesData.nodes[index].translations.push({
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
      shopify.saveBar.show("article-confirm-save");
    } else {
      shopify.saveBar.hide("article-confirm-save");
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
              handleTranslate("ARTICLE", record?.key || "", record?.type || "", record?.default_language || "");
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
            onClick={() => {
              handleTranslate("ARTICLE", record?.key || "", record?.type || "", record?.default_language || "");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const exMenuData = (articles: any) => {
    const data = articles.nodes.map((article: any) => ({
      key: article?.resourceId,
      label: article?.translatableContent.find(
        (item: any) => item.key === "title",
      ).value,
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
          resourceId: articlesData.nodes.find(
            (item: any) => item?.resourceId === selectArticleKey,
          )?.resourceId,
          locale: articlesData.nodes
            .find((item: any) => item?.resourceId === selectArticleKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: articlesData.nodes
            .find((item: any) => item?.resourceId === selectArticleKey)
            ?.translatableContent.find((item: any) => item.key === key)?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const transBeforeData = ({ articles }: { articles: any }) => {
    let data: ArticleType = {
      key: "",
      handle: {
        value: "",
        type: "",
      },
      title: {
        value: "",
        type: "",
      },
      body: {
        value: "",
        type: "",
      },
      summary: {
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
        handle: "",
        key: "",
        title: "",
        body: "",
        summary: "",
        seo: {
          description: "",
          title: "",
        },
      },
    };
    const article = articles.nodes.find(
      (article: any) => article?.resourceId === selectArticleKey,
    );
    data.key = article?.resourceId;
    data.handle = {
      value: article?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.value,
      type: article?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.type,
    };
    data.title = {
      value: article?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.value,
      type: article?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.type,
    };
    data.body = {
      value: article?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.value,
      type: article?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.type,
    };
    data.summary = {
      value: article?.translatableContent.find(
        (item: any) => item.key === "summary_html",
      )?.value,
      type: article?.translatableContent.find(
        (item: any) => item.key === "summary_html",
      )?.type,
    };
    data.seo.title = {
      value: article?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.value,
      type: article?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.type,
    };
    data.seo.description = {
      value: article?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.value,
      type: article?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.type,
    };
    data.translations.key = article?.resourceId;
    data.translations.title = article?.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.handle = article?.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.body = article?.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.summary = article?.translations.find(
      (item: any) => item.key === "summary_html",
    )?.value;
    data.translations.seo.title = article?.translations.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.translations.seo.description = article?.translations.find(
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
      source: articlesData.nodes
        .find((item: any) => item?.resourceId === selectArticleKey)
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

  const onPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      const formData = new FormData();
      const startCursor = articlesData.pageInfo.startCursor;
      formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/article?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const onNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      const formData = new FormData();
      const endCursor = articlesData.pageInfo.endCursor;
      formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/article?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const handleLanguageChange = (language: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedLanguage(language);
    navigate(`/app/manage_translation/article?language=${language}`);
  };

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  };

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      setSelectArticleKey(key);
    }
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/article?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("article-confirm-save");
    const data = transBeforeData({
      articles: articlesData,
    });
    setArticleData(data);
    setConfirmData([]);
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    shopify.saveBar.hide("article-confirm-save");
    navigate(`/app/manage_translation?language=${searchTerm}`, {
      state: { key: searchTerm },
    }); // 跳转到 /app/manage_translation
  };

  return (
    <>
      <SaveBar id="article-confirm-save">
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
        <TitleBar title={t("Article")} >
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
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <Spin />
            </div>
          ) : articles.nodes.length ? (
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
                    defaultSelectedKeys={[articlesData.nodes[0]?.resourceId]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                    }}
                    items={menuData}
                    selectedKeys={[selectArticleKey]}
                    onClick={(e) => handleMenuChange(e.key)}
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
                        {menuData!.find((item: any) => item.key === selectArticleKey)?.label}
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
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                  onClick={() => {
                                    handleTranslate("ARTICLE", item?.key || "", item?.type || "", item?.default_language || "");
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
                        {SeoData.map((item: any, index: number) => {
                          return (
                            <Space key={index} direction="vertical" size="small" style={{ width: '100%' }}>
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
                                    handleTranslate("ARTICLE", item?.key || "", item?.type || "", item?.default_language || "");
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
                      defaultSelectedKeys={[articlesData.nodes[0]?.resourceId]}
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        minHeight: 0,
                      }}
                      items={menuData}
                      selectedKeys={[selectArticleKey]}
                      onClick={(e) => handleMenuChange(e.key)}
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
                ) : (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {menuData!.find((item: any) => item.key === selectArticleKey)?.label}
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
    </>
  );
};

export default Index;
