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
import { queryNextPages, queryPreviousPages } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";

const { Sider, Content } = Layout;

interface PageType {
  id: string;
  body: string;
  title: string;
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const pages = await queryNextPages({ request, endCursor: "" });

    return json({
      pages,
    });
  } catch (error) {
    console.error("Error load page:", error);
    throw new Response("Error load page", { status: 500 });
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
      const previousPages = await queryPreviousPages({
        request,
        startCursor,
      }); // 处理逻辑
      return json({ previousPages: previousPages });
    }
    if (endCursor) {
      const nextPages = await queryNextPages({
        request,
        endCursor,
      }); // 处理逻辑
      return json({ nextPages: nextPages });
    }
  } catch (error) {
    console.error("Error action page:", error);
    throw new Response("Error action page", { status: 500 });
  }
};

const Index = () => {
  const { pages } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (pages: any) => {
    const data = pages.nodes.map((page: any) => ({
      key: page.id,
      label: page.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(pages);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [pagesData, setPagesData] = useState(pages);
  const [pageData, setPageData] = useState<PageType>(pages.nodes[0]);
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "title",
      resource: "Title",
      default_language: "",
      translated: "",
    },
    {
      key: "body",
      resource: "Content",
      default_language: "",
      translated: "",
    },
  ]);
  const [selectPageKey, setSelectPageKey] = useState(pages.nodes[0].id);
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    pagesData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    pagesData.pageInfo.hasNextPage,
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
    setHasPrevious(pagesData.pageInfo.hasPreviousPage);
    setHasNext(pagesData.pageInfo.hasNextPage);
  }, [pagesData]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: pageData.title,
        translated: "",
      },
      {
        key: "body",
        resource: "Content",
        default_language: pageData.body,
        translated: "",
      },
    ]);
  }, [pageData]);

  useEffect(() => {
    if (actionData && "nextPages" in actionData) {
      const nextPages = exMenuData(actionData.nextPages);
      // 在这里处理 nextPages
      console.log(nextPages);
      setMenuData(nextPages);
      setPagesData(actionData.nextPages);
    } else {
      // 如果不存在 nextPages，可以执行其他逻辑
      console.log("nextPages undefined");
    }
  }, [actionData && "nextPages" in actionData]);

  useEffect(() => {
    if (actionData && "previousPages" in actionData) {
      const previousPages = exMenuData(actionData.previousPages);
      console.log(previousPages);
      // 在这里处理 previousPages
      setMenuData(previousPages);
      setPagesData(actionData.previousPages);
    } else {
      // 如果不存在 previousPages，可以执行其他逻辑
      console.log("previousPages undefined");
    }
  }, [actionData && "previousPages" in actionData]);

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
        if (record?.key === "body") {
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
        if (record?.key === "body") {
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
                }}
                // onEditorChange={handleEditorChange}
              />
            );
          }
          return <Input disabled value={record?.translated} />;
      },
    },
  ];

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = pagesData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/page",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = pagesData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/page",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 pagesData 中对应的产品
    const selectedPage = pagesData.nodes.find((page: any) => page.id === e.key);

    // 如果找到了产品，就更新 pageData
    if (selectedPage) {
      setPageData(selectedPage);
    } else {
      console.log("Page not found");
    }

    // 更新选中的产品 key
    setSelectPageKey(e.key);
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
            defaultSelectedKeys={[pagesData.nodes[0].id]}
            defaultOpenKeys={["sub1"]}
            style={{ height: "100%" }}
            items={menuData}
            // onChange={onChange}
            selectedKeys={[selectPageKey]}
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
        </Content>
      </Layout>
    </Modal>
  );
};

export default Index;
