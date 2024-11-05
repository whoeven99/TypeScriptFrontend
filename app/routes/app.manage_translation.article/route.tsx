import { Input, Layout, Menu, MenuProps, Modal, Table, theme } from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextArticles,
  queryNextTransType,
  queryPreviousArticles,
  queryPreviousTransType,
  queryShopLanguages,
} from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";
import { ShopLocalesType } from "../app.language/route";
import ManageModalHeader from "~/components/manageModalHeader";

const { Sider, Content } = Layout;

interface ArticleType {
  handle: string;
  id: string;
  title: string;
  body: string | undefined;
  summary: string | undefined;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  translations: {
    handle: string | undefined;
    id: string;
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
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const shopLanguagesLoad: ShopLocalesType[] =
      await queryShopLanguages(request);
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
    if (startCursor) {
      const previousArticles = await queryPreviousTransType({
        request,
        resourceType: "ARTICLE",
        startCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      return json({ previousArticles: previousArticles });
    }
    if (endCursor) {
      const nextArticles = await queryNextTransType({
        request,
        resourceType: "ARTICLE",
        endCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      return json({ nextArticles: nextArticles });
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
      key: article.resourceId,
      label: article.translatableContent.find(
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
  console.log(articlesData);

  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "title",
      resource: "Title",
      default_language: "",
      translated: "",
    },
    {
      key: "description",
      resource: "Description",
      default_language: "",
      translated: "",
    },
    {
      key: "summary",
      resource: "Summary",
      default_language: "",
      translated: "",
    },
  ]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([
    {
      key: "url_handle",
      resource: "URL handle",
      default_language: "",
      translated: "",
    },
    {
      key: "meta_title",
      resource: "Meta title",
      default_language: "",
      translated: "",
    },
    {
      key: "meta_description",
      resource: "Meta description",
      default_language: "",
      translated: "",
    },
  ]);
  const [selectArticleKey, setSelectArticleKey] = useState(
    articles.nodes[0].resourceId,
  );
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
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    const data = transBeforeData({
      articles: articlesData,
    });
    setArticleData(data);
  }, [selectArticleKey]);

  useEffect(() => {
    setHasPrevious(articlesData.pageInfo.hasPreviousPage);
    setHasNext(articlesData.pageInfo.hasNextPage);
  }, [articlesData]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: articleData?.title,
        translated: articleData?.translations?.title,
      },
      {
        key: "description",
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
    ]);
    setSeoData([
      {
        key: "url_handle",
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
    ]);
  }, [articleData]);

  useEffect(() => {
    if (actionData && "nextArticles" in actionData) {
      const nextArticles = exMenuData(actionData.nextArticles);
      // 在这里处理 nextArticles
      setMenuData(nextArticles);
      setArticlesData(actionData.nextArticles);
    } else {
      // 如果不存在 nextArticles，可以执行其他逻辑
      console.log("nextArticles undefined");
    }
  }, [actionData && "nextArticles" in actionData]);

  useEffect(() => {
    if (actionData && "previousArticles" in actionData) {
      const previousArticles = exMenuData(actionData.previousArticles);
      // 在这里处理 previousArticles
      setMenuData(previousArticles);
      setArticlesData(actionData.previousArticles);
    } else {
      // 如果不存在 previousArticles，可以执行其他逻辑
      console.log("previousArticles undefined");
    }
  }, [actionData && "previousArticles" in actionData]);

  const resourceColumns = [
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      width: 150,
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      render: (_: any, record: TableDataType) => {
        if (record?.key === "description" || record?.key === "summary") {
          return (
            <Editor
              apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
              value={record.default_language || ""}
              disabled={true}
              init={{
                height: 300,
                menubar: false,
                plugins:
                  "print preview searchreplace autolink directionality visualblocks visualchars fullscreen image link media template code codesample table charmap hr pagebreak nonbreaking anchor insertdatetime advlist lists wordcount imagetools textpattern help emoticons autosave bdmap indent2em autoresize formatpainter axupimgs",
                toolbar:
                  "code undo redo restoredraft | cut copy paste pastetext | forecolor backcolor bold italic underline strikethrough link anchor | alignleft aligncenter alignright alignjustify outdent indent | \
                styleselect formatselect fontselect fontsizeselect | bullist numlist | blockquote subscript superscript removeformat | \
                table image media charmap emoticons hr pagebreak insertdatetime print preview | fullscreen | bdmap indent2em lineheight formatpainter axupimgs",
              }}
              // onEditorChange={handleEditorChange}
            />
          );
        }
        return <Input disabled value={record?.default_language} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        if (record?.key === "description" || record?.key === "summary") {
          return (
            <Editor
              apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
              value={record.translated || ""}
              init={{
                height: 300,
                menubar: false,
                plugins:
                  "print preview searchreplace autolink directionality visualblocks visualchars fullscreen image link media template code codesample table charmap hr pagebreak nonbreaking anchor insertdatetime advlist lists wordcount imagetools textpattern help emoticons autosave bdmap indent2em autoresize formatpainter axupimgs",
                toolbar:
                  "code undo redo restoredraft | cut copy paste pastetext | forecolor backcolor bold italic underline strikethrough link anchor | alignleft aligncenter alignright alignjustify outdent indent | \
                styleselect formatselect fontselect fontsizeselect | bullist numlist | blockquote subscript superscript removeformat | \
                table image media charmap emoticons hr pagebreak insertdatetime print preview | fullscreen | bdmap indent2em lineheight formatpainter axupimgs",
                // Add any additional configurations needed
                content_style:
                  "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
              }}
              // onEditorChange={handleEditorChange}
            />
          );
        }
        return <Input value={record?.translated} />;
      },
    },
  ];

  const SEOColumns = [
    {
      title: "SEO",
      dataIndex: "resource",
      key: "resource",
      width: 150,
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      render: (_: any, record: TableDataType) => {
        return <Input disabled value={record?.default_language} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        return <Input value={record?.translated} />;
      },
    },
  ];

  const transBeforeData = ({ articles }: { articles: any }) => {
    let data: ArticleType = {
      handle: "",
      id: "",
      title: "",
      body: "",
      summary: "",
      seo: {
        description: "",
        title: "",
      },
      translations: {
        handle: "",
        id: "",
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
      (article: any) => article.resourceId === selectArticleKey,
    );
    data.id = article.resourceId;
    data.handle = article.translatableContent.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.title = article.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.body = article.translatableContent.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.summary = article.translatableContent.find(
      (item: any) => item.key === "summary_html",
    )?.value;
    data.seo.title =
      article.translatableContent.find((item: any) => item.key === "meta_title")
        ?.value ||
      article.translatableContent.find((item: any) => item.key === "title")
        ?.value;
    data.seo.description =
      article.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.value ||
      article.translatableContent.find((item: any) => item.key === "body_html")
        ?.value;
    data.translations.id = article.resourceId;
    data.translations.title = article.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.handle = article.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.body = article.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.summary = article.translations.find(
      (item: any) => item.key === "summary_html",
    )?.value;
    data.translations.seo.title =
      article.translations.find((item: any) => item.key === "meta_title")
        ?.value ||
      article.translations.find((item: any) => item.key === "title")?.value;
    data.translations.seo.description =
      article.translations.find((item: any) => item.key === "meta_description")
        ?.value ||
      article.translations.find((item: any) => item.key === "body_html")?.value;
    return data;
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = articlesData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/article",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = articlesData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/article",
    }); // 提交表单请求
  };

  const onClick = (e: any) => {
    // 查找 articlesData 中对应的产品
    const selectedArticle = articlesData.nodes.find(
      (article: any) => article.id === e.key,
    );

    // 如果找到了产品，就更新 articleData
    if (selectedArticle) {
      setArticleData(selectedArticle);
    } else {
      console.log("Article not found");
    }

    // 更新选中的产品 key
    setSelectArticleKey(e.key);
  };

  return (
    <Modal
      open={isVisible}
      onCancel={onCancel}
      //   onOk={() => handleConfirm()} // 确定按钮绑定确认逻辑
      width={"100%"}
      // style={{
      //   minHeight: "100%",
      // }}
      okText="Confirm"
      cancelText="Cancel"
    >
      <Layout
        style={{
          padding: "24px 0",
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        <ManageModalHeader
          shopLanguagesLoad={shopLanguagesLoad}
          locale={searchTerm}
        />
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
              defaultSelectedKeys={[articlesData.nodes[0].id]}
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
      </Layout>
    </Modal>
  );
};

export default Index;
