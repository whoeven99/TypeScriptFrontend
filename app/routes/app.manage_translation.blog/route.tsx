import {
  Button,
  Layout,
  Menu,
  MenuProps,
  Result,
  Spin,
  Table,
  theme,
  Typography
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
  useLocation,
  useSearchParams,
} from "@remix-run/react"; // 引入 useNavigate, useLocation, useSearchParams
import { FullscreenBar, Pagination, Select } from "@shopify/polaris";
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
import { Modal } from "@shopify/app-bridge-react";
import { useSelector } from "react-redux";

const { Sider, Content } = Layout;
const { Text } = Typography;

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

  // 如果没有 language 参数，直接返回空数据
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const blogs = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "BLOG",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      searchTerm,
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
        const previousBlogs = await queryPreviousTransType({
          shop,
          accessToken,
          resourceType: "BLOG",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousBlogs: previousBlogs });
      case !!endCursor:
        const nextBlogs = await queryNextTransType({
          shop,
          accessToken,
          resourceType: "BLOG",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextBlogs: nextBlogs });
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
    console.error("Error action blog:", error);
    throw new Response("Error action blog", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t } = useTranslation();

  const { searchTerm, blogs } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const isManualChange = useRef(false);

  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const [menuData, setMenuData] = useState<MenuProps["items"]>([]);
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
  const itemOptions = [
    { label: t("Products"), value: "product" },
    { label: t("Collection"), value: "collection" },
    { label: t("Theme"), value: "theme" },
    { label: t("Shop"), value: "shop" },
    { label: t("Store metadata"), value: "metafield" },
    { label: t("Articles"), value: "article" },
    { label: t("Blog titles"), value: "blog" },
    { label: t("Pages"), value: "page" },
    { label: t("Filters"), value: "filter" },
    { label: t("Metaobjects"), value: "metaobject" },
    { label: t("Navigation"), value: "navigation" },
    { label: t("Email"), value: "email" },
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ]
  const [languageOptions, setLanguageOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(searchTerm || "");
  const [selectedItem, setSelectedItem] = useState<string>("blog");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    blogsData.pageInfo.hasPreviousPage || false
  );
  const [hasNext, setHasNext] = useState<boolean>(
    blogsData.pageInfo.hasNextPage || false
  );

  useEffect(() => {
    if (blogs) {
      setMenuData(exMenuData(blogs));
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (languageTableData) {
      setLanguageOptions(languageTableData
        .filter((item: any) => !item.primary)
        .map((item: any) => ({
          label: item.language,
          value: item.locale,
        })));
    }
  }, [languageTableData])


  useEffect(() => {
    if (blogs && isManualChange.current) {
      setBlogsData(blogs)
      setMenuData(exMenuData(blogs));
      setSelectBlogKey(blogs.nodes[0]?.resourceId);
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
      isManualChange.current = false; // 重置
    }
  }, [blogs])

  useEffect(() => {
    const data = transBeforeData({
      blogs: blogsData,
    });
    setBlogData(data);
    setConfirmData([]);
    setTranslatedValues({});
  }, [selectBlogKey, blogsData]);

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
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
        item.success === false;
      });
      if (!errorItem) {
        confirmFetcher.data.confirmData.forEach((item: any) => {
          const index = blogsData.nodes.findIndex((option: any) => option.resourceId === item.resourceId);
          if (index !== -1) {
            const blog = blogsData.nodes[index].translations.find((option: any) => option.key === item.key);
            if (blog) {
              blog.value = item.value;
            } else {
              blogsData.nodes[index].translations.push({
                key: item.key,
                value: item.value,
                outdated: false,
              });
            }
          }
        })
        shopify.toast.show("Saved successfully");
      } else {
        shopify.toast.show(errorItem?.errorMsg);
      }
      setConfirmData([]);
    }
    setConfirmLoading(false);
  }, [confirmFetcher.data]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

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
        return <ManageTableInput record={record} isRtl={searchTerm === "ar"} />;
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
          resourceId: blogsData.nodes.find(
            (item: any) => item?.resourceId === selectBlogKey,
          )?.resourceId,
          locale: blogsData.nodes
            .find((item: any) => item?.resourceId === selectBlogKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: blogsData.nodes
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

  const exMenuData = (blogs: any) => {
    const data = blogs.nodes.map((blog: any) => ({
      key: blog?.resourceId,
      label: blog?.translatableContent.find((item: any) => item.key === "title")
        .value,
    }));
    return data;
  };

  const handleLanguageChange = (language: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedLanguage(language);
    navigate(`/app/manage_translation/blog?language=${language}`);
  }

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  }

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

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate(`/app/manage_translation?language=${searchTerm}`, {
      state: { key: searchTerm },
    }); // 跳转到 /app/manage_translation
  };

  return (
    <Modal
      id="manage-modal"
      variant="max"
      open={isVisible}
      onHide={onCancel}
    >
      <FullscreenBar onAction={onCancel}>
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <div style={{ marginLeft: '1rem', flexGrow: 1 }}>
            <Text>
              {t("Blog")}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 2, justifyContent: 'center' }}>
            <div
              style={{
                width: "150px",
              }}
            >
              <Select
                label={""}
                options={languageOptions}
                value={selectedLanguage}
                onChange={(value) => handleLanguageChange(value)}
              />
            </div>
            <div
              style={{
                width: "150px",
              }}
            >
              <Select
                // style={{ minWidth: 120 }}
                label={""}
                options={itemOptions}
                value={selectedItem}
                onChange={(value) => handleItemChange(value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 1, justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              onClick={handleConfirm}
              disabled={confirmLoading || !confirmData.length}
              loading={confirmLoading}
            >
              {t("Save")}
            </Button>
          </div>
        </div>
      </FullscreenBar>
      <Layout
        style={{
          padding: "24px 0",
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          height: "100%",
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><Spin /></div>
        ) : blogs.nodes.length ? (
          <>
            <Sider style={{ background: colorBgContainer }} width={200}>
              <Menu
                mode="inline"
                defaultSelectedKeys={[blogsData.nodes[0]?.resourceId]}
                defaultOpenKeys={["sub1"]}
                style={{ height: "100%" }}
                items={menuData}
                selectedKeys={[selectBlogKey]}
                onClick={(e) => setSelectBlogKey(e.key)}
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
          </>
        ) : (
          <Result
            title="The specified fields were not found in the store.
"
            extra={
              <Button type="primary" onClick={onCancel}>
                OK
              </Button>
            }
          />
        )}
      </Layout>
    </Modal>
  );
};

export default Index;
