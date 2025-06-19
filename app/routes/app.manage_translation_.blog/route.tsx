import {
  Button,
  Card,
  Divider,
  Layout,
  Menu,
  MenuProps,
  Result,
  Space,
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
} from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import { useDispatch, useSelector } from "react-redux";
import { setUserConfig } from "~/store/modules/userConfig";
import { setTableData } from "~/store/modules/languageTableData";

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

interface BlogType {
  key: string;
  handle: {
    value: string;
    type: string;
  };
  title: {
    value: string;
    type: string;
  };
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
  type: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 如果没有 language 参数，直接返回空数据
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  console.log(`${shop} load manage_translation_blog`);

  try {
    const blogs = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "BLOG",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
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

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

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
          accessToken: accessToken as string,
          resourceType: "BLOG",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousBlogs: previousBlogs });
      case !!endCursor:
        const nextBlogs = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "BLOG",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextBlogs: nextBlogs });
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
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

  const { searchTerm, blogs, server, shopName } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const languageFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const [menuData, setMenuData] = useState<any[]>([]);
  const [blogsData, setBlogsData] = useState(blogs);
  const [blogData, setBlogData] = useState<BlogType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectBlogKey, setSelectBlogKey] = useState(
    blogs.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (languageTableData.length === 0) {
      languageFetcher.submit({
        language: JSON.stringify(true),
      }, {
        method: "post",
        action: "/app/manage_translation",
      });
    }
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    if (blogs) {
      setMenuData(exMenuData(blogs));
      setIsLoading(false);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    loadingItemsRef.current = loadingItems;
  }, [loadingItems]);

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
    setHasPrevious(blogsData.pageInfo.hasPreviousPage);
    setHasNext(blogsData.pageInfo.hasNextPage);
  }, [selectBlogKey, blogsData]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          resource: t("Title"),
          default_language: blogData?.title?.value,
          translated: blogData?.translations?.title,
          type: blogData?.title?.type,
        },
        {
          key: "handle",
          resource: t("URL handle"),
          default_language: blogData?.handle?.value,
          translated: blogData?.translations?.handle,
          type: blogData?.handle?.type,
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
      const successfulItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === true
      );
      const errorItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === false
      );

      successfulItem.forEach((item: any) => {
        const index = blogsData.nodes.findIndex((option: any) => option.resourceId === item.data.resourceId);
        if (index !== -1) {
          const blog = blogsData.nodes[index].translations.find((option: any) => option.key === item.data.key);
          if (blog) {
            blog.value = item.data.value;
          } else {
            blogsData.nodes[index].translations.push({
              key: item.data.key,
              value: item.data.value,
            });
          }
        }
      })
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
      setConfirmData([]);

    }
    setConfirmLoading(false);
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (languageFetcher.data) {
      if (languageFetcher.data.data) {
        const shopLanguages = languageFetcher.data.data;
        dispatch(setTableData(shopLanguages.map((language: ShopLocalesType, index: number) => ({
          key: index,
          language: language.name,
          locale: language.locale,
          primary: language.primary,
          published: language.published,
        }))));
        const locale = shopLanguages.find(
          (language: ShopLocalesType) => language.primary === true,
        )?.locale;
        dispatch(setUserConfig({ locale: locale || "" }));
      }
    }
  }, [languageFetcher.data]);

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
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            type="primary"
            onClick={() => {
              handleTranslate("BLOG", record?.key || "", record?.type || "", record?.default_language || "");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
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
      key: "",
      handle: {
        value: "",
        type: "",
      },
      title: {
        value: "",
        type: "",
      },
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
    data.title = {
      value: blog?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.value,
      type: blog?.translatableContent.find(
        (item: any) => item.key === "title",
      )?.type,
    };
    data.handle = {
      value: blog?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.value,
      type: blog?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.type,
    };
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

  const handleTranslate = async (resourceType: string, key: string, type: string, context: string) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: blogsData.nodes
        .find((item: any) => item?.resourceId === selectBlogKey)
        ?.translatableContent.find((item: any) => item.key === key)
        ?.locale,
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(key)) {
        handleInputChange(key, data.response)
        shopify.toast.show(t("Translated successfully"))
      }
    } else {
      shopify.toast.show(data.errorMsg)
    }
    setLoadingItems((prev) => prev.filter((item) => item !== key));
  }

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
      variant="max"
      open={isVisible}
      onHide={onCancel}
    >
      <TitleBar title={t("Blog")} >
        <button
          variant="primary"
          onClick={handleConfirm}
          disabled={confirmLoading || !confirmData.length}
        >
          {t("Save")}
        </button>
      </TitleBar>
      <Layout
        style={{
          padding: "24px 0",
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Spin />
          </div>
        ) : blogs.nodes.length ? (
          <>
            {!isMobile && (
              <Sider
                style={{
                  background: colorBgContainer,
                  height: 'calc(100vh - 124px)',
                  minHeight: '70vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'auto',
                }}
              >
                <Menu
                  mode="inline"
                  defaultSelectedKeys={[blogsData.nodes[0]?.resourceId]}
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0,
                  }}
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
            )}
            <Content
              style={{
                padding: "0 24px",
                height: 'calc(100vh - 112px)', // 64px为FullscreenBar高度
              }}
            >
              {isMobile ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {menuData!.find((item: any) => item.key === selectBlogKey)?.label}
                    </Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 2, justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          width: "100px",
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
                          width: "100px",
                        }}
                      >
                        <Select
                          label={""}
                          options={itemOptions}
                          value={selectedItem}
                          onChange={(value) => handleItemChange(value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Card
                    title={t("Resource")}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {resourceData.map((item: any, index: number) => {
                        return (
                          <Space key={index} direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text
                              strong
                              style={{
                                fontSize: "16px"
                              }}>
                              {t(item.resource)}
                            </Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <Text>{t("Default Language")}</Text>
                              <ManageTableInput record={item} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <Text>{t("Translated")}</Text>
                              <ManageTableInput
                                translatedValues={translatedValues}
                                setTranslatedValues={setTranslatedValues}
                                handleInputChange={handleInputChange}
                                isRtl={searchTerm === "ar"}
                                record={item}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Button
                                type="primary"
                                onClick={() => {
                                  handleTranslate("BLOG", item?.key || "", item?.type || "", item?.default_language || "");
                                }}
                                loading={loadingItems.includes(item?.key || "")}
                              >
                                {t("Translate")}
                              </Button>
                            </div>
                            <Divider
                              style={{
                                margin: "8px 0"
                              }}
                            />
                          </Space>
                        )
                      })}
                    </Space>
                  </Card>
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[blogsData.nodes[0]?.resourceId]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                    }}
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
                </Space>
              ) : (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {menuData!.find((item: any) => item.key === selectBlogKey)?.label}
                    </Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 2, justifyContent: 'flex-end' }}>
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
                          label={""}
                          options={itemOptions}
                          value={selectedItem}
                          onChange={(value) => handleItemChange(value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Table
                    columns={resourceColumns}
                    dataSource={resourceData}
                    pagination={false}
                  />
                </Space>
              )}
            </Content>
          </>
        ) : (
          <Result
            title={t("The specified fields were not found in the store.")}
            extra={
              <Button type="primary" onClick={onCancel}>
                {t("Yes")}
              </Button>
            }
          />
        )}
      </Layout>
    </Modal>
  );
};

export default Index;