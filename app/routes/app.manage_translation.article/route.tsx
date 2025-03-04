import {
  Button,
  Layout,
  Menu,
  MenuProps,
  message,
  Modal,
  Result,
  Table,
  theme,
} from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
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

const { Sider, Content } = Layout;

interface ConfirmFetcherType {
  data: {
    success: boolean;
    errorMsg: string;
    data: {
      resourceId: string;
      key: string;
      value?: string;
    };
  }[];
}

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
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      shop,
      accessToken,
    });
    const articles = await queryNextTransType({
      request,
      resourceType: "ARTICLE",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
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
          request,
          resourceType: "ARTICLE",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousArticles: previousArticles });
      case !!endCursor:
        const nextArticles = await queryNextTransType({
          request,
          resourceType: "ARTICLE",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextArticles: nextArticles });
      case !!confirmData:
        const data = await updateManageTranslation({
          request,
          confirmData,
        });
        return json({ data: data });
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
  const { searchTerm, shopLanguagesLoad, articles } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (articles: any) => {
    const data = articles.nodes.map((article: any) => ({
      key: article?.resourceId,
      label: article?.translatableContent.find(
        (item: any) => item.key === "title",
      ).value,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(articles);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [articlesData, setArticlesData] = useState(articles);
  const [articleData, setArticleData] = useState<ArticleType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectArticleKey, setSelectArticleKey] = useState(
    articles.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});

  const [hasPrevious, setHasPrevious] = useState<boolean>(
    articlesData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    articlesData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const { t } = useTranslation();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<ConfirmFetcherType>();

  useEffect(() => {
    const data = transBeforeData({
      articles: articlesData,
    });
    setArticleData(data);
    setConfirmData([]);
    setTranslatedValues({});
  }, [selectArticleKey]);

  useEffect(() => {
    setHasPrevious(articlesData.pageInfo.hasPreviousPage);
    setHasNext(articlesData.pageInfo.hasNextPage);
  }, [articlesData]);

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
      const errorItem = confirmFetcher.data.data.find((item) => {
        item.success === false;
      });
      if (!errorItem) {
        message.success("Saved successfully");
      } else {
        message.error(errorItem?.errorMsg);
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
        return <ManageTableInput record={record} textarea={false} />;
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
            textarea={false}
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
        return <ManageTableInput record={record} textarea={false} />;
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
            textarea={false}
          />
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
          resourceId: articles.nodes.find(
            (item: any) => item?.resourceId === selectArticleKey,
          )?.resourceId,
          locale: articles.nodes
            .find((item: any) => item?.resourceId === selectArticleKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: articles.nodes
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
    const article = articles.nodes.find(
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
    <div>
      {articles.nodes.length ? (
        <Modal
          open={isVisible}
          onCancel={onCancel}
          width={"100%"}
          footer={[
            <div
              key={"footer_buttons"}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                marginTop: "-12px",
                gap: "12px"        // 使用 gap 替代 marginRight
              }}
            >
              <Button
                key={"manage_cancel_button"}
                onClick={onCancel}
                style={{ marginRight: "10px" }}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleConfirm}
                key={"manage_confirm_button"}
                type="primary"
                disabled={confirmLoading}
                loading={confirmLoading}
              >
                {t("Save")}
              </Button>
            </div>,
          ]}
        >
          <Layout
            style={{
              padding: "24px 0",
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Sider style={{ background: colorBgContainer }} width={200}>
              <Menu
                mode="inline"
                defaultSelectedKeys={[articlesData.nodes[0]?.resourceId]}
                defaultOpenKeys={["sub1"]}
                style={{ height: "100%" }}
                items={menuData}
                // onChange={onChange}
                selectedKeys={[selectArticleKey]}
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
          </Layout>
        </Modal>
      ) : (
        <Modal open={isVisible} footer={null} onCancel={onCancel}>
          <Result
            title="The specified fields were not found in the store.
"
            extra={
              <Button type="primary" onClick={onCancel}>
                OK
              </Button>
            }
          />
        </Modal>
      )}
    </div>
  );
};

export default Index;
