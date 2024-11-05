import { Input, Layout, Menu, MenuProps, Modal, Table, theme } from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextNavigations, queryPreviousNavigations } from "~/api/admin";

const { Sider, Content } = Layout;

interface NavigationType {
  title: string;
  id: string;
  items: NavigationItemType[];
}

interface NavigationItemType {
  id: string;
  title: string;
  items: NavigationItemType[] | null;
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const navigations = await queryNextNavigations({ request, endCursor: "" });

    return json({
      navigations,
    });
  } catch (error) {
    console.error("Error load navigation:", error);
    throw new Response("Error load navigation", { status: 500 });
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
      const previousNavigations = await queryPreviousNavigations({
        request,
        startCursor,
      }); // 处理逻辑
      return json({ previousNavigations: previousNavigations });
    }
    if (endCursor) {
      const nextNavigations = await queryNextNavigations({
        request,
        endCursor,
      }); // 处理逻辑
      return json({ nextNavigations: nextNavigations });
    }
  } catch (error) {
    console.error("Error action navigation:", error);
    throw new Response("Error action navigation", { status: 500 });
  }
};

const Index = () => {
  const { navigations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (navigations: any) => {
    const data = navigations.nodes.map((navigation: any) => ({
      key: navigation.id,
      label: navigation.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(navigations);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [navigationsData, setNavigationsData] = useState(navigations);
  const [navigationData, setNavigationData] = useState<NavigationType>(
    navigations.nodes[0],
  );
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "title",
      resource: "Title",
      default_language: undefined,
      translated: "",
    },
    {
      key: "menu_items",
      resource: "Menu Items",
      default_language: undefined,
      translated: "",
    },
  ]);
  const [selectNavigationKey, setSelectNavigationKey] = useState(
    navigations.nodes[0].id,
  );
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    navigationsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    navigationsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setHasPrevious(navigationsData.pageInfo.hasPreviousPage);
    setHasNext(navigationsData.pageInfo.hasNextPage);
  }, [navigationsData]);

  useEffect(() => {
    const data = [
      {
        key: "title",
        resource: "Title",
        default_language: navigationData.title,
        translated: "",
      },
    ];
    const newdata = data.concat(generateMenuItemsArray(navigationData.items));
    setResourceData(newdata);
  }, [navigationData]);

  useEffect(() => {
    if (actionData && "nextNavigations" in actionData) {
      const nextNavigations = exMenuData(actionData.nextNavigations);
      // 在这里处理 nextNavigations
      setMenuData(nextNavigations);
      setNavigationsData(actionData.nextNavigations);
    } else {
      // 如果不存在 nextNavigations，可以执行其他逻辑
      console.log("nextNavigations undefined");
    }
  }, [actionData && "nextNavigations" in actionData]);

  useEffect(() => {
    if (actionData && "previousNavigations" in actionData) {
      const previousNavigations = exMenuData(actionData.previousNavigations);
      // 在这里处理 previousNavigations
      setMenuData(previousNavigations);
      setNavigationsData(actionData.previousNavigations);
    } else {
      // 如果不存在 previousNavigations，可以执行其他逻辑
      console.log("previousNavigations undefined");
    }
  }, [actionData && "previousNavigations" in actionData]);

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

  const generateMenuItemsArray = (
    items: NavigationItemType[],
  ): Array<{
    key: string;
    resource: string;
    default_language: string;
    translated: string;
  }> => {
    return items.flatMap((item) => {
      // 创建当前项的对象
      const currentItem = {
        key: `menu_item_${item.id}`, // 使用 id 生成唯一的 key
        resource: "Menu Item", // 资源字段固定为 "Menu Items"
        default_language: item.title, // 默认语言为 item 的标题
        translated: "", // 翻译字段初始化为空字符串
      };

      // 如果有子项，递归调用并合并结果
      if (item.items && item.items.length > 0) {
        return [currentItem, ...generateMenuItemsArray(item.items)];
      }

      // 如果没有子项，只返回当前项
      return [currentItem];
    });
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = navigationsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/navigation",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = navigationsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/navigation",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 navigationsData 中对应的产品
    const selectedNavigation = navigationsData.nodes.find(
      (navigation: any) => navigation.id === e.key,
    );

    // 如果找到了产品，就更新 navigationData
    if (selectedNavigation) {
      setNavigationData(selectedNavigation);
    } else {
      console.log("Navigation not found");
    }

    // 更新选中的产品 key
    setSelectNavigationKey(e.key);
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
            defaultSelectedKeys={[navigationsData.nodes[0].id]}
            defaultOpenKeys={["sub1"]}
            style={{ height: "100%" }}
            items={menuData}
            // onChange={onChange}
            selectedKeys={[selectNavigationKey]}
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
    </Modal>
  );
};

export default Index;
