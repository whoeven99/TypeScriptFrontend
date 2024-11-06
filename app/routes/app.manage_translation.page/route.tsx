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
  queryNextTransType,
  queryPreviousTransType,
  queryShopLanguages,
} from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";
import { ShopLocalesType } from "../app.language/route";
import ManageModalHeader from "~/components/manageModalHeader";

const { Sider, Content } = Layout;

interface PageType {
  id: string;
  body: string | undefined;
  title: string | undefined;
  handle: string;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  translations: {
    id: string;
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
    const pages = await queryNextTransType({
      request,
      resourceType: "PAGE",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
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
  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    if (startCursor) {
      const previousPages = await queryPreviousTransType({
        request,
        resourceType: "PAGE",
        startCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      return json({ previousPages: previousPages });
    }
    if (endCursor) {
      const nextPages = await queryNextTransType({
        request,
        resourceType: "PAGE",
        endCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      return json({ nextPages: nextPages });
    }
  } catch (error) {
    console.error("Error action page:", error);
    throw new Response("Error action page", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, pages } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (pages: any) => {
    const data = pages.nodes.map((page: any) => ({
      key: page.resourceId,
      label: page.translatableContent.find((item: any) => item.key === "title")
        .value,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(pages);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [pagesData, setPagesData] = useState(pages);
  const [pageData, setPageData] = useState<PageType>();
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
  const [selectPageKey, setSelectPageKey] = useState(pages.nodes[0].resourceId);
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    pagesData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    pagesData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setHasPrevious(pagesData.pageInfo.hasPreviousPage);
    setHasNext(pagesData.pageInfo.hasNextPage);
  }, [pagesData]);

  useEffect(() => {
    const data = transBeforeData({
      pages: pagesData,
    });
    setPageData(data);
  }, [selectPageKey]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: pageData?.title,
        translated: pageData?.translations?.title,
      },
      {
        key: "body",
        resource: "Description",
        default_language: pageData?.body,
        translated: pageData?.translations?.body,
      },
    ]);
    setSeoData([
      {
        key: "url_handle",
        resource: "URL handle",
        default_language: pageData?.handle,
        translated: pageData?.translations?.handle,
      },
      {
        key: "meta_title",
        resource: "Meta title",
        default_language: pageData?.seo.title,
        translated: pageData?.translations?.seo.title,
      },
      {
        key: "meta_description",
        resource: "Meta description",
        default_language: pageData?.seo.description,
        translated: pageData?.translations?.seo.description,
      },
    ]);
  }, [pageData]);

  useEffect(() => {
    if (actionData && "nextPages" in actionData) {
      const nextPages = exMenuData(actionData.nextPages);
      // 在这里处理 nextPages
      setMenuData(nextPages);
      setPagesData(actionData.nextPages);
      setSelectPageKey(actionData.nextPages.nodes[0].resourceId);
    } else if (actionData && "previousPages" in actionData) {
      const previousPages = exMenuData(actionData.previousPages);
      // 在这里处理 previousPages
      setMenuData(previousPages);
      setPagesData(actionData.previousPages);
      setSelectPageKey(actionData.previousPages.nodes[0].resourceId);
    } else {
      // 如果不存在 nextPages，可以执行其他逻辑
      console.log("nextPages end");
    }
  }, [actionData]);

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

  const transBeforeData = ({ pages }: { pages: any }) => {
    let data: PageType = {
      id: "",
      title: "",
      body: "",
      handle: "",
      seo: {
        description: "",
        title: "",
      },
      translations: {
        id: "",
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
      (page: any) => page.resourceId === selectPageKey,
    );
    data.id = page.resourceId;
    data.title = page.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.body = page.translatableContent.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.seo.title =
      page.translatableContent.find((item: any) => item.key === "meta_title")
        ?.value ||
      page.translatableContent.find((item: any) => item.key === "title")?.value;
    data.seo.description =
      page.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.value ||
      page.translatableContent.find((item: any) => item.key === "body_html")
        ?.value;
    data.translations.id = page.resourceId;
    data.translations.title = page.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.title = page.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.seo.title =
      page.translations.find((item: any) => item.key === "meta_title")?.value ||
      page.translations.find((item: any) => item.key === "title")?.value;
    data.translations.seo.description =
      page.translations.find((item: any) => item.key === "meta_description")
        ?.value ||
      page.translations.find((item: any) => item.key === "body_html")?.value;

    return data;
  };

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

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
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
