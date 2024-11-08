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

interface CollectionType {
  handle: string;
  id: string;
  descriptionHtml: string | undefined;
  title: string;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  translations: {
    handle: string;
    id: string;
    descriptionHtml: string | undefined;
    title: string;
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
      await queryShopLanguages({request});
    const collections = await queryNextTransType({
      request,
      resourceType: "COLLECTION",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      collections,
    });
  } catch (error) {
    console.error("Error load collection:", error);
    throw new Response("Error load collection", { status: 500 });
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
      const previousCollections = await queryPreviousTransType({
        request,
        resourceType: "COLLECTION",
        startCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      return json({ previousCollections: previousCollections });
    }
    if (endCursor) {
      const nextCollections = await queryNextTransType({
        request,
        resourceType: "COLLECTION",
        endCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      return json({ nextCollections: nextCollections });
    }
  } catch (error) {
    console.error("Error action collection:", error);
    throw new Response("Error action collection", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, collections } =
    useLoaderData<typeof loader>();
  console.log(collections);
  const actionData = useActionData<typeof action>();

  const exMenuData = (collections: any) => {
    const data = collections.nodes.map((collection: any) => ({
      key: collection.resourceId,
      label: collection.translatableContent.find(
        (item: any) => item.key === "title",
      ).value,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(collections);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [collectionsData, setCollectionsData] = useState(collections);
  const [collectionData, setCollectionData] = useState<CollectionType>();
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
  const [selectCollectionKey, setSelectCollectionKey] = useState(
    collections.nodes[0].resourceId,
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
    const data = transBeforeData({
      collections: collectionsData,
    });
    setCollectionData(data);
  }, [selectCollectionKey]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: collectionData?.title,
        translated: collectionData?.translations?.title,
      },
      {
        key: "description",
        resource: "Description",
        default_language: collectionData?.descriptionHtml,
        translated: collectionData?.translations?.descriptionHtml,
      },
    ]);
    setSeoData([
      {
        key: "url_handle",
        resource: "URL handle",
        default_language: collectionData?.handle,
        translated: collectionData?.translations?.handle,
      },
      {
        key: "meta_title",
        resource: "Meta title",
        default_language: collectionData?.seo.title,
        translated: collectionData?.translations?.seo.title,
      },
      {
        key: "meta_description",
        resource: "Meta description",
        default_language: collectionData?.seo.description,
        translated: collectionData?.translations?.seo.description,
      },
    ]);
  }, [collectionData]);

  useEffect(() => {
    if (actionData && "nextCollections" in actionData) {
      const nextCollections = exMenuData(actionData.nextCollections);
      // 在这里处理 nextCollections
      setMenuData(nextCollections);
      setCollectionsData(actionData.nextCollections);
      setSelectCollectionKey(actionData.nextCollections.nodes[0].resourceId);
    } else if (actionData && "previousCollections" in actionData) {
      const previousCollections = exMenuData(actionData.previousCollections);
      // 在这里处理 previousCollections
      setMenuData(previousCollections);
      setCollectionsData(actionData.previousCollections);
      setSelectCollectionKey(
        actionData.previousCollections.nodes[0].resourceId,
      );
    } else {
      // 如果不存在 nextCollections，可以执行其他逻辑
      console.log("nextCollections end");
    }
  }, [actionData]);

  const resourceColumns = [
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        if (record?.key === "description") {
          return (
            <Editor
              apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
              value={record.default_language || ""}
              disabled={true}
              init={{
                min_height: 300,
                max_height: 300,
                menubar: false,
                plugins:
                  "print preview searchreplace autolink directionality visualblocks visualchars fullscreen image link media template code codesample table charmap hr pagebreak nonbreaking anchor insertdatetime advlist lists wordcount imagetools textpattern help emoticons autosave bdmap indent2em autoresize formatpainter axupimgs",
                toolbar:
                  "code undo redo restoredraft | cut copy paste pastetext | forecolor backcolor bold italic underline strikethrough link anchor | alignleft aligncenter alignright alignjustify outdent indent | \
                styleselect formatselect fontselect fontsizeselect | bullist numlist | blockquote subscript superscript removeformat | \
                table image media charmap emoticons hr pagebreak insertdatetime print preview | fullscreen | bdmap indent2em lineheight formatpainter axupimgs",
                setup: (editor) => {
                  // 初始化时启用 "code" 按钮
                  editor.on("init", () => {
                    const codeButton = editor
                      .getContainer()
                      .querySelector('button[data-mce-name="code"]');
                    if (
                      codeButton &&
                      codeButton.classList.contains("tox-tbtn--disabled")
                    ) {
                      codeButton.classList.remove("tox-tbtn--disabled");
                      codeButton.setAttribute("aria-disabled", "false");
                      (codeButton as HTMLButtonElement).disabled = false;
                    }
                  });

                  // 限制图片的最大宽度
                  editor.on("NodeChange", (e) => {
                    const imgElements = editor.getDoc().querySelectorAll("img");
                    imgElements.forEach((img) => {
                      img.style.maxWidth = "100%"; // 最大宽度为100%
                      img.style.height = "auto"; // 保持比例
                    });
                  });

                  // 插入图片时设置样式
                  editor.on("BeforeSetContent", (e) => {
                    const content = e.content;
                    // 如果包含图片，添加最大宽度限制
                    if (content.includes("<img")) {
                      e.content = content.replace(
                        /<img/g,
                        '<img style="max-width: 100%; height: auto;"',
                      );
                    }
                  });
                },
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
      width: "45%",
      render: (_: any, record: TableDataType) => {
        if (record?.key === "description") {
          return (
            <Editor
              apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
              value={record.translated || ""}
              init={{
                min_height: 300,
                max_height: 300,
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
                setup: (editor) => {
                  // 限制图片的最大宽度
                  editor.on("NodeChange", (e) => {
                    const imgElements = editor.getDoc().querySelectorAll("img");
                    imgElements.forEach((img) => {
                      img.style.maxWidth = "100%"; // 最大宽度为100%
                      img.style.height = "auto"; // 保持比例
                    });
                  });

                  // 插入图片时设置样式
                  editor.on("BeforeSetContent", (e) => {
                    const content = e.content;
                    // 如果包含图片，添加最大宽度限制
                    if (content.includes("<img")) {
                      e.content = content.replace(
                        /<img/g,
                        '<img style="max-width: 100%; height: auto;"',
                      );
                    }
                  });
                },
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
      width: "10%",
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <Input disabled value={record?.default_language} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <Input value={record?.translated} />;
      },
    },
  ];

  const transBeforeData = ({ collections }: { collections: any }) => {
    let data: CollectionType = {
      handle: "",
      id: "",
      descriptionHtml: "",
      seo: {
        description: "",
        title: "",
      },
      title: "",
      translations: {
        handle: "",
        id: "",
        descriptionHtml: "",
        seo: {
          description: "",
          title: "",
        },
        title: "",
      },
    };
    const collection = collections.nodes.find(
      (collection: any) => collection.resourceId === selectCollectionKey,
    );
    data.id = collection.resourceId;
    data.title = collection.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.descriptionHtml = collection.translatableContent.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.handle = collection.translatableContent.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.seo.title =
      collection.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.value ||
      collection.translatableContent.find((item: any) => item.key === "title")
        ?.value;
    data.seo.description =
      collection.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.value ||
      collection.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.value;
    data.translations.title = collection.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.descriptionHtml = collection.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.handle = collection.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.seo.title =
      collection.translations.find((item: any) => item.key === "meta_title")
        ?.value ||
      collection.translations.find((item: any) => item.key === "title")?.value;
    data.translations.seo.description =
      collection.translations.find(
        (item: any) => item.key === "meta_description",
      )?.value ||
      collection.translations.find((item: any) => item.key === "body_html")
        ?.value;
    return data;
  };

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
      action: `/app/manage_translation/collection?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = collectionsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/collection?language=${searchTerm}`,
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
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
              defaultSelectedKeys={[collectionsData.nodes[0].id]}
              defaultOpenKeys={["sub1"]}
              style={{ height: "100%" }}
              items={menuData}
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
