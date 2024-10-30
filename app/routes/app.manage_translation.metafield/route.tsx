import {
  Input,
  Layout,
  Menu,
  MenuProps,
  Modal,
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
  queryAllProductMetafields,
  queryNextProductMetafields,
  queryNextShopMetafields,
  queryPreviousProductMetafields,
  queryPreviousShopMetafields,
} from "~/api/admin";

const { Sider, Content } = Layout;
const { TextArea } = Input;

interface MetafieldType {
  key: string;
  nodes: [
    {
      id: string;
      value: string;
    },
  ];
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
  };
}

interface ProductMetafieldsType {
  key: string;
  name: string;
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const shopmetafields = await queryNextShopMetafields({
      request,
      endCursor: "",
    });

    const newData: MetafieldType = {
      key: "shop_metafields", // 这里设置你想要的 key 的值
      nodes: shopmetafields.nodes, // 保持原有的 nodes
      pageInfo: shopmetafields.pageInfo, // 保持原有的 pageInfo
    };

    const productmetafields = await queryAllProductMetafields({ request });

    return json({
      shopmetafields: newData,
      productmetafields,
    });
  } catch (error) {
    console.error("Error load metafield:", error);
    throw new Response("Error load metafield", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const key: string = JSON.parse(formData.get("key") as string);
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    if (key) {
      if (startCursor) {
        const previousProductMetafields = await queryPreviousProductMetafields({
          request,
          key,
          startCursor,
        }); // 处理逻辑
        return json({ previousProductMetafields: previousProductMetafields });
      }
      if (endCursor) {
        const nextProductMetafields = await queryNextProductMetafields({
          request,
          key,
          endCursor,
        }); // 处理逻辑
        return json({ nextProductMetafields: nextProductMetafields });
      }
      const previousProductMetafields = await queryNextProductMetafields({
        request,
        key,
        endCursor: "",
      }); // 处理逻辑
      return json({ previousProductMetafields: previousProductMetafields });
    } else {
      if (startCursor) {
        const previousShopMetafields = await queryPreviousShopMetafields({
          request,
          startCursor,
        }); // 处理逻辑
        return json({ previousShopMetafields: previousShopMetafields });
      }
      if (endCursor) {
        const nextShopMetafields = await queryNextShopMetafields({
          request,
          endCursor,
        }); // 处理逻辑
        return json({ nextShopMetafields: nextShopMetafields });
      }
    }
    return null;
  } catch (error) {
    console.error("Error action metafield:", error);
    throw new Response("Error action metafield", { status: 500 });
  }
};

const Index = () => {
  const { shopmetafields, productmetafields } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (metafields: any) => {
    const data = metafields.nodes.map((metafield: any) => ({
      key: metafield.id,
      label: metafield.title,
    }));
    return data;
  };

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>([
    {
      key: "shop",
      label: "Shop metafield",
    },
    {
      key: "product",
      label: "Product metafield",
      children: productmetafields.nodes.map(
        (productmetafield: ProductMetafieldsType) => ({
          key: productmetafield.key,
          label: productmetafield.name,
        }),
      ),
    },
  ]);
  const [metafieldsData, setMetafieldsData] =
    useState<MetafieldType>(shopmetafields);
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "title",
      resource: "value",
      default_language: "",
      translated: "",
    },
  ]);
  const [selectMetafieldKey, setSelectMetafieldKey] = useState("shop");
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
    setHasPrevious(metafieldsData.pageInfo.hasPreviousPage);
    setHasNext(metafieldsData.pageInfo.hasNextPage);
  }, [metafieldsData]);

  useEffect(() => {
    const data = generateMenuItemsArray(metafieldsData);

    setResourceData(data);
  }, [metafieldsData]);

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
      render: (_: any, record: TableDataType) => {
        return (
          <TextArea
            value={record?.translated}
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
        );
      },
    },
  ];

  const generateMenuItemsArray = (
    items: MetafieldType,
  ): Array<{
    key: string;
    resource: string;
    default_language: string;
    translated: string;
  }> => {
    return items.nodes.flatMap((item) => {
      // 创建当前项的对象
      const currentItem = {
        key: `${item.id}`, // 使用 id 生成唯一的 key
        resource: "value", // 资源字段固定为 "Menu Items"
        default_language: item.value, // 默认语言为 item 的标题
        translated: "", // 翻译字段初始化为空字符串
      };
      return [currentItem];
    });
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = metafieldsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/metafield",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = metafieldsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/metafield",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 metafieldsData 中对应的产品
    const formData = new FormData();
    const key = e.key;
    formData.append("key", JSON.stringify(key)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/metafield",
    }); // 提交表单请求

    // 更新选中的产品 key
    setSelectMetafieldKey(e.key);
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
            defaultSelectedKeys={[metafieldsData.nodes[0].id]}
            defaultOpenKeys={["sub1"]}
            style={{ height: "100%" }}
            items={menuData}
            // onChange={onChange}
            selectedKeys={[selectMetafieldKey]}
            onClick={onClick}
          />
        </Sider>
        <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
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
  );
};

export default Index;
