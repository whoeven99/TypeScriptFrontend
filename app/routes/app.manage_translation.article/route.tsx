import {
  Button,
  Layout,
  Menu,
  MenuProps,
  Result,
  Table,
  theme,
  Typography,
  Select
} from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { ButtonGroup, FullscreenBar, Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs, redirect } from "@remix-run/node";
import {
  queryNextTransType,
  queryPreviousTransType,
  queryShopLanguages,
} from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { SessionService } from "~/utils/session.server";
import { Modal, TitleBar } from "@shopify/app-bridge-react";

const { Sider, Content } = Layout;

const { Text } = Typography

interface ArticleType {
  handle: string;
  key: string;
  title: string;
  body: string | undefined;
  summary: string | undefined;
  seo: {
    description: string | undefined;
    title: string | undefined;
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
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const articles = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "ARTICLE",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({ searchTerm });
  } catch (error) {
    console.error("Error load article:", error);
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
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const { searchTerm } = useLoaderData<typeof loader>();
  // const actionData = useActionData<typeof action>();
  const [isLoading, setIsLoading] = useState(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>([]);
  const [articlesData, setArticlesData] = useState<any>();
  const [articleData, setArticleData] = useState<ArticleType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectArticleKey, setSelectArticleKey] = useState<any>();
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const [languageOptions, setLanguageOptions] = useState<{ label: string; value: string }[]>([]);
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);

  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const { t } = useTranslation();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const loadingFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [selectedLanguage, setSelectedLanguage] = useState();
  const [selectedItem, setSelectedItem] = useState();

  useEffect(() => {
    loadingFetcher.submit({ endCursor: JSON.stringify("") }, {
      method: "post",
      action: `/app/manage_translation/article?language=${searchTerm}`,
    });
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      console.log(loadingFetcher.data);
      
      setMenuData(exMenuData(loadingFetcher.data));
      setArticlesData(loadingFetcher.data);
      setSelectArticleKey(loadingFetcher.data.nodes[0]?.resourceId);
      setHasPrevious(loadingFetcher.data.pageInfo.hasPreviousPage);
      setHasNext(loadingFetcher.data.pageInfo.hasNextPage);
      setIsLoading(false);
    }
  }, [loadingFetcher.data]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    // const data = transBeforeData({
    //   articles: articlesData,
    // });
    // setArticleData(data);
    setConfirmData([]);
    setTranslatedValues({});
  }, [selectArticleKey]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          resource: "Title",
          default_language: articleData?.title,
          translated: articleData?.translations?.title,
        },
        {
          key: "body_html",
          resource: "Description",
          default_language: articleData?.body,
          translated: articleData?.translations?.body,
        },
        {
          key: "summary",
          resource: "Summary",
          default_language: articleData?.summary,
          translated: articleData?.translations?.summary,
        },
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
        {
          key: "handle",
          resource: "URL handle",
          default_language: articleData?.handle,
          translated: articleData?.translations?.handle,
        },
        {
          key: "meta_title",
          resource: "Meta title",
          default_language: articleData?.seo.title,
          translated: articleData?.translations?.seo.title,
        },
        {
          key: "meta_description",
          resource: "Meta description",
          default_language: articleData?.seo.description,
          translated: articleData?.translations?.seo.description,
        },
      ].filter((item) => item.default_language),
    );
  }, [articleData]);

  // useEffect(() => {
  //   if (actionData && "nextArticles" in actionData) {
  //     const nextArticles = exMenuData(actionData.nextArticles);
  //     // 在这里处理 nextArticles
  //     setMenuData(nextArticles);
  //     setArticlesData(actionData.nextArticles);
  //     setSelectArticleKey(actionData.nextArticles.nodes[0]?.resourceId);
  //   } else if (actionData && "previousArticles" in actionData) {
  //     const previousArticles = exMenuData(actionData.previousArticles);
  //     // 在这里处理 previousArticles
  //     setMenuData(previousArticles);
  //     setArticlesData(actionData.previousArticles);
  //     setSelectArticleKey(actionData.previousArticles.nodes[0]?.resourceId);
  //   } else {
  //     // 如果不存在 nextArticles，可以执行其他逻辑
  //   }
  // }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
        item.success === false;
      });
      if (!errorItem) {
        confirmFetcher.data.confirmData.forEach((item: any) => {
          const index = articlesData.nodes.findIndex((option: any) => option.resourceId === item.resourceId);
          if (index !== -1) {
            const article = articlesData.nodes[index].translations.find((option: any) => option.key === item.key);
            if (article) {
              article.value = item.value;
            } else {
              articlesData.nodes[index].translations.push({
                key: item.key,
                value: item.value,
                outdated: false,
              });
            }
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
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "45%",
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
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "45%",
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
      handle: "",
      key: "",
      title: "",
      body: "",
      summary: "",
      seo: {
        description: "",
        title: "",
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
    const article = articles?.nodes.find(
      (article: any) => article?.resourceId === selectArticleKey,
    );
    data.key = article?.resourceId;
    data.handle = article?.translatableContent.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.title = article?.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.body = article?.translatableContent.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.summary = article?.translatableContent.find(
      (item: any) => item.key === "summary_html",
    )?.value;
    data.seo.title = article?.translatableContent.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.seo.description = article?.translatableContent.find(
      (item: any) => item.key === "meta_description",
    )?.value;
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

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = articlesData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/article?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = articlesData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/article?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onClick = (e: any) => {
    // 更新选中的产品 key
    setSelectArticleKey(e.key);
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

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
  };

  return (
    <Modal
      id="article-modal"
      variant="max"
      open={isVisible}
      onHide={onCancel}
    >
      <FullscreenBar onAction={onCancel}>
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <div style={{ marginLeft: '1rem', flexGrow: 1 }}>
            <Text>
              {t("Article")}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 2, justifyContent: 'center' }}>
            <Select
              style={{ minWidth: 120 }}
              options={languageOptions}
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              placeholder="选择语言"
            />
            <Select
              style={{ minWidth: 120 }}
              options={itemOptions}
              value={selectedItem}
              onChange={setSelectedItem}
              placeholder="选择内容项"
            />
          </div>

          <Button
            type="primary"
            onClick={handleConfirm}
            disabled={confirmLoading || !confirmData.length}
            loading={confirmLoading}
          >
            {t("Save")}
          </Button>
        </div>
      </FullscreenBar>
      <Layout
        style={{
          padding: "24px 0",
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        {isLoading ? (
          <div>Loading...</div>
        ) : loadingFetcher.data.nodes.length ? (
          <>
            <Sider style={{ background: colorBgContainer }} width={200}>
              <Menu
                mode="inline"
                defaultSelectedKeys={[loadingFetcher.data.nodes[0]?.resourceId]}
                defaultOpenKeys={["sub1"]}
                style={{ height: "100%" }}
                items={menuData}
                selectedKeys={[selectArticleKey || ""]}
                onClick={onClick}
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
            <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
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
            </Content>
          </>
        ) : (
          <Result
            title="The specified fields were not found in the store.
"
            extra={
              <Button type="primary" onClick={onCancel}>
                OK
              </Button>
            }
          />
        )}
      </Layout>
    </Modal>
  );
};

export default Index;
