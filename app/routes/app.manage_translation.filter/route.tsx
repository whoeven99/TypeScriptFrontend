import {
  Button,
  Layout,
  message,
  Modal,
  Result,
  Space,
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
import { useTranslation } from "react-i18next";
import { SessionService } from "~/utils/session.server";

const { Content } = Layout;



type TableDataType = {
  key: string;
  index: number;
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
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      shop,
      accessToken,
    });
    const filters = await queryNextTransType({
      shop,
      accessToken,
      resourceType: "FILTER",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      filters,
    });
  } catch (error) {
    console.error("Error load filter:", error);
    throw new Response("Error load filter", { status: 500 });
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
        const previousFilters = await queryPreviousTransType({
          shop,
          accessToken,
          resourceType: "FILTER",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousFilters: previousFilters });
      case !!endCursor:
        const nextFilters = await queryNextTransType({
          shop,
          accessToken,
          resourceType: "FILTER",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextFilters: nextFilters });
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken,
          confirmData,
        });
        return json({ data: data });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action filter:", error);
    throw new Response("Error action filter", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, filters } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [filtersData, setFiltersData] = useState(filters);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    filtersData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    filtersData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const { t } = useTranslation();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();

  useEffect(() => {
    setHasPrevious(filtersData.pageInfo.hasPreviousPage);
    setHasNext(filtersData.pageInfo.hasNextPage);
    const data = generateMenuItemsArray(filtersData);
    setResourceData(data);
  }, [filtersData]);

  useEffect(() => {
    if (actionData && "nextFilters" in actionData) {
      // 在这里处理 nexts
      setFiltersData(actionData.nextFilters);
    } else if (actionData && "previousFilters" in actionData) {
      setFiltersData(actionData.previousFilters);
    } else {
      // 如果不存在 nexts，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
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
          />
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
          resourceId: filtersData.nodes[index]?.resourceId,
          locale: filtersData.nodes[index]?.translatableContent[0]?.locale,
          key: "label",
          value: value, // 初始为空字符串
          translatableContentDigest:
            filtersData.nodes[index]?.translatableContent[0]?.digest,
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
      };
      return [currentItem];
    });
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = filtersData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/filter?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = filtersData.pageInfo.endCursor;

    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/filter?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/filter?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
  };

  return (
    <div>
      {filters.nodes.length ? (
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
            <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
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
