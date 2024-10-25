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
import { queryNextCollections, queryPreviousCollections } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";

const { Sider, Content } = Layout;

interface CollectionType {
  handle: string;
  id: string;
  description: string | undefined;
  descriptionHtml: string | undefined;
  title: string;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  image: {
    url: string | undefined;
  };
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const collections = await queryNextCollections({ request, endCursor: "" });

    return json({
      collections,
    });
  } catch (error) {
    console.error("Error load collection:", error);
    throw new Response("Error load collection", { status: 500 });
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
      const previousCollections = await queryPreviousCollections({
        request,
        startCursor,
      }); // 处理逻辑
      return json({ previousCollections: previousCollections });
    }
    if (endCursor) {
      const nextCollections = await queryNextCollections({
        request,
        endCursor,
      }); // 处理逻辑
      return json({ nextCollections: nextCollections });
    }
  } catch (error) {
    console.error("Error action collection:", error);
    throw new Response("Error action collection", { status: 500 });
  }
};

const Index = () => {
  const { collections } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (collections: any) => {
    const data = collections.nodes.map((collection: any) => ({
      key: collection.id,
      label: collection.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(collections);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [collectionsData, setCollectionsData] = useState(collections);
  const [collectionData, setCollectionData] = useState<CollectionType>(
    collections.nodes[0],
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
      key: "collectionType",
      resource: "CollectionType",
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
  const [optionsData, setOptionsData] = useState<TableDataType[]>([]);
  const [variantsData, setVariantsData] = useState<TableDataType[]>([]);
  const [selectCollectionKey, setSelectCollectionKey] = useState(
    collections.nodes[0].id,
  );
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    collectionsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    collectionsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setHasPrevious(collectionsData.pageInfo.hasPreviousPage);
    setHasNext(collectionsData.pageInfo.hasNextPage);
  }, [collectionsData]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: collectionData.title,
        translated: "",
      },
      {
        key: "description",
        resource: "Description",
        default_language: collectionData.description,
        translated: "",
      },
    ]);
    setSeoData([
      {
        key: "url_handle",
        resource: "URL handle",
        default_language: collectionData.handle,
        translated: "",
      },
      {
        key: "meta_title",
        resource: "Meta title",
        default_language: collectionData.seo.title || collectionData.title,
        translated: "",
      },
      {
        key: "meta_description",
        resource: "Meta description",
        default_language: collectionData.seo.description,
        translated: "",
      },
    ]);
  }, [collectionData]);

  useEffect(() => {
    if (actionData && "nextCollections" in actionData) {
      const nextCollections = exMenuData(actionData.nextCollections);
      // 在这里处理 nextCollections
      console.log(nextCollections);
      setMenuData(nextCollections);
      setCollectionsData(actionData.nextCollections);
    } else {
      // 如果不存在 nextCollections，可以执行其他逻辑
      console.log("nextCollections undefined");
    }
  }, [actionData && "nextCollections" in actionData]);

  useEffect(() => {
    if (actionData && "previousCollections" in actionData) {
      const previousCollections = exMenuData(actionData.previousCollections);
      console.log(previousCollections);
      // 在这里处理 previousCollections
      setMenuData(previousCollections);
      setCollectionsData(actionData.previousCollections);
    } else {
      // 如果不存在 previousCollections，可以执行其他逻辑
      console.log("previousCollections undefined");
    }
  }, [actionData && "previousCollections" in actionData]);

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
        if (record?.key === "description") {
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
        if (record?.key === "description") {
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
    const startCursor = collectionsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/collection",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = collectionsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/collection",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 collectionsData 中对应的产品
    const selectedCollection = collectionsData.nodes.find(
      (collection: any) => collection.id === e.key,
    );

    // 如果找到了产品，就更新 collectionData
    if (selectedCollection) {
      setCollectionData(selectedCollection);
    } else {
      console.log("Collection not found");
    }

    // 更新选中的产品 key
    setSelectCollectionKey(e.key);
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
            defaultSelectedKeys={[collectionsData.nodes[0].id]}
            defaultOpenKeys={["sub1"]}
            style={{ height: "100%" }}
            items={menuData}
            // onChange={onChange}
            selectedKeys={[selectCollectionKey]}
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
