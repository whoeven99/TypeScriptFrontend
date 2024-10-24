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
import { queryNextArticles, queryPreviousArticles } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";

const { Sider, Content } = Layout;

interface ArticleType {
  handle: string;
  id: string;
  title: string;
  body: string | undefined;
  summary: string | undefined;
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const articles = await queryNextArticles({ request, endCursor: "" });

    return json({
      articles,
    });
  } catch (error) {
    console.error("Error load article:", error);
    throw new Response("Error load article", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    if (startCursor) {
      const previousArticles = await queryPreviousArticles({
        request,
        startCursor,
      }); // 处理逻辑
      return json({ previousArticles: previousArticles });
    }
    if (endCursor) {
      const nextArticles = await queryNextArticles({
        request,
        endCursor,
      }); // 处理逻辑
      return json({ nextArticles: nextArticles });
    }
  } catch (error) {
    console.error("Error action article:", error);
    throw new Response("Error action article", { status: 500 });
  }
};

const Index = () => {
  const { articles } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (articles: any) => {
    const data = articles.nodes.map((article: any) => ({
      key: article.id,
      label: article.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(articles);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [articlesData, setArticlesData] = useState(articles);
  const [articleData, setArticleData] = useState<ArticleType>(
    articles.nodes[0],
  );
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
  ]);
  const [optionsData, setOptionsData] = useState<TableDataType[]>([]);
  const [variantsData, setVariantsData] = useState<TableDataType[]>([]);
  const [selectArticleKey, setSelectArticleKey] = useState(
    articles.nodes[0].id,
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

  const modules = {
    toolbar: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["bold", "italic", "underline"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["code-block"],
      ["clean"],
    ],
  };
  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const [quillLoaded, setQuillLoaded] = useState(false);

  useEffect(() => {
    setHasPrevious(articlesData.pageInfo.hasPreviousPage);
    setHasNext(articlesData.pageInfo.hasNextPage);
  }, [articlesData]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: articleData.title,
        translated: "",
      },
      {
        key: "description",
        resource: "Description",
        default_language: articleData.body,
        translated: "",
      },
      {
        key: "summary",
        resource: "Summary",
        default_language: articleData.summary,
        translated: "",
      },
    ]);
    setSeoData([
      {
        key: "url_handle",
        resource: "URL handle",
        default_language: articleData.handle,
        translated: "",
      },
    ]);
  }, [articleData]);

  useEffect(() => {
    if (actionData && "nextArticles" in actionData) {
      const nextArticles = exMenuData(actionData.nextArticles);
      // 在这里处理 nextArticles
      console.log(nextArticles);
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
      console.log(previousArticles);
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

  // const onChange = () => {

  // };

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
          <Table columns={SEOColumns} dataSource={SeoData} pagination={false} />
        </Content>
      </Layout>
    </Modal>
  );
};

export default Index;
