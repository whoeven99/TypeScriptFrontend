import { Input, Layout, Menu, MenuProps, Modal, Table, theme } from "antd";
import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Editor } from "@tinymce/tinymce-react";
import { queryShop } from "~/api/admin";

const { Sider, Content } = Layout;

interface PolicyType {
  id: string;
  body: string;
  title: string;
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const shop = await queryShop(request);
    const policy = shop.shopPolicies;
    return json({
      policy,
    });
  } catch (error) {
    console.error("Error load policy:", error);
    throw new Response("Error load policy", { status: 500 });
  }
};

const Index = () => {
  const { policy } = useLoaderData<typeof loader>();
  console.log(policy);

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>([
    {
      key: policy[0].id,
      label: policy[0].title,
    },
  ]);
  const [policyData, setPolicyData] = useState<PolicyType>(policy);
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "description",
      resource: "Description",
      default_language: undefined,
      translated: undefined,
    },
  ]);
  const [selectPolicyKey, setSelectPolicyKey] = useState(policy[0].id);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();

  useEffect(() => {
    setResourceData([
      {
        key: "description",
        resource: "Description",
        default_language: policyData.body,
        translated: "",
      },
    ]);
  }, []);

  const resourceColumns = [
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      width: 150,
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      render: (_: any, record: TableDataType) => {
        return <Input disabled value={record?.default_language} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        return <Input value={record?.default_language} />;
      },
    },
  ];

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  return (
    <Modal
      open={isVisible}
      onCancel={onCancel}
      //   onOk={() => handleConfirm()} // 确定按钮绑定确认逻辑
      width={"100%"}
      // style={{
      //   minHeight: "100%",
      // }}
      okText="Confirm"
      cancelText="Cancel"
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
            defaultSelectedKeys={[policy[0].id]}
            defaultOpenKeys={["sub1"]}
            style={{ height: "100%" }}
            items={menuData}
            // onChange={onChange}
            selectedKeys={[selectPolicyKey]}
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
  );
};

export default Index;
