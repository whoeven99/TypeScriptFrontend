import {
  Button,
  Input,
  Layout,
  Modal,
  Result,
  Space,
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
    const metafields = await queryNextTransType({
      request,
      resourceType: "METAFIELD",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      metafields,
    });
  } catch (error) {
    console.error("Error load metafield:", error);
    throw new Response("Error load metafield", { status: 500 });
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
        const previousMetafields = await queryPreviousTransType({
          request,
          resourceType: "METAFIELD",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousMetafields: previousMetafields });
      case !!endCursor:
        const nextMetafields = await queryNextTransType({
          request,
          resourceType: "METAFIELD",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextMetafields: nextMetafields });
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
    console.error("Error action metafield:", error);
    throw new Response("Error action metafield", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, metafields } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [metafieldsData, setMetafieldsData] = useState(metafields);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    metafieldsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    metafieldsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setConfirmData(
      metafields.nodes.map((item: any) => ({
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
    setHasPrevious(metafieldsData.pageInfo.hasPreviousPage);
    setHasNext(metafieldsData.pageInfo.hasNextPage);
    const data = generateMenuItemsArray(metafieldsData);
    setResourceData(data);
  }, [metafieldsData]);

  useEffect(() => {
    if (actionData && "nextMetafields" in actionData) {
      // 在这里处理 nexts
      console.log(1);
      console.log(actionData.nextMetafields);
      setMetafieldsData(actionData.nextMetafields);
    } else if (actionData && "previousMetafields" in actionData) {
      setMetafieldsData(actionData.previousMetafields);
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
              onChange={(e) => handleInputChange(record.key, e.target.value)}
              autoSize={{ minRows: 1, maxRows: 6 }}
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
      return [currentItem];
    });
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = metafieldsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/metafield?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = metafieldsData.pageInfo.endCursor;
    console.log(metafieldsData);

    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/metafield?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/article?language=${searchTerm}`,
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
      {metafields.nodes.length ? (
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
