import { Layout, Modal, Table, theme, Result, Button } from "antd";
import { useEffect, useState } from "react";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryShopLanguages } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";
import { ShopLocalesType } from "../app.language/route";
import dynamic from "next/dynamic";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import ManageModalHeader from "~/components/manageModalHeader";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const { Content } = Layout;

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
    const shippings = await queryNextTransType({
      request,
      resourceType: "PACKING_SLIP_TEMPLATE",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      shippings,
    });
  } catch (error) {
    console.error("Error load shipping:", error);
    throw new Response("Error load shipping", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();

    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    if (confirmData)
      await updateManageTranslation({
        request,
        confirmData,
      });
    return null;
  } catch (error) {
    console.error("Error action shipping:", error);
    throw new Response("Error action shipping", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, shippings } =
    useLoaderData<typeof loader>();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [shippingsData, setShippingsData] = useState(shippings);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  console.log(shippingsData);

  useEffect(() => {
    const Data = shippingsData.nodes.map((node: any) => ({
      key: "body",
      resource: "Label",
      default_language: node.translatableContent[0].value,
      translated: node.translations[0]?.value,
    }));
    setResourceData(Data);
    setConfirmData([
      {
        resourceId: shippingsData.nodes[0].resourceId,
        locale: shippingsData.nodes[0].translatableContent[0].locale,
        key: "body",
        value: "",
        translatableContentDigest: shippingsData.nodes[0].translatableContent[0].digest,
        target: searchTerm || "",
      },
    ]);
  }, []);

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
          <ReactQuill theme="snow" defaultValue={record?.default_language} />
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
            <ReactQuill
              theme="snow"
              defaultValue={record?.translated}
              onChange={(content) => handleInputChange(record.key, content)}
            />
          )
        );
      },
    },
  ];

  const handleInputChange = (key: string | number, value: string) => {
    setConfirmData(
      confirmData.map((item) =>
        item.key === key ? { ...item, value: value } : item,
      ),
    );
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/shipping?language=${searchTerm}`,
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
      {shippingsData.nodes.length ? (
        <Layout
          style={{
            padding: "24px 0",
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <ManageModalHeader
            shopLanguagesLoad={shopLanguagesLoad}
            locale={searchTerm}
          />
          <Layout
            style={{
              padding: "24px 0",
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
              <Table
                columns={resourceColumns}
                dataSource={resourceData}
                pagination={false}
              />
            </Content>
          </Layout>
        </Layout>
      ) : (
        <Result
          //   icon={<SmileOutlined />}
          title="No items found here"
          extra={<Button type="primary">back</Button>}
        />
      )}
    </Modal>
  );
};

export default Index;
