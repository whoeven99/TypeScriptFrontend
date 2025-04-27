import {
  Button,
  Input,
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
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextTransType,
  queryPreviousTransType,
} from "~/api/admin";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { SessionService } from "~/utils/session.server";
import ManageTableInput from "~/components/manageTableInput";

const { Sider, Content } = Layout;



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
  const sessionService = await SessionService.init(request);
  let shopSession = sessionService.getShopSession();
  // 如果没有 language 参数，直接返回空数据
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  if (!shopSession) {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    shopSession = {
      shop: shop,
      accessToken: accessToken as string,
    };
    sessionService.setShopSession(shopSession);
  }
  const { shop, accessToken } = shopSession;

  try {
    const navigations = await queryNextTransType({
      shop,
      accessToken,
      resourceType: "MENU",
      endCursor: "",
      locale: searchTerm || "",
    });
    const navigationItems = await queryNextTransType({
      shop,
      accessToken,
      resourceType: "LINK",
      endCursor: "",
      locale: searchTerm || "",
    });

    return json({
      searchTerm,
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
  const sessionService = await SessionService.init(request);
  let shopSession = sessionService.getShopSession();
  if (!shopSession) {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    shopSession = {
      shop: shop,
      accessToken: accessToken as string,
    };
    sessionService.setShopSession(shopSession);
  }
  const { shop, accessToken } = shopSession;
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
          shop,
          accessToken,
          resourceType: "MENU",
          startCursor: navigationStartCursor,
          locale: searchTerm || "",
        });
        return json({ previousNavigations });
      }

      case !!navigationEndCursor: {
        const nextNavigations = await queryNextTransType({
          shop,
          accessToken,
          resourceType: "MENU",
          endCursor: navigationEndCursor,
          locale: searchTerm || "",
        });
        return json({ nextNavigations });
      }

      case !!itemStartCursor: {
        const previousItems = await queryPreviousTransType({
          shop,
          accessToken,
          resourceType: "LINK",
          startCursor: itemStartCursor,
          locale: searchTerm || "",
        });
        return json({ previousItems });
      }

      case !!itemEndCursor: {
        const nextItems = await queryNextTransType({
          shop,
          accessToken,
          resourceType: "LINK",
          endCursor: itemEndCursor,
          locale: searchTerm || "",
        });
        return json({ nextItems });
      }

      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken,
          confirmData,
        });
        return json({ data: data, confirmData: confirmData });

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
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const { searchTerm, navigations, navigationItems } =
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
  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get('language');
  });
  const [isLoading, setIsLoading] = useState(true);

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
  const { t } = useTranslation();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();

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
    if (navigations) {
      setIsLoading(false);
    }
  }, [navigations]);

  useEffect(() => {
    setIsVisible(!!searchParams.get('language'));
  }, [location]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const errorItem = confirmFetcher.data.data.find((item: any) => {
        item.success === false;
      });
      if (!errorItem) {
        confirmFetcher.data.confirmData.forEach((item: any) => {
          if (item.resourceId.split("/")[3] === "Menu") {
            const index = navigationsData.nodes.findIndex((option: any) => option.resourceId === item.resourceId);
            if (index !== -1) {
              const navigation = navigationsData.nodes[index].translations.find((option: any) => option.key === item.key);
              if (navigation) {
                navigation.value = item.value;
              } else {
                navigationsData.nodes[index].translations.push({
                  key: item.key,
                  value: item.value,
                  outdated: false,
                });
              }
            }
          } else if (item.resourceId.split("/")[3] === "Link") {
            const index = itemsData.nodes.findIndex((option: any) => option.resourceId === item.resourceId);
            if (index !== -1) {
              const link = itemsData.nodes[index].translations.find((option: any) => option.key === item.key);
              if (link) {
                link.value = item.value;
              } else {
                itemsData.nodes[index].translations.push({
                  key: item.key,
                  value: item.value,
                  outdated: false,
                });
              }
            }
          }
        })
        shopify.toast.show("Saved successfully");
      } else {
        shopify.toast.show(errorItem?.errorMsg);
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
        return <ManageTableInput record={record} />;
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
            <ManageTableInput
              record={record}
              translatedValues={translatedValues}
              setTranslatedValues={setTranslatedValues}
              handleInputChange={handleInputChange}
              isRtl={searchTerm === "ar"}
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
      const existingItemIndex = prevData.findIndex(
        (item) => item.resourceId === key,
      );

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
          resourceId: navigationsData.nodes[index]?.resourceId,
          locale: navigationsData.nodes[index]?.translatableContent[0]?.locale,
          key: "title",
          value: value, // 初始为空字符串
          translatableContentDigest:
            navigationsData.nodes[index]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      } else {
        const newItem = {
          resourceId: itemsData.nodes[index]?.resourceId,
          locale: itemsData.nodes[index]?.translatableContent[0]?.locale,
          key: "title",
          value: value, // 初始为空字符串
          translatableContentDigest:
            itemsData.nodes[index]?.translatableContent[0]?.digest,
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
        label: menu?.translatableContent[0]?.value || "",
        translations: {
          key: menu?.resourceId,
          label: menu?.translations[0]?.value || "",
        },
      };
    });
    return data;
  };

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
        key: item.key, // 使用 key 生成唯一的 key
        index: index,
        resource: "label", // 资源字段固定为 "Menu Items"
        default_language: item?.label, // 默认语言为 item 的标题
        translated: item?.translations?.label, // 翻译字段初始化为空字符串
      };
      setTranslatedValues((prev) => ({
        ...prev,
        [item.key]: item.translations?.label || "", // 更新翻译值
      }));
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
    setConfirmLoading(true);
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
    navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
  };

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : navigations.nodes.length && navigationItems.nodes.length ? (
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
                disabled={confirmLoading || !confirmData.length}
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
      ) : (
        <Modal
          open={isVisible}
          footer={null}
          onCancel={onCancel}
          destroyOnClose={true}
          maskClosable={false}
        >
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
