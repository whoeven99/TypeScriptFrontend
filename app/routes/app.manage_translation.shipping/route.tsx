import { Layout, Modal, Table, theme, Result, Button, message } from "antd";
import { useEffect, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import dynamic from "next/dynamic";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const { Content } = Layout;

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

type TableDataType = {
  key: string;
  index: number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shop = sessionStorage.getItem("shop") as string;
  const accessToken = sessionStorage.getItem("accessToken") as string;
  
  if (!shop || !accessToken) {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    sessionStorage.setItem("shop", shop);
    sessionStorage.setItem("accessToken", accessToken as string);
  }
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      shop,
      accessToken,
    });
    const shippings = await queryNextTransType({
      shop,
      accessToken,
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
  const shop = sessionStorage.getItem("shop") as string;
  const accessToken = sessionStorage.getItem("accessToken") as string;
  try {
    const formData = await request.formData();

    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken,
          confirmData,
        });
        return json({ data: data });
    }
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
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const { t } = useTranslation();
  const confirmFetcher = useFetcher<ConfirmFetcherType>();

  useEffect(() => {
    const Data = shippingsData.nodes.map((node: any, index: number) => ({
      key: "body",
      index: index,
      resource: "Label",
      default_language: node?.translatableContent[0].value,
      translated: node?.translations[0]?.value,
    }));
    setResourceData(Data);
  }, []);

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
        return (
          <ReactQuill
            theme="snow"
            defaultValue={record?.default_language}
            readOnly
          />
        );
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          record && (
            <ReactQuill
              theme="snow"
              defaultValue={record?.translated}
              onChange={(content) =>
                handleInputChange(record.key, content, record.index)
              }
            />
          )
        );
      },
    },
  ];

  const handleInputChange = (key: string, value: string, index: number) => {
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
          resourceId: shippingsData.nodes[index]?.resourceId,
          locale: shippingsData.nodes[index]?.translatableContent[0]?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest:
            shippingsData.nodes[index]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/shipping?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
  };

  return (
    <div>
      {resourceData.length ? (
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
                disabled={confirmLoading}
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
