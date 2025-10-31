import {
  Button,
  Card,
  Divider,
  Layout,
  Menu,
  Result,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate
import { Page, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";
import {
  ConfirmDataType,
  SingleTextTranslate,
  updateManageTranslation,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import ManageTableInput from "~/components/manageTableInput";
import { SaveBar } from "@shopify/app-bridge-react";
import { useDispatch, useSelector } from "react-redux";
import { setTableData } from "~/store/modules/languageTableData";
import { setLocale } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "../app.manage_translation/route";
import SideMenu from "~/components/sideMenu/sideMenu";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

interface ItemType {
  key: string;
  label: {
    value: string;
    type: string;
  };
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
  type: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 如果没有 language 参数，直接返回空数据
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return json({
    server: process.env.SERVER_URL,
    searchTerm,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const navigationStartCursor: any = JSON.parse(
      formData.get("navigationStartCursor") as string,
    );
    const navigationEndCursor: any = JSON.parse(
      formData.get("navigationEndCursor") as string,
    );
    const itemStartCursor: any = JSON.parse(
      formData.get("itemStartCursor") as string,
    );
    const itemEndCursor: any = JSON.parse(
      formData.get("itemEndCursor") as string,
    );
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!navigationStartCursor: {
        try {
          const response = await queryPreviousTransType({
            shop,
            accessToken: accessToken as string,
            resourceType: "MENU",
            startCursor: navigationStartCursor?.cursor,
            locale: navigationStartCursor?.searchTerm || searchTerm,
          });
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response,
          };
        } catch (error) {
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: undefined,
          };
        }
      }

      case !!navigationEndCursor: {
        try {
          const response = await queryNextTransType({
            shop,
            accessToken: accessToken as string,
            resourceType: "MENU",
            endCursor: navigationEndCursor?.cursor,
            locale: navigationEndCursor?.searchTerm || searchTerm,
          });
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response,
          };
        } catch (error) {
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: undefined,
          };
        }
      }

      case !!itemStartCursor: {
        try {
          const response = await queryPreviousTransType({
            shop,
            accessToken: accessToken as string,
            resourceType: "LINK",
            startCursor: itemStartCursor?.cursor,
            locale: itemStartCursor?.searchTerm || searchTerm,
          });
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response,
          };
        } catch (error) {
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: undefined,
          };
        }
      }

      case !!itemEndCursor: {
        try {
          const response = await queryNextTransType({
            shop,
            accessToken: accessToken as string,
            resourceType: "LINK",
            endCursor: itemEndCursor?.cursor,
            locale: itemEndCursor?.searchTerm || searchTerm,
          });
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response,
          };
        } catch (error) {
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: undefined,
          };
        }
      }

      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm, server } = useLoaderData<typeof loader>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const languageFetcher = useFetcher<any>();
  const menuDataFetcher = useFetcher<any>();
  const linkDataFetcher = useFetcher<any>();
  const confirmFetcher = useFetcher<any>();

  const menuData: any[] = [
    {
      key: "names",
      label: "Menu names",
    },
    {
      key: "items",
      label: "Menu items",
    },
  ];
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [navigationsData, setNavigationsData] = useState<any>();
  const [itemsData, setItemsData] = useState<any>();
  const [navigationData, setNavigationData] = useState<ItemType[]>();
  const [ItemData, setItemData] = useState<ItemType[]>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectNavigationKey, setSelectNavigationKey] =
    useState<string>("names");
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [successTranslatedKey, setSuccessTranslatedKey] = useState<string[]>(
    [],
  );
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const itemOptions = getItemOptions(t);
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("navigation");
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (languageTableData.length === 0) {
      languageFetcher.submit(
        {
          language: JSON.stringify(true),
        },
        {
          method: "post",
          action: "/app/manage_translation",
        },
      );
    }
    menuDataFetcher.submit(
      {
        navigationEndCursor: JSON.stringify({
          cursor: "",
          searchTerm,
        }),
      },
      {
        method: "post",
      },
    );
    linkDataFetcher.submit(
      {
        itemEndCursor: JSON.stringify({
          cursor: "",
          searchTerm,
        }),
      },
      {
        method: "post",
      },
    );
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    loadingItemsRef.current = loadingItems;
  }, [loadingItems]);

  useEffect(() => {
    if (languageTableData) {
      setLanguageOptions(
        languageTableData
          .filter((item: any) => !item.primary)
          .map((item: any) => ({
            label: item.language,
            value: item.locale,
          })),
      );
    }
  }, [languageTableData]);

  useEffect(() => {
    if (selectNavigationKey === "names" && navigationsData) {
      setHasPrevious(navigationsData?.pageInfo?.hasPreviousPage || false);
      setHasNext(navigationsData?.pageInfo?.hasNextPage || false);
      const data = transBeforeData({
        menus: navigationsData,
      });
      setNavigationData(data);
      if (isLoading)
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
    } else if (selectNavigationKey === "items" && itemsData) {
      setHasPrevious(itemsData.pageInfo.hasPreviousPage || false);
      setHasNext(itemsData.pageInfo.hasNextPage || false);
      const data = transBeforeData({
        menus: itemsData,
      });
      setItemData(data);
    }
    setConfirmData([]);
    setSuccessTranslatedKey([]);
    setTranslatedValues({});
    setLoadingItems([]);
  }, [selectNavigationKey, navigationsData, itemsData]);

  useEffect(() => {
    if (navigationData && selectNavigationKey === "names")
      setResourceData(generateMenuItemsArray(navigationData));
  }, [navigationData]);

  useEffect(() => {
    if (ItemData && selectNavigationKey === "items")
      setResourceData(generateMenuItemsArray(ItemData));
  }, [ItemData]);

  useEffect(() => {
    if (menuDataFetcher.data) {
      if (menuDataFetcher.data?.success) {
        setNavigationsData(menuDataFetcher.data?.response);
        isManualChangeRef.current = false; // 重置
      }
    }
  }, [menuDataFetcher.data]);

  useEffect(() => {
    if (linkDataFetcher.data) {
      if (linkDataFetcher.data?.success) {
        setItemsData(linkDataFetcher.data?.response);
      }
    }
  }, [linkDataFetcher.data]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const successfulItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === true,
      );
      const errorItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === false,
      );

      successfulItem.forEach((item: any) => {
        if (item.data.resourceId.split("/")[3] === "Menu") {
          const index = navigationsData?.nodes?.findIndex(
            (option: any) => option?.resourceId === item?.data?.resourceId,
          );
          if (index !== -1) {
            const navigation = navigationsData?.nodes[
              index
            ]?.translations?.find(
              (option: any) => option?.key === item?.data?.key,
            );
            if (navigation) {
              navigation.value = item.data.value;
            } else {
              navigationsData?.nodes[index]?.translations?.push({
                key: item.data.key,
                value: item.data.value,
              });
            }
          }
        } else if (item.data.resourceId.split("/")[3] === "Link") {
          const index = itemsData?.nodes?.findIndex(
            (option: any) => option?.resourceId === item?.data?.resourceId,
          );
          if (index !== -1) {
            const link = itemsData?.nodes[index]?.translations?.find(
              (option: any) => option?.key === item?.data?.key,
            );
            if (link) {
              link.value = item.data.value;
            } else {
              itemsData?.nodes[index]?.translations?.push({
                key: item.data.key,
                value: item.data.value,
              });
            }
          }
        }
      });
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
      setConfirmData([]);
      setSuccessTranslatedKey([]);
    }
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (languageFetcher.data) {
      if (languageFetcher.data.data) {
        const shopLanguages = languageFetcher.data.data;
        dispatch(
          setTableData(
            shopLanguages.map((language: ShopLocalesType, index: number) => ({
              key: language.locale,
              language: language.name,
              locale: language.locale,
              primary: language.primary,
              published: language.published,
            })),
          ),
        );
        const locale = shopLanguages.find(
          (language: ShopLocalesType) => language.primary === true,
        )?.locale;
        dispatch(setLocale({ locale: locale || "" }));
      }
    }
  }, [languageFetcher.data]);

  useEffect(() => {
    if (confirmData.length > 0) {
      shopify.saveBar.show("save-bar");
    } else {
      shopify.saveBar.hide("save-bar");
    }
  }, [confirmData]);

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
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: TableDataType) => {
        return (
          record && (
            <ManageTableInput
              record={record}
              isSuccess={successTranslatedKey?.includes(record?.key as string)}
              translatedValues={translatedValues}
              setTranslatedValues={setTranslatedValues}
              handleInputChange={handleInputChange}
              isRtl={searchTerm === "ar"}
            />
          )
        );
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: TableDataType) => {
        return (
          <Button
            onClick={() => {
              handleTranslate(
                selectNavigationKey === "names" ? "MENU" : "LINK",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
                record?.index || 0,
              );
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
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
        label: {
          value: "",
          type: "",
        },
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
        label: {
          value: menu?.translatableContent[0]?.value || "",
          type: menu?.translatableContent[0]?.type || "",
        },
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
    type: string | undefined;
  }> => {
    return items.map((item: ItemType, index: number) => {
      // 创建当前项的对象
      const currentItem = {
        key: item.key, // 使用 key 生成唯一的 key
        index: index,
        resource: "label", // 资源字段固定为 "Menu Items"
        default_language: item?.label?.value, // 默认语言为 item 的标题
        translated: item?.translations?.label, // 翻译字段初始化为空字符串
        type: item?.label?.type,
      };
      setTranslatedValues((prev) => ({
        ...prev,
        [item.key]: item.translations?.label || "", // 更新翻译值
      }));
      // 如果没有子项，只返回当前项
      return currentItem;
    });
  };

  const handleTranslate = async (
    resourceType: string,
    key: string,
    type: string,
    context: string,
    index: number,
  ) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: globalStore?.shop as string,
      source: globalStore?.source || "",
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(key)) {
        handleInputChange(key, data.response, index);
        setSuccessTranslatedKey((prev) => [...prev, key]);
        shopify.toast.show(t("Translated successfully"));
      }
    } else {
      shopify.toast.show(data.errorMsg);
    }
    setLoadingItems((prev) => prev.filter((item) => item !== key));
  };

  const handleLanguageChange = (language: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      menuDataFetcher.submit(
        {
          navigationEndCursor: JSON.stringify({
            cursor: "",
            searchTerm: language,
          }),
        },
        {
          method: "post",
        },
      );
      linkDataFetcher.submit(
        {
          itemEndCursor: JSON.stringify({
            cursor: "",
            searchTerm: language,
          }),
        },
        {
          method: "post",
        },
      );
      setIsLoading(true);
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/navigation?language=${language}`);
    }
  };

  const handleItemChange = (item: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setIsLoading(true);
      isManualChangeRef.current = true;
      setSelectedItem(item);
      navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
    }
  };

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setSelectNavigationKey(key);
    }
  };

  const onPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      if (selectNavigationKey === "names") {
        const startCursor = navigationsData?.pageInfo?.startCursor;
        menuDataFetcher.submit(
          {
            navigationStartCursor: JSON.stringify({
              cursor: startCursor,
              searchTerm,
            }),
          },
          {
            method: "post",
            action: `/app/manage_translation/navigation?language=${searchTerm}`,
          },
        );
      } else {
        const startCursor = itemsData.pageInfo.startCursor;
        linkDataFetcher.submit(
          {
            itemStartCursor: JSON.stringify({
              cursor: startCursor,
              searchTerm,
            }),
          },
          {
            method: "post",
            action: `/app/manage_translation/navigation?language=${searchTerm}`,
          },
        );
      }
    }
  };

  const onNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      if (selectNavigationKey === "names") {
        const endCursor = navigationsData?.pageInfo?.endCursor;
        menuDataFetcher.submit(
          {
            navigationEndCursor: JSON.stringify({
              cursor: endCursor,
              searchTerm,
            }),
          },
          {
            method: "post",
            action: `/app/manage_translation/navigation?language=${searchTerm}`,
          },
        );
      } else {
        const endCursor = itemsData.pageInfo.endCursor;
        linkDataFetcher.submit(
          {
            itemEndCursor: JSON.stringify({
              cursor: endCursor,
              searchTerm,
            }),
          },
          {
            method: "post",
            action: `/app/manage_translation/navigation?language=${searchTerm}`,
          },
        );
      }
    }
  };

  // const handleLeaveItem = (
  //   key: string | boolean | { language: string } | { item: string },
  // ) => {
  //   setIsVisible(false);
  //   if (typeof key === "string" && key !== "previous" && key !== "next") {
  //     setSelectNavigationKey(key);
  //   } else if (key === "previous") {
  //     // 向前翻页
  //     if (selectNavigationKey === "names") {
  //       const formData = new FormData();
  //       const startCursor = navigationsData.pageInfo.startCursor;
  //       formData.append("navigationStartCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
  //       submit(formData, {
  //         method: "post",
  //         action: `/app/manage_translation/navigation?language=${searchTerm}`,
  //       }); // 提交表单请求
  //     } else {
  //       const formData = new FormData();
  //       const startCursor = itemsData.pageInfo.startCursor;
  //       formData.append("itemStartCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
  //       submit(formData, {
  //         method: "post",
  //         action: `/app/manage_translation/navigation?language=${searchTerm}`,
  //       }); // 提交表单请求
  //     }
  //   } else if (key === "next") {
  //     // 向后翻页
  //     if (selectNavigationKey === "names") {
  //       const formData = new FormData();
  //       const endCursor = navigationsData.pageInfo.endCursor;
  //       formData.append("navigationEndCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
  //       submit(formData, {
  //         method: "post",
  //         action: `/app/manage_translation/navigation?language=${searchTerm}`,
  //       }); // 提交表单请求
  //     } else {
  //       const formData = new FormData();
  //       const endCursor = itemsData.pageInfo.endCursor;
  //       formData.append("itemEndCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
  //       submit(formData, {
  //         method: "post",
  //         action: `/app/manage_translation/navigation?language=${searchTerm}`,
  //       }); // 提交表单请求
  //     }
  //   } else if (typeof key === "object" && "language" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedLanguage(key.language);
  //     navigate(`/app/manage_translation/navigation?language=${key.language}`);
  //   } else if (typeof key === "object" && "item" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedItem(key.item);
  //     navigate(`/app/manage_translation/${key.item}?language=${searchTerm}`);
  //   } else {
  //     navigate(`/app/manage_translation?language=${searchTerm}`, {
  //       state: { key: searchTerm },
  //     }); // 跳转到 /app/manage_translation
  //   }
  // };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/navigation?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    setNavigationsData({ ...navigationsData });
    setItemsData({ ...itemsData });
    setConfirmData([]);
    setSuccessTranslatedKey([]);
  };

  const onCancel = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      navigate(`/app/manage_translation?language=${searchTerm}`, {
        state: { key: searchTerm },
      }); // 跳转到 /app/manage_translation
    }
  };

  return (
    <Page
      title={t("Navigation")}
      fullWidth={true}
      // primaryAction={{
      //   content: t("Save"),
      //   loading: confirmFetcher.state === "submitting",
      //   disabled:
      //     confirmData.length == 0 || confirmFetcher.state === "submitting",
      //   onAction: handleConfirm,
      // }}
      // secondaryActions={[
      //   {
      //     content: t("Cancel"),
      //     loading: confirmFetcher.state === "submitting",
      //     disabled:
      //       confirmData.length == 0 || confirmFetcher.state === "submitting",
      //     onAction: handleDiscard,
      //   },
      // ]}
      backAction={{
        onAction: onCancel,
      }}
    >
      <SaveBar id="save-bar">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={confirmFetcher.state === "submitting" ? "true" : undefined}
        >
          {t("Save")}
        </button>
        <button onClick={handleDiscard}>{t("Cancel")}</button>
      </SaveBar>
      <Layout
        style={{
          overflow: "auto",
          backgroundColor: "var(--p-color-bg)",
          height: "calc(100vh - 104px)",
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Spin />
          </div>
        ) : navigationsData?.nodes?.length ? (
          <>
            {!isMobile && (
              <Sider
                style={{
                  height: "100%",
                  minHeight: "70vh",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "auto",
                  backgroundColor: "var(--p-color-bg)",
                }}
              >
                <SideMenu
                  items={menuData}
                  selectedKeys={selectNavigationKey}
                  onClick={handleMenuChange}
                />
              </Sider>
            )}
            <Content
              style={{
                paddingLeft: isMobile ? "16px" : "24px",
                height: "calc(100% - 25px)",
                minHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
              }}
            >
              {isMobile ? (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {
                        menuData!.find(
                          (item: any) => item.key === selectNavigationKey,
                        )?.label
                      }
                    </Title>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexGrow: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "100px",
                        }}
                      >
                        <Select
                          label={""}
                          options={languageOptions}
                          value={selectedLanguage}
                          onChange={(value) => handleLanguageChange(value)}
                        />
                      </div>
                      <div
                        style={{
                          width: "100px",
                        }}
                      >
                        <Select
                          label={""}
                          options={itemOptions}
                          value={selectedItem}
                          onChange={(value) => handleItemChange(value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Card title={t("Resource")}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {resourceData.map((item: any, index: number) => {
                        return (
                          <Space
                            key={index}
                            direction="vertical"
                            size="small"
                            style={{ width: "100%" }}
                          >
                            <Text
                              strong
                              style={{
                                fontSize: "16px",
                              }}
                            >
                              {t(item.resource)}
                            </Text>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              <Text>{t("Default Language")}</Text>
                              <ManageTableInput record={item} />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              <Text>{t("Translated")}</Text>
                              <ManageTableInput
                                isSuccess={successTranslatedKey?.includes(
                                  item?.key as string,
                                )}
                                translatedValues={translatedValues}
                                setTranslatedValues={setTranslatedValues}
                                handleInputChange={handleInputChange}
                                isRtl={searchTerm === "ar"}
                                record={item}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <Button
                                onClick={() => {
                                  handleTranslate(
                                    selectNavigationKey === "names"
                                      ? "MENU"
                                      : "LINK",
                                    item?.key || "",
                                    item?.type || "",
                                    item?.default_language || "",
                                    item?.index || 0,
                                  );
                                }}
                                loading={loadingItems.includes(item?.key || "")}
                              >
                                {t("Translate")}
                              </Button>
                            </div>
                            <Divider
                              style={{
                                margin: "8px 0",
                              }}
                            />
                          </Space>
                        );
                      })}
                    </Space>
                  </Card>
                  <SideMenu
                    items={menuData}
                    selectedKeys={selectNavigationKey}
                    onClick={handleMenuChange}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {(hasNext || hasPrevious) && (
                      <Pagination
                        hasPrevious={hasPrevious}
                        onPrevious={onPrevious}
                        hasNext={hasNext}
                        onNext={onNext}
                      />
                    )}
                  </div>
                </Space>
              ) : (
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {
                        menuData!.find(
                          (item: any) => item.key === selectNavigationKey,
                        )?.label
                      }
                    </Title>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexGrow: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "150px",
                        }}
                      >
                        <Select
                          label={""}
                          options={languageOptions}
                          value={selectedLanguage}
                          onChange={(value) => handleLanguageChange(value)}
                        />
                      </div>
                      <div
                        style={{
                          width: "150px",
                        }}
                      >
                        <Select
                          label={""}
                          options={itemOptions}
                          value={selectedItem}
                          onChange={(value) => handleItemChange(value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Table
                    columns={resourceColumns}
                    dataSource={resourceData}
                    pagination={false}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {(hasNext || hasPrevious) && (
                      <Pagination
                        hasPrevious={hasPrevious}
                        onPrevious={onPrevious}
                        hasNext={hasNext}
                        onNext={onNext}
                      />
                    )}
                  </div>
                </Space>
              )}
            </Content>
          </>
        ) : (
          <Result
            title={t("The specified fields were not found in the store.")}
            extra={
              <Button type="primary" onClick={onCancel}>
                {t("Yes")}
              </Button>
            }
          />
        )}
      </Layout>
      {/* <Modal
        variant={"base"}
        open={!!isVisible}
        onHide={() => setIsVisible(false)}
      >
        <div
          style={{
            padding: "16px",
          }}
        >
          <Text>
            {t("If you leave this page, any unsaved changes will be lost.")}
          </Text>
        </div>
        <TitleBar title={t("Unsaved changes")}>
          <button
            variant="primary"
            tone="critical"
            onClick={() => handleLeaveItem(isVisible)}
          >
            {t("Leave Anyway")}
          </button>
          <button onClick={() => setIsVisible(false)}>
            {t("Stay on Page")}
          </button>
        </TitleBar>
      </Modal> */}
    </Page>
  );
};

export default Index;
