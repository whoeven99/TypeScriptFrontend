import {
  Button,
  Layout,
  Menu,
  MenuProps,
  Modal,
  Result,
  Table,
  theme,
} from "antd";
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
import { ShopLocalesType } from "../app.language/route";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import ManageTableInput from "~/components/manageTableInput";

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
  key: string;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      request,
    });
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
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!startCursor:
        const previousCollections = await queryPreviousTransType({
          request,
          resourceType: "COLLECTION",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousCollections: previousCollections });
      case !!endCursor:
        const nextCollections = await queryNextTransType({
          request,
          resourceType: "COLLECTION",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextCollections: nextCollections });
      case !!confirmData:
        await updateManageTranslation({
          request,
          confirmData,
        });
        return null;
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action collection:", error);
    throw new Response("Error action collection", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, collections } =
    useLoaderData<typeof loader>();
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
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectCollectionKey, setSelectCollectionKey] = useState(
    collections.nodes[0].resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
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
    setConfirmData([]);
    setTranslatedValues({});
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
        key: "handle",
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
        return <ManageTableInput record={record} textarea={false} />;
      },
    },
    {
      title: "Translated",
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
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} textarea={false} />;
      },
    },
    {
      title: "Translated",
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
          resourceId: collections.nodes.find(
            (item: any) => item.resourceId === selectCollectionKey,
          )?.resourceId,
          locale: collections.nodes
            .find((item: any) => item.resourceId === selectCollectionKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: collections.nodes
            .find((item: any) => item.resourceId === selectCollectionKey)
            ?.translatableContent.find((item: any) => item.key === key)?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

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

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/collection?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onClick = (e: any) => {
    setSelectCollectionKey(e.key);
  };

  return (
    <Modal
      open={isVisible}
      onCancel={onCancel}
      width={"100%"}
      footer={[
        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <Button onClick={onCancel} style={{ marginRight: "10px" }}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} type="primary">
            Confirm
          </Button>
        </div>,
      ]}
    >
      {collections.nodes.length ? (
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
      ) : (
        <Result
          title="No items found here"
          extra={<Button type="primary">back</Button>}
        />
      )}
    </Modal>
  );
};

export default Index;
