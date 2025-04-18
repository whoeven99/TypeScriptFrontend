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
} from "~/api/admin";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { SessionService } from "~/utils/session.server";

const { Sider, Content } = Layout;



interface PageType {
  key: string;
  body: string | undefined;
  title: string | undefined;
  handle: string;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  translations: {
    key: string;
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
  key: string;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const pages = await queryNextTransType({
      shop,
      accessToken,
      resourceType: "PAGE",
      endCursor: "",
      locale: searchTerm || "",
    });
    return json({
      searchTerm,
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
        const previousPages = await queryPreviousTransType({
          shop,
          accessToken,
          resourceType: "PAGE",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousPages: previousPages });
      case !!endCursor:
        const nextPages = await queryNextTransType({
          shop,
          accessToken,
          resourceType: "PAGE",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextPages: nextPages });
      case !!confirmData:
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
    console.error("Error action page:", error);
    throw new Response("Error action page", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, pages } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (pages: any) => {
    const data = pages.nodes.map((page: any) => ({
      key: page?.resourceId,
      label: page?.translatableContent.find((item: any) => item.key === "title")
        .value,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(pages);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [pagesData, setPagesData] = useState(pages);
  const [pageData, setPageData] = useState<PageType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectPageKey, setSelectPageKey] = useState(
    pages.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
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
  const { t } = useTranslation();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();

  useEffect(() => {
    setHasPrevious(pagesData.pageInfo.hasPreviousPage);
    setHasNext(pagesData.pageInfo.hasNextPage);
  }, [pagesData]);

  useEffect(() => {
    const data = transBeforeData({
      pages: pagesData,
    });
    setPageData(data);
    setConfirmData([]);
    setTranslatedValues({});
  }, [selectPageKey]);

  useEffect(() => {
    setResourceData(
      [
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
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
        {
          key: "handle",
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
      ].filter((item) => item.default_language),
    );
  }, [pageData]);

  useEffect(() => {
    if (actionData && "nextPages" in actionData) {
      const nextPages = exMenuData(actionData.nextPages);
      // 在这里处理 nextPages
      setMenuData(nextPages);
      setPagesData(actionData.nextPages);
      setSelectPageKey(actionData.nextPages.nodes[0]?.resourceId);
    } else if (actionData && "previousPages" in actionData) {
      const previousPages = exMenuData(actionData.previousPages);
      // 在这里处理 previousPages
      setMenuData(previousPages);
      setPagesData(actionData.previousPages);
      setSelectPageKey(actionData.previousPages.nodes[0]?.resourceId);
    } else {
      // 如果不存在 nextPages，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
        item.success === false;
      });
      if (!errorItem) {
        confirmFetcher.data.confirmData.forEach((item: any) => {
          const index = pagesData.nodes.findIndex((option: any) => option.resourceId === item.resourceId);
          if (index !== -1) {
            const page = pagesData.nodes[index].translations.find((option: any) => option.key === item.key);
            if (page) {
              page.value = item.value;
            } else {
              pagesData.nodes[index].translations.push({
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
          resourceId: pagesData.nodes.find(
            (item: any) => item?.resourceId === selectPageKey,
          )?.resourceId,
          locale: pagesData.nodes
            .find((item: any) => item?.resourceId === selectPageKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: pagesData.nodes
            .find((item: any) => item?.resourceId === selectPageKey)
            ?.translatableContent.find((item: any) => item.key === key)?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const transBeforeData = ({ pages }: { pages: any }) => {
    let data: PageType = {
      key: "",
      title: "",
      body: "",
      handle: "",
      seo: {
        description: "",
        title: "",
      },
      translations: {
        key: "",
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
      (page: any) => page?.resourceId === selectPageKey,
    );
    data.key = page?.resourceId;
    data.title = page?.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.body = page?.translatableContent.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.handle = page?.translatableContent.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.seo.title = page?.translatableContent.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.seo.description = page?.translatableContent.find(
      (item: any) => item.key === "meta_description",
    )?.value;
    data.translations.key = page?.resourceId;
    data.translations.title = page?.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.body = page?.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.handle = page?.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.seo.title = page?.translations.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.translations.seo.description = page?.translations.find(
      (item: any) => item.key === "meta_description",
    )?.value;
    return data;
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

  const onClick = (e: any) => {
    setSelectPageKey(e.key);
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/page?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
  };

  return (
    <div>
      {" "}
      {pages.nodes.length ? (
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
