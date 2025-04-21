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
  useLocation,
  useNavigate,
  useSearchParams,
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
import { SessionService } from "~/utils/session.server";
const { Sider, Content } = Layout;

interface CollectionType {
  handle: string;
  key: string;
  descriptionHtml: string | undefined;
  title: string;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  translations: {
    handle: string;
    key: string;
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
  const sessionService = await SessionService.init(request);
  let shopSession = sessionService.getShopSession();
  // 如果没有 language 参数，直接返回空数据 
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  if (!shopSession) {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    shopSession = {
      shop: shop,
      accessToken: accessToken as string,
    };
    sessionService.setShopSession(shopSession);
  }
  const { shop, accessToken } = shopSession;
  try {
    const collections = await queryNextTransType({
      shop,
      accessToken,
      resourceType: "COLLECTION",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      searchTerm,
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
  const sessionService = await SessionService.init(request);
  let shopSession = sessionService.getShopSession();
  if (!shopSession) {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    shopSession = {
      shop: shop,
      accessToken: accessToken as string,
    };
    sessionService.setShopSession(shopSession);
  }
  const { shop, accessToken } = shopSession;
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
          shop,
          accessToken,
          resourceType: "COLLECTION",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousCollections: previousCollections });
      case !!endCursor:
        const nextCollections = await queryNextTransType({
          shop,
          accessToken,
          resourceType: "COLLECTION",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextCollections: nextCollections });
      case !!confirmData:
        //
        const data = await updateManageTranslation({
          shop,
          accessToken,
          confirmData,
        });
        return json({ data: data, confirmData: confirmData });
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
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const { searchTerm, collections } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [isLoading, setIsLoading] = useState(true);

  const exMenuData = (collections: any) => {
    const data = collections.nodes.map((collection: any) => ({
      key: collection?.resourceId,
      label: collection?.translatableContent.find(
        (item: any) => item.key === "title",
      ).value,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(collections);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [collectionsData, setCollectionsData] = useState(collections);
  const [collectionData, setCollectionData] = useState<CollectionType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectCollectionKey, setSelectCollectionKey] = useState(
    collections.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
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
  const { t } = useTranslation();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();

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
    setResourceData(
      [
        {
          key: "title",
          resource: "Title",
          default_language: collectionData?.title,
          translated: collectionData?.translations?.title,
        },
        {
          key: "body_html",
          resource: "Description",
          default_language: collectionData?.descriptionHtml,
          translated: collectionData?.translations?.descriptionHtml,
        },
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
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
      ].filter((item) => item.default_language),
    );
  }, [collectionData]);

  useEffect(() => {
    if (actionData && "nextCollections" in actionData) {
      const nextCollections = exMenuData(actionData.nextCollections);
      // 在这里处理 nextCollections
      setMenuData(nextCollections);
      setCollectionsData(actionData.nextCollections);
      setSelectCollectionKey(actionData.nextCollections.nodes[0]?.resourceId);
    } else if (actionData && "previousCollections" in actionData) {
      const previousCollections = exMenuData(actionData.previousCollections);
      // 在这里处理 previousCollections
      setMenuData(previousCollections);
      setCollectionsData(actionData.previousCollections);
      setSelectCollectionKey(
        actionData.previousCollections.nodes[0]?.resourceId,
      );
    } else {
      // 如果不存在 nextCollections，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (collections) {
      setIsLoading(false);
    }
  }, [collections]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
        item.success === false;
      });
      if (!errorItem) {
        confirmFetcher.data.confirmData.forEach((item: any) => {
          const index = collectionsData.nodes.findIndex((option: any) => option.resourceId === item.resourceId);
          if (index !== -1) {
            const collection = collectionsData.nodes[index].translations.find((option: any) => option.key === item.key);
            if (collection) {
              collection.value = item.value;
            } else {
              collectionsData.nodes[index].translations.push({
                key: item.key,
                value: item.value,
                outdated: false,
              });
            }
          }

        })
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
            isRtl={searchTerm === "ar"}
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
          resourceId: collectionsData.nodes.find(
            (item: any) => item?.resourceId === selectCollectionKey,
          )?.resourceId,
          locale: collectionsData.nodes
            .find((item: any) => item?.resourceId === selectCollectionKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: collectionsData.nodes
            .find((item: any) => item?.resourceId === selectCollectionKey)
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
      key: "",
      descriptionHtml: "",
      seo: {
        description: "",
        title: "",
      },
      title: "",
      translations: {
        handle: "",
        key: "",
        descriptionHtml: "",
        seo: {
          description: "",
          title: "",
        },
        title: "",
      },
    };
    const collection = collections.nodes.find(
      (collection: any) => collection?.resourceId === selectCollectionKey,
    );
    data.key = collection?.resourceId;
    data.title = collection?.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.descriptionHtml = collection?.translatableContent.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.handle = collection?.translatableContent.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.seo.title = collection?.translatableContent.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.seo.description = collection?.translatableContent.find(
      (item: any) => item.key === "meta_description",
    )?.value;
    data.translations.title = collection?.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.descriptionHtml = collection?.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.handle = collection?.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.seo.title = collection?.translations.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.translations.seo.description = collection?.translations.find(
      (item: any) => item.key === "meta_description",
    )?.value;
    return data;
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
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
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/collection?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onClick = (e: any) => {
    setSelectCollectionKey(e.key);
  };

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : collections.nodes.length ? (
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
                width: "100%",
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
                disabled={confirmLoading || !confirmData.length}
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
                defaultSelectedKeys={[collectionsData.nodes[0].key]}
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
        </Modal>
      ) : (
        <Modal
          open={isVisible}
          footer={null}
          onCancel={onCancel}
          destroyOnClose={true}
          maskClosable={false}
        >
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
