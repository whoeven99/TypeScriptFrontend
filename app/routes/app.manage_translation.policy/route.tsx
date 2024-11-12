import {
  Button,
  Layout,
  Menu,
  MenuProps,
  Modal,
  Table,
  theme,
} from "antd";
import { useEffect, useState } from "react";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryShop, queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import ManageModalHeader from "~/components/manageModalHeader";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const { Sider, Content } = Layout;

interface PolicyType {
  id: string;
  body: string;
  title: string;
  locale: string;
  digest: string;
  translations: {
    id: string;
    body: string | undefined;
  };
}

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
    const shop = await queryShop(request);
    const policyTitle = shop.shopPolicies;
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
        id: title.id,
        body: title.body,
        locale: body.translatableContent[0].locale,
        digest: body.translatableContent[0].digest,
        translations: {
          id: body.resourceId,
          value: body.translations[0]?.value,
        },
      };
    });
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

    if (confirmData)
      await updateManageTranslation({
        request,
        confirmData,
      });
    return null;
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
      key: policy.id,
      label: policy.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(policies);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [policyData, setPolicyData] = useState<PolicyType>(policies);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectPolicyKey, setSelectPolicyKey] = useState(policies[0].id);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    const data: PolicyType = policies.find(
      (policy: any) => policy.id === selectPolicyKey,
    );
    setConfirmData([
      {
        resourceId: data.translations.id,
        locale: data.locale,
        key: "body",
        value: "",
        translatableContentDigest: data.digest,
        target: searchTerm || "",
      },
    ]);
    setPolicyData(data);
  }, [selectPolicyKey]);

  useEffect(() => {
    setResourceData([
      {
        key: "body",
        resource: "Content",
        default_language: policyData?.body,
        translated: policyData.translations?.body,
      },
    ]);
  }, [policyData]);

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

  const onClick = (e: any) => {
    setSelectPolicyKey(e.key);
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/policy?language=${searchTerm}`,
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
      </Layout>
    </Modal>
  );
};

export default Index;
