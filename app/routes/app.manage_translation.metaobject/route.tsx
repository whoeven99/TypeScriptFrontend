import {
  Input,
  Layout,
  Menu,
  MenuProps,
  Modal,
  Table,
  theme,
  Result,
  Button,
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
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";

const { Sider, Content } = Layout;

interface TransType {
  translatableContent:
    | [
        {
          digest: string;
          key: string;
          locale: string;
          type: string;
          value: string;
        },
      ]
    | [];
  translations:
    | [
        {
          key: string;
          locale: string;
          outdated: boolean;
          updatedAt: string;
          value: string;
        },
      ]
    | [];
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const metaobjects = await queryNextTransType({
      request,
      resourceType: "METAOBJECT",
      endCursor: "",
    });

    return json({
      metaobjects,
    });
  } catch (error) {
    console.error("Error load metaobject:", error);
    throw new Response("Error load metaobject", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    if (startCursor) {
      const previousMetaobjects = await queryPreviousTransType({
        request,
        resourceType: "METAOBJECT",
        startCursor,
      }); // 处理逻辑
      return json({ previousMetaobjects: previousMetaobjects });
    }
    if (endCursor) {
      const nextMetaobjects = await queryNextTransType({
        request,
        resourceType: "METAOBJECT",
        endCursor,
      }); // 处理逻辑
      return json({ nextMetaobjects: nextMetaobjects });
    }
  } catch (error) {
    console.error("Error action metaobject:", error);
    throw new Response("Error action metaobject", { status: 500 });
  }
};

const Index = () => {
  const { metaobjects } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (metaobjects: any) => {
    if (metaobjects) {
      const data = metaobjects.nodes.map((metaobject: TransType) => {
        const translatableContent = metaobject?.translatableContent?.[0];
        if (translatableContent) {
          return {
            key: translatableContent?.digest,
            label: translatableContent?.value,
          };
        } else {
          return null;
        }
      });
      return data;
    }
  };

  const items: MenuProps["items"] = exMenuData(metaobjects);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [metaobjectsData, setMetaobjectsData] = useState(metaobjects);
  const [metaobjectData, setMetaobjectData] = useState<TransType>(
    metaobjects.nodes[0],
  );
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "",
      resource: "",
      default_language: "",
      translated: "",
    },
  ]);
  const [selectMetaobjectKey, setSelectMetaobjectKey] = useState(
    metaobjects.nodes[0]?.translatableContent[0]?.digest,
  );
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    metaobjectsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    metaobjectsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setHasPrevious(metaobjectsData.pageInfo.hasPreviousPage);
    setHasNext(metaobjectsData.pageInfo.hasNextPage);
  }, [metaobjectsData]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Label",
        default_language: "",
        translated: "",
      },
    ]);
  }, [metaobjectData]);

  useEffect(() => {
    if (actionData && "nextMetaobjects" in actionData) {
      const nextMetaobjects = exMenuData(actionData.nextMetaobjects);
      // 在这里处理 nextMetaobjects
      console.log(nextMetaobjects);
      setMenuData(nextMetaobjects);
      setMetaobjectsData(actionData.nextMetaobjects);
    } else {
      // 如果不存在 nextMetaobjects，可以执行其他逻辑
      console.log("nextMetaobjects undefined");
    }
  }, [actionData && "nextMetaobjects" in actionData]);

  useEffect(() => {
    if (actionData && "previousMetaobjects" in actionData) {
      const previousMetaobjects = exMenuData(actionData.previousMetaobjects);
      console.log(previousMetaobjects);
      // 在这里处理 previousMetaobjects
      setMenuData(previousMetaobjects);
      setMetaobjectsData(actionData.previousMetaobjects);
    } else {
      // 如果不存在 previousMetaobjects，可以执行其他逻辑
      console.log("previousMetaobjects undefined");
    }
  }, [actionData && "previousMetaobjects" in actionData]);

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
        return <Input value={record?.translated} />;
      },
    },
  ];

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = metaobjectsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/metaobject",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = metaobjectsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/metaobject",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 metaobjectsData 中对应的产品
    const selectedMetaobject = metaobjectsData.nodes.find(
      (metaobject: any) => metaobject.translatableContent[0].digest === e.key,
    );

    // 如果找到了产品，就更新 metaobjectData
    if (selectedMetaobject) {
      setMetaobjectData(selectedMetaobject);
    } else {
      console.log("Metaobject not found");
    }

    // 更新选中的产品 key
    setSelectMetaobjectKey(e.key);
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
      {metaobjectsData.nodes.length ? (
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
              defaultSelectedKeys={[
                metaobjectsData.nodes[0]?.translatableContent.digest,
              ]}
              defaultOpenKeys={["sub1"]}
              style={{ height: "100%" }}
              items={menuData}
              // onChange={onChange}
              selectedKeys={[selectMetaobjectKey]}
              onClick={onClick}
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
          <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
            <Table
              columns={resourceColumns}
              dataSource={resourceData}
              pagination={false}
            />
          </Content>
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
