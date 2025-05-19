import { Layout, Table, theme, Result, Button, Space, Typography, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { FullscreenBar, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextTransType,
  queryPreviousTransType,
} from "~/api/admin";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { SessionService } from "~/utils/session.server";
import { useSelector } from "react-redux";
import { Modal } from "@shopify/app-bridge-react";

const { Content } = Layout;

const { Text } = Typography;

type TableDataType = {
  key: string;
  index: number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
  type: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const metaobjects = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "METAOBJECT",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      metaobjects,
    });
  } catch (error) {
    console.error("Error load metaobject:", error);
    throw new Response("Error load metaobject", { status: 500 });
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
        const previousMetaobjects = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "METAOBJECT",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousMetaobjects: previousMetaobjects });
      case !!endCursor:
        const nextMetaobjects = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "METAOBJECT",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextMetaobjects: nextMetaobjects });
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
          confirmData,
        });
        return json({ data: data });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action metaobject:", error);
    throw new Response("Error action metaobject", { status: 500 });
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm, metaobjects, server, shopName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const { t } = useTranslation();

  const navigate = useNavigate();
  const languageTableData = useSelector((state: any) => state.languageTableData.rows);
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();

  const isManualChange = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });

  const [metaobjectsData, setMetaobjectsData] = useState(metaobjects);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
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
  const [selectedItem, setSelectedItem] = useState<string>("metaobject");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    metaobjectsData.pageInfo.hasPreviousPage || false
  );
  const [hasNext, setHasNext] = useState<boolean>(
    metaobjectsData.pageInfo.hasNextPage || false
  );

  useEffect(() => {
    loadingItemsRef.current = loadingItems;
  }, [loadingItems]);

  useEffect(() => {
    if (metaobjects && isManualChange.current) {
      setMetaobjectsData(metaobjects);
      isManualChange.current = false; // 重置
    }
  }, [metaobjects]);

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
    setHasPrevious(metaobjectsData.pageInfo.hasPreviousPage);
    setHasNext(metaobjectsData.pageInfo.hasNextPage);
    const data = generateMenuItemsArray(metaobjectsData);
    setResourceData(data);
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [metaobjectsData]);

  useEffect(() => {
    if (actionData && "nextMetaobjects" in actionData) {
      setMetaobjectsData(actionData.nextMetaobjects);
    } else if (actionData && "previousMetaobjects" in actionData) {
      setMetaobjectsData(actionData.previousMetaobjects);
    } else {
      // 如果不存在 nextProducts，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.filter((item: any) =>
        item.success === false
      );
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
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
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
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
              handleTranslate("METAOBJECT", record?.key || "", record?.type || "", record?.default_language || "", record?.index || 0);
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const handleInputChange = (key: string, value: string, index: number) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [key]: value, // 更新对应的 key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex(
        (item) => item?.resourceId === key,
      );

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
          resourceId: metaobjectsData.nodes[index]?.resourceId,
          locale: metaobjectsData.nodes[index]?.translatableContent[0]?.locale,
          key: "label",
          value: value, // 初始为空字符串
          translatableContentDigest:
            metaobjectsData.nodes[index]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const generateMenuItemsArray = (items: any) => {
    return items.nodes.flatMap((item: any, index: number) => {
      // 创建当前项的对象
      const currentItem = {
        key: `${item?.resourceId}`, // 使用 key 生成唯一的 key
        index: index,
        resource: "label", // 资源字段固定为 "Menu Items"
        default_language: item?.translatableContent[0]?.value, // 默认语言为 item 的标题
        translated: item?.translations[0]?.value, // 翻译字段初始化为空字符串
        type: item?.translatableContent[0]?.type,
      };
      return [currentItem];
    });
  };

  const handleTranslate = async (resourceType: string, key: string, type: string, context: string, index: number) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: metaobjectsData.nodes
        .find((item: any) => item?.resourceId === key)
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
        handleInputChange(key, data.response, index)
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
    navigate(`/app/manage_translation/metaobject?language=${language}`);
  }

  const handleItemChange = (item: string) => {
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  }

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = metaobjectsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/metaobject?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = metaobjectsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/metaobject?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/metaobject?language=${searchTerm}`,
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
              {t("Metaobjects")}
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
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><Spin /></div>
        ) : metaobjects.nodes.length ? (
          <Content
            style={{
              padding: "0 24px",
              height: 'calc(100vh - 112px)', // 64px为FullscreenBar高度
              overflow: 'auto',
              minHeight: '70vh',
            }}
          >
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <Table
                columns={resourceColumns}
                dataSource={resourceData}
                pagination={false}
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
          </Content>
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
