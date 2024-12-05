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

interface BlogType {
  key: string;
  handle: string;
  title: string;
  translations: {
    key: string;
    handle: string | undefined;
    title: string | undefined;
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
    const blogs = await queryNextTransType({
      request,
      resourceType: "BLOG",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      blogs,
    });
  } catch (error) {
    console.error("Error load blog:", error);
    throw new Response("Error load blog", { status: 500 });
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
        const previousBlogs = await queryPreviousTransType({
          request,
          resourceType: "BLOG",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousBlogs: previousBlogs });
      case !!endCursor:
        const nextBlogs = await queryNextTransType({
          request,
          resourceType: "BLOG",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextBlogs: nextBlogs });
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
    console.error("Error action blog:", error);
    throw new Response("Error action blog", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, blogs } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (blogs: any) => {
    const data = blogs.nodes.map((blog: any) => ({
      key: blog?.resourceId,
      label: blog?.translatableContent.find((item: any) => item.key === "title")
        .value,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(blogs);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [blogsData, setBlogsData] = useState(blogs);
  const [blogData, setBlogData] = useState<BlogType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectBlogKey, setSelectBlogKey] = useState(
    blogs.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    blogsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    blogsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<ConfirmFetcherType>();

  useEffect(() => {
    const data = transBeforeData({
      blogs: blogsData,
    });
    setBlogData(data);
    setConfirmData([]);
    setTranslatedValues({});
  }, [selectBlogKey]);

  useEffect(() => {
    setHasPrevious(blogsData.pageInfo.hasPreviousPage);
    setHasNext(blogsData.pageInfo.hasNextPage);
  }, [blogsData]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          resource: "Title",
          default_language: blogData?.title,
          translated: blogData?.translations?.title,
        },
        {
          key: "handle",
          resource: "Handle",
          default_language: blogData?.handle,
          translated: blogData?.translations?.handle,
        },
      ].filter((item) => item.default_language),
    );
  }, [blogData]);

  useEffect(() => {
    if (actionData && "nextBlogs" in actionData) {
      const nextBlogs = exMenuData(actionData.nextBlogs);
      // 在这里处理 nextBlogs
      setMenuData(nextBlogs);
      setBlogsData(actionData.nextBlogs);
      setSelectBlogKey(actionData.nextBlogs.nodes[0]?.resourceId);
    } else if (actionData && "previousBlogs" in actionData) {
      const previousBlogs = exMenuData(actionData.previousBlogs);
      // 在这里处理 previousBlogs
      setMenuData(previousBlogs);
      setBlogsData(actionData.previousBlogs);
      setSelectBlogKey(actionData.previousBlogs.nodes[0]?.resourceId);
    } else {
      // 如果不存在 nextBlogs，可以执行其他逻辑
      console.log("nextBlogs end");
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
          resourceId: blogs.nodes.find(
            (item: any) => item?.resourceId === selectBlogKey,
          )?.resourceId,
          locale: blogs.nodes
            .find((item: any) => item?.resourceId === selectBlogKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: blogs.nodes
            .find((item: any) => item?.resourceId === selectBlogKey)
            ?.translatableContent.find((item: any) => item.key === key)?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const transBeforeData = ({ blogs }: { blogs: any }) => {
    let data: BlogType = {
      handle: "",
      key: "",
      title: "",
      translations: {
        handle: "",
        key: "",
        title: "",
      },
    };
    const blog = blogs.nodes.find(
      (blog: any) => blog?.resourceId === selectBlogKey,
    );
    data.key = blog?.resourceId;
    data.title = blog?.translatableContent.find(
      (item: any) => item.key === "title",
    )?.value;
    data.handle = blog?.translatableContent.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.key = blog?.resourceId;
    data.translations.title = blog?.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.handle = blog?.translations.find(
      (item: any) => item.key === "handle",
    )?.value;

    return data;
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = blogsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/blog?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = blogsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/blog?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/blog?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onClick = (e: any) => {
    setSelectBlogKey(e.key);
  };

  return (
    <div>
      {blogs.nodes.length ? (
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
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                key={"manage_confirm_button"}
                type="primary"
                disabled={confirmLoading}
                loading={confirmLoading}
              >
                Save
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
                defaultSelectedKeys={[blogsData.nodes[0].key]}
                defaultOpenKeys={["sub1"]}
                style={{ height: "100%" }}
                items={menuData}
                // onChange={onChange}
                selectedKeys={[selectBlogKey]}
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
      ) : (
        <Modal open={isVisible} footer={null} onCancel={onCancel}>
          <Result
            title="No items found here"
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
