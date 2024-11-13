import { Button, Input, Layout, Modal, Result, Space, Table, theme } from "antd";
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

const { Content } = Layout;
const { TextArea } = Input;

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
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      request,
    });
    const deliverys = await queryNextTransType({
      request,
      resourceType: "DELIVERY_METHOD_DEFINITION",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      deliverys,
    });
  } catch (error) {
    console.error("Error load delivery:", error);
    throw new Response("Error load delivery", { status: 500 });
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
        const previousDeliverys = await queryPreviousTransType({
          request,
          resourceType: "DELIVERY_METHOD_DEFINITION",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousDeliverys: previousDeliverys });
      case !!endCursor:
        const nextDeliverys = await queryNextTransType({
          request,
          resourceType: "DELIVERY_METHOD_DEFINITION",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextDeliverys: nextDeliverys });
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
    console.error("Error action delivery:", error);
    throw new Response("Error action delivery", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, deliverys } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [deliverysData, setDeliverysData] = useState(deliverys);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    deliverysData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    deliverysData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  console.log(deliverys);

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setConfirmData(
      deliverys.nodes.map((item: any) => ({
        resourceId: item.resourceId,
        locale: item.translatableContent[0]?.locale,
        key: item.translatableContent[0]?.key,
        value: "",
        translatableContentDigest: item.translatableContent[0]?.digest,
        target: searchTerm,
      })),
    );
  }, []);

  useEffect(() => {
    setHasPrevious(deliverysData.pageInfo.hasPreviousPage);
    setHasNext(deliverysData.pageInfo.hasNextPage);
    const data = generateMenuItemsArray(deliverysData);
    setResourceData(data);
  }, [deliverysData]);

  useEffect(() => {
    if (actionData && "nextDeliverys" in actionData) {
      // 在这里处理 nexts
      console.log(actionData.nextDeliverys);
      setDeliverysData(actionData.nextDeliverys);
    } else if (actionData && "previousDeliverys" in actionData) {
      setDeliverysData(actionData.previousDeliverys);
    } else {
      // 如果不存在 nexts，可以执行其他逻辑
      console.log("action end");
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
        return (
          <TextArea
            disabled
            value={record?.default_language}
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
        );
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          record && (
            <TextArea
              value={translatedValues[record?.key] || record?.translated}
              autoSize={{ minRows: 1, maxRows: 6 }}
              onChange={(e) => handleInputChange(record.key, e.target.value)}
            />
          )
        );
      },
    },
  ];

  const handleInputChange = (key: string | number, value: string) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [key]: value, // 更新对应的 key
    }));
    setConfirmData(
      confirmData.map((item) =>
        item.key === key ? { ...item, value: value } : item,
      ),
    );
  };

  const generateMenuItemsArray = (items: any) => {
    return items.nodes.flatMap((item: any) => {
      // 创建当前项的对象
      const currentItem = {
        key: `${item.resourceId}`, // 使用 id 生成唯一的 key
        resource: "value", // 资源字段固定为 "Menu Items"
        default_language: item.translatableContent[0]?.value, // 默认语言为 item 的标题
        translated: item.translations[0]?.value, // 翻译字段初始化为空字符串
      };
      return currentItem.default_language !== "" ? [currentItem] : [];
    });
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = deliverysData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/delivery?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = deliverysData.pageInfo.endCursor;
    console.log(deliverysData);

    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/delivery?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/delivery?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
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
      {deliverys.nodes.length ? (
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
