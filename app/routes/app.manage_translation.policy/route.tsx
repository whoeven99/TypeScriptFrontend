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
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryShop, queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import dynamic from "next/dynamic";
import { authenticate } from "~/shopify.server";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

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

interface PolicyType {
  key: string;
  body: string;
  title: string;
  locale: string;
  digest: string;
  translations: {
    key: string;
    body: string | undefined;
  };
}

type TableDataType = {
  key: string | number | undefined;
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
    const shopData = await queryShop({ request });
    const policyTitle = shopData.shopPolicies;
    const policyBody = await queryNextTransType({
      request,
      resourceType: "SHOP_POLICY",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    const policies = policyTitle.map((title: any, index: number) => {
      const body = policyBody.nodes[index];
      return {
        title: title.title,
        key: title.id,
        body: title.body,
        locale: body?.translatableContent[0].locale,
        digest: body?.translatableContent[0].digest,
        translations: {
          key: body?.resourceId,
          value: body?.translations[0]?.value,
        },
      };
    });
    console.log(policies);
    return json({
      searchTerm,
      shopLanguagesLoad,
      policies,
    });
  } catch (error) {
    console.error("Error load policy:", error);
    throw new Response("Error load policy", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );

    switch (true) {
      case !!confirmData:
        const data = await updateManageTranslation({
          request,
          confirmData,
        });
        return json({ data: data });
    }
  } catch (error) {
    console.error("Error action policy:", error);
    throw new Response("Error action policy", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, policies } =
    useLoaderData<typeof loader>();

  const exMenuData = (policies: any) => {
    const data = policies.map((policy: PolicyType) => ({
      key: policy.key,
      label: policy.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(policies);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [policyData, setPolicyData] = useState<PolicyType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectPolicyKey, setSelectPolicyKey] = useState(policies[0].key);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const confirmFetcher = useFetcher<ConfirmFetcherType>();

  useEffect(() => {
    const data: PolicyType = policies.find(
      (policy: any) => policy.key === selectPolicyKey,
    );
    setConfirmData([
      {
        resourceId: data?.translations.key,
        locale: data.locale,
        key: "body",
        value: "",
        translatableContentDigest: data.digest,
        target: searchTerm || "",
      },
    ]);
    setPolicyData(data);
    setConfirmData([]);
  }, [selectPolicyKey]);

  useEffect(() => {
    setResourceData([
      {
        key: policyData?.key,
        resource: "Content",
        default_language: policyData?.body,
        translated: policyData?.translations?.body,
      },
    ]);
  }, [policyData]);

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

  const menuData: MenuProps["items"] = items;

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
              onChange={(content) => handleInputChange(record?.key, content)}
            />
          )
        );
      },
    },
  ];

  const handleInputChange = (
    key: string | number | undefined,
    value: string,
  ) => {
    setConfirmData(
      confirmData.map((item) =>
        item.key === key ? { ...item, value: value } : item,
      ),
    );
  };

  const onClick = (e: any) => {
    setSelectPolicyKey(e.key);
  };

  const handleConfirm = () => {
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/policy?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  return (
    <div>
      {policies.length ? (
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
                defaultSelectedKeys={[policies[0].id]}
                defaultOpenKeys={["sub1"]}
                style={{ height: "100%" }}
                items={menuData}
                // onChange={onChange}
                selectedKeys={[selectPolicyKey]}
                onClick={onClick}
              />
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
