import {
  Button,
  Input,
  Layout,
  Menu,
  MenuProps,
  message,
  Modal,
  Table,
  theme,
} from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useFetcher,
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
import { authenticate } from "~/shopify.server";

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

interface ItemType {
  key: string;
  label: string | undefined;
  translations: {
    key: string;
    label: string | undefined;
  };
}

type TableDataType = {
  key: string;
  index: number;
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
    const navigations = await queryNextTransType({
      request,
      resourceType: "MENU",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });
    const navigationItems = await queryNextTransType({
      request,
      resourceType: "LINK",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      navigations,
      navigationItems,
    });
  } catch (error) {
    console.error("Error load navigation:", error);
    throw new Response("Error load navigation", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const formData = await request.formData();
    const navigationStartCursor: string = JSON.parse(
      formData.get("navigationStartCursor") as string,
    );
    const navigationEndCursor: string = JSON.parse(
      formData.get("navigationEndCursor") as string,
    );
    const itemStartCursor: string = JSON.parse(
      formData.get("itemStartCursor") as string,
    );
    const itemEndCursor: string = JSON.parse(
      formData.get("itemEndCursor") as string,
    );
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!navigationStartCursor: {
        const previousNavigations = await queryPreviousTransType({
          request,
          resourceType: "MENU",
          startCursor: navigationStartCursor,
          locale: searchTerm || "",
        });
        return json({ previousNavigations });
      }

      case !!navigationEndCursor: {
        const nextNavigations = await queryNextTransType({
          request,
          resourceType: "MENU",
          endCursor: navigationEndCursor,
          locale: searchTerm || "",
        });
        return json({ nextNavigations });
      }

      case !!itemStartCursor: {
        const previousItems = await queryPreviousTransType({
          request,
          resourceType: "LINK",
          startCursor: itemStartCursor,
          locale: searchTerm || "",
        });
        return json({ previousItems });
      }

      case !!itemEndCursor: {
        const nextItems = await queryNextTransType({
          request,
          resourceType: "LINK",
          endCursor: itemEndCursor,
          locale: searchTerm || "",
        });
        return json({ nextItems });
      }

      case !!confirmData:
        const data = await updateManageTranslation({
          request,
          confirmData,
        });
        return json({ data: data });

      default: {
        // 如果没有符合条件的 cursor，则抛出错误
        throw new Response("No valid cursor provided", { status: 400 });
      }
    }
  } catch (error) {
    console.error("Error action navigation:", error);
    throw new Response("Error action navigation", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, navigations, navigationItems } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const menuData: MenuProps["items"] = [
    {
      key: "names",
      label: "Menu names",
    },
    {
      key: "items",
      label: "Menu items",
    },
  ];
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [navigationsData, setNavigationsData] = useState(navigations);
  const [itemsData, setItemsData] = useState(navigationItems);
  const [navigationData, setNavigationData] = useState<ItemType[]>();
  const [ItemData, setItemData] = useState<ItemType[]>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectNavigationKey, setSelectNavigationKey] = useState("names");
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
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
  const confirmFetcher = useFetcher<ConfirmFetcherType>();

  useEffect(() => {
    setHasPrevious(navigationsData.pageInfo.hasPreviousPage);
    setHasNext(navigationsData.pageInfo.hasNextPage);
    const data = transBeforeData({
      menus: navigationsData,
    });
    setNavigationData(data);
  }, [navigationsData]);

  useEffect(() => {
    setHasPrevious(itemsData.pageInfo.hasPreviousPage);
    setHasNext(itemsData.pageInfo.hasNextPage);
    const data = transBeforeData({
      menus: itemsData,
    });
    setItemData(data);
  }, [itemsData]);

  useEffect(() => {
    if (selectNavigationKey === "names") {
      setHasPrevious(navigationsData.pageInfo.hasPreviousPage);
      setHasNext(navigationsData.pageInfo.hasNextPage);
      const data = transBeforeData({
        menus: navigationsData,
      });
      setNavigationData(data);
    } else {
      setHasPrevious(itemsData.pageInfo.hasPreviousPage);
      setHasNext(itemsData.pageInfo.hasNextPage);
      const data = transBeforeData({
        menus: itemsData,
      });
      setItemData(data);
    }
    setConfirmData([]);
    setTranslatedValues({});
  }, [selectNavigationKey]);

  useEffect(() => {
    if (navigationData && selectNavigationKey === "names")
      setResourceData(generateMenuItemsArray(navigationData));
  }, [navigationData]);

  useEffect(() => {
    if (ItemData && selectNavigationKey === "items")
      setResourceData(generateMenuItemsArray(ItemData));
  }, [ItemData]);

  useEffect(() => {
    if (actionData && selectNavigationKey === "names") {
      if ("nextNavigations" in actionData) {
        setNavigationsData(actionData.nextNavigations);
      } else if ("previousNavigations" in actionData) {
        setNavigationsData(actionData.previousNavigations);
      }
    } else if (actionData && selectNavigationKey === "items") {
      if ("nextItems" in actionData) {
        setItemsData(actionData.nextItems);
      } else if ("previousItems" in actionData) {
        setItemsData(actionData.previousItems);
      }
    }
  }, [actionData]);

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
      setConfirmData([])
    }
    setConfirmLoading(false);
  }, [confirmFetcher.data]);

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
        return <Input disabled value={record?.default_language} />;
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
            <Input
              value={translatedValues[record?.key]}
              onChange={(e) =>
                handleInputChange(record.key, e.target.value, record.index)
              }
            />
          )
        );
      },
    },
  ];

  const handleInputChange = (key: string, value: string, index: number) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [key]: value, // 更新对应的 key
    }));
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
      } else if (selectNavigationKey === "names") {
        // 如果 key 不存在，新增一条数据
        const newItem = {
          resourceId: navigations.nodes[index]?.resourceId,
          locale: navigations.nodes[index]?.translatableContent[0]?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest:
            navigations.nodes[index]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      } else {
        const newItem = {
          resourceId: navigationItems.nodes[index]?.resourceId,
          locale: navigationItems.nodes[index]?.translatableContent[0]?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest:
            navigationItems.nodes[index]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const transBeforeData = ({ menus }: { menus: any }) => {
    let data: ItemType[] = [
      {
        key: "",
        label: "",
        translations: {
          key: "",
          label: "",
        },
      },
    ];
    data = menus.nodes.map((menu: any) => {
      // 返回修改后的 menu，确保返回类型是 ItemType
      return {
        key: menu?.resourceId,
        label:
          menu?.translatableContent.find((item: any) => item.key === "title")
            ?.value || "",
        translations: {
          key: menu?.resourceId,
          label:
            menu?.translations.find((item: any) => item.key === "title")
              ?.value || "",
        },
      };
    });
    return data;
  };
  useEffect(() => {
    console.log(confirmData);
  }, [confirmData]);
  const generateMenuItemsArray = (
    items: ItemType[],
  ): Array<{
    key: string;
    index: number;
    resource: string;
    default_language: string | undefined;
    translated: string | undefined;
  }> => {
    return items.map((item: ItemType, index: number) => {
      // 创建当前项的对象
      const currentItem = {
        key: `menu_item_${item.key}`, // 使用 key 生成唯一的 key
        index: index,
        resource: "label", // 资源字段固定为 "Menu Items"
        default_language: item?.label, // 默认语言为 item 的标题
        translated: item?.translations?.label, // 翻译字段初始化为空字符串
      };

      // 如果没有子项，只返回当前项
      return currentItem;
    });
  };

  const onPrevious = () => {
    if (selectNavigationKey === "names") {
      const formData = new FormData();
      const startCursor = navigationsData.pageInfo.startCursor;
      formData.append("navigationStartCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/navigation?language=${searchTerm}`,
      }); // 提交表单请求
    } else {
      const formData = new FormData();
      const startCursor = itemsData.pageInfo.startCursor;
      formData.append("itemStartCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/navigation?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const onNext = () => {
    if (selectNavigationKey === "names") {
      const formData = new FormData();
      const endCursor = navigationsData.pageInfo.endCursor;
      formData.append("navigationEndCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/navigation?language=${searchTerm}`,
      }); // 提交表单请求
    } else {
      const formData = new FormData();
      const endCursor = itemsData.pageInfo.endCursor;
      formData.append("itemEndCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/navigation?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const onClick = (e: any) => {
    setSelectNavigationKey(e.key);
  };

  const handleConfirm = () => {
    setConfirmLoading(true)
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/navigation?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setNavigationData([]);
    setItemData([]);
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
          <Button onClick={handleConfirm} type="primary" disabled={confirmLoading} loading={confirmLoading}>
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
            defaultSelectedKeys={[navigationsData.nodes[0].key]}
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
