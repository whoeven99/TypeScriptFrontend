import {
  Button,
  Card,
  Divider,
  Layout,
  Menu,
  MenuProps,
  Result,
  Space,
  Spin,
  Table,
  theme,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { FullscreenBar, Page, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";
import {
  ConfirmDataType,
  SingleTextTranslate,
  updateManageTranslation,
} from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Modal, SaveBar, TitleBar } from "@shopify/app-bridge-react";
import { ShopLocalesType } from "../app.language/route";
import { setUserConfig } from "~/store/modules/userConfig";
import { setTableData } from "~/store/modules/languageTableData";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

interface PageType {
  key: string;
  title: {
    value: string;
    type: string;
  };
  body: {
    value: string;
    type: string;
  };
  handle: {
    value: string;
    type: string;
  };
  seo: {
    title: {
      value: string;
      type: string;
    };
    description: {
      value: string;
      type: string;
    };
  };
  translations: {
    key: string;
    body: string | undefined;
    title: string | undefined;
    handle: string | undefined;
    seo: {
      description: string | undefined;
      title: string | undefined;
    };
  };
}

type TableDataType = {
  key: string;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
  type: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 如果没有 language 参数，直接返回空数据
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  console.log(`${shop} load manage_translation_page`);

  try {
    const pages = await queryNextTransType({
      shop,
      accessToken: accessToken as string,
      resourceType: "PAGE",
      endCursor: "",
      locale: searchTerm || "",
    });
    return json({
      server: process.env.SERVER_URL,
      shopName: shop,
      searchTerm,
      pages,
    });
  } catch (error) {
    console.error("Error load page:", error);
    throw new Response("Error load page", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!startCursor:
        const previousPages = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PAGE",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousPages: previousPages });
      case !!endCursor:
        const nextPages = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: "PAGE",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ nextPages: nextPages });
      case !!confirmData:
        const data = await updateManageTranslation({
          shop,
          accessToken: accessToken as string,
          confirmData,
        });
        return json({ data: data, confirmData: confirmData });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action page:", error);
    throw new Response("Error action page", { status: 500 });
  }
};

const Index = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm, pages, server, shopName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const isManualChangeRef = useRef(true);
  const loadingItemsRef = useRef<string[]>([]);

  const submit = useSubmit(); // 使用 useSubmit 钩子
  const confirmFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  // const [isVisible, setIsVisible] = useState<
  //   boolean | string | { language: string } | { item: string }
  // >(false);

  const [menuData, setMenuData] = useState<any[]>([]);
  const [pagesData, setPagesData] = useState(pages);
  const [pageData, setPageData] = useState<PageType>();
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([]);
  const [selectPageKey, setSelectPageKey] = useState(
    pages.nodes[0]?.resourceId,
  );
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const itemOptions = [
    { label: t("Products"), value: "product" },
    { label: t("Collection"), value: "collection" },
    { label: t("Theme"), value: "theme" },
    { label: t("Shop"), value: "shop" },
    { label: t("Store metadata"), value: "metafield" },
    { label: t("Articles"), value: "article" },
    { label: t("Blog titles"), value: "blog" },
    { label: t("Pages"), value: "page" },
    { label: t("Filters"), value: "filter" },
    { label: t("Metaobjects"), value: "metaobject" },
    { label: t("Navigation"), value: "navigation" },
    { label: t("Email"), value: "email" },
    { label: t("Policies"), value: "policy" },
    { label: t("Product images"), value: "productImage" },
    { label: t("Product image alt text"), value: "productImageAlt" },
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ];
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("page");
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    pagesData?.pageInfo.hasPreviousPage || false,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    pagesData?.pageInfo.hasNextPage || false,
  );
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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    if (pages) {
      setMenuData(exMenuData(pages));
      setIsLoading(false);
    }
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
    if (pages && isManualChangeRef.current) {
      setPagesData(pages);
      setMenuData(exMenuData(pages));
      setSelectPageKey(pages.nodes[0]?.resourceId);
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      setHasPrevious(pagesData.pageInfo.hasPreviousPage);
      setHasNext(pagesData.pageInfo.hasNextPage);
      isManualChangeRef.current = false; // 重置
    }
  }, [pages]);

  useEffect(() => {
    const data = transBeforeData({
      pages: pagesData,
    });
    setPageData(data);
    setConfirmData([]);
    setTranslatedValues({});
    setLoadingItems([]);
  }, [selectPageKey, pagesData]);

  useEffect(() => {
    setResourceData(
      [
        {
          key: "title",
          resource: t("Title"),
          default_language: pageData?.title.value,
          translated: pageData?.translations?.title,
          type: pageData?.title.type,
        },
        {
          key: "body",
          resource: t("Description"),
          default_language: pageData?.body.value,
          translated: pageData?.translations?.body,
          type: pageData?.body.type,
        },
      ].filter((item) => item.default_language),
    );
    setSeoData(
      [
        {
          key: "handle",
          resource: t("URL handle"),
          default_language: pageData?.handle.value,
          translated: pageData?.translations?.handle,
          type: pageData?.handle.type,
        },
        {
          key: "meta_title",
          resource: t("Meta title"),
          default_language: pageData?.seo.title.value,
          translated: pageData?.translations?.seo.title,
          type: pageData?.seo.title.type,
        },
        {
          key: "meta_description",
          resource: t("Meta description"),
          default_language: pageData?.seo.description.value,
          translated: pageData?.translations?.seo.description,
          type: pageData?.seo.description.type,
        },
      ].filter((item) => item.default_language),
    );
  }, [pageData]);

  useEffect(() => {
    if (actionData && "nextPages" in actionData) {
      const nextPages = exMenuData(actionData.nextPages);
      // 在这里处理 nextPages
      setMenuData(nextPages);
      setPagesData(actionData.nextPages);
      setSelectPageKey(actionData.nextPages.nodes[0]?.resourceId);
    } else if (actionData && "previousPages" in actionData) {
      const previousPages = exMenuData(actionData.previousPages);
      // 在这里处理 previousPages
      setMenuData(previousPages);
      setPagesData(actionData.previousPages);
      setSelectPageKey(actionData.previousPages.nodes[0]?.resourceId);
    } else {
      // 如果不存在 nextPages，可以执行其他逻辑
    }
  }, [actionData]);

  useEffect(() => {
    if (confirmFetcher.data && confirmFetcher.data.data) {
      const successfulItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === true,
      );
      const errorItem = confirmFetcher.data.data.filter(
        (item: any) => item.success === false,
      );

      successfulItem.forEach((item: any) => {
        const index = pagesData.nodes.findIndex(
          (option: any) => option.resourceId === item.data.resourceId,
        );
        if (index !== -1) {
          const page = pagesData.nodes[index].translations.find(
            (option: any) => option.key === item.data.key,
          );
          if (page) {
            page.value = item.data.value;
          } else {
            pagesData.nodes[index].translations.push({
              key: item.data.key,
              value: item.data.value,
            });
          }
        }
      });
      if (errorItem.length == 0) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
      setConfirmData([]);
    }
  }, [confirmFetcher.data]);

  useEffect(() => {
    if (languageFetcher.data) {
      if (languageFetcher.data.data) {
        const shopLanguages = languageFetcher.data.data;
        dispatch(
          setTableData(
            shopLanguages.map((language: ShopLocalesType, index: number) => ({
              key: index,
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
        dispatch(setUserConfig({ locale: locale || "" }));
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
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            isRtl={searchTerm === "ar"}
          />
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
                "PAGE",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
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

  const SEOColumns = [
    {
      title: "SEO",
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
          <ManageTableInput
            record={record}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            isRtl={searchTerm === "ar"}
          />
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
                "PAGE",
                record?.key || "",
                record?.type || "",
                record?.default_language || "",
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

  const exMenuData = (pages: any) => {
    const data = pages.nodes.map((page: any) => ({
      key: page?.resourceId,
      label: page?.translatableContent.find((item: any) => item.key === "title")
        .value,
    }));
    return data;
  };

  const handleInputChange = (key: string, value: string) => {
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
      } else {
        // 如果 key 不存在，新增一条数据
        const newItem = {
          resourceId: pagesData.nodes.find(
            (item: any) => item?.resourceId === selectPageKey,
          )?.resourceId,
          locale: pagesData.nodes
            .find((item: any) => item?.resourceId === selectPageKey)
            ?.translatableContent.find((item: any) => item.key === key)?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: pagesData.nodes
            .find((item: any) => item?.resourceId === selectPageKey)
            ?.translatableContent.find((item: any) => item.key === key)?.digest,
          target: searchTerm || "",
        };

        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const transBeforeData = ({ pages }: { pages: any }) => {
    let data: PageType = {
      key: "",
      title: {
        value: "",
        type: "",
      },
      body: {
        value: "",
        type: "",
      },
      handle: {
        value: "",
        type: "",
      },
      seo: {
        description: {
          value: "",
          type: "",
        },
        title: {
          value: "",
          type: "",
        },
      },
      translations: {
        key: "",
        title: "",
        body: "",
        handle: "",
        seo: {
          description: "",
          title: "",
        },
      },
    };
    const page = pages.nodes.find(
      (page: any) => page?.resourceId === selectPageKey,
    );
    data.key = page?.resourceId;
    data.title = {
      value: page?.translatableContent.find((item: any) => item.key === "title")
        ?.value,
      type: page?.translatableContent.find((item: any) => item.key === "title")
        ?.type,
    };
    data.body = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "body_html",
      )?.type,
    };
    data.handle = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "handle",
      )?.value,
      type: page?.translatableContent.find((item: any) => item.key === "handle")
        ?.type,
    };
    data.seo.title = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "meta_title",
      )?.type,
    };
    data.seo.description = {
      value: page?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.value,
      type: page?.translatableContent.find(
        (item: any) => item.key === "meta_description",
      )?.type,
    };
    data.translations.key = page?.resourceId;
    data.translations.title = page?.translations.find(
      (item: any) => item.key === "title",
    )?.value;
    data.translations.body = page?.translations.find(
      (item: any) => item.key === "body_html",
    )?.value;
    data.translations.handle = page?.translations.find(
      (item: any) => item.key === "handle",
    )?.value;
    data.translations.seo.title = page?.translations.find(
      (item: any) => item.key === "meta_title",
    )?.value;
    data.translations.seo.description = page?.translations.find(
      (item: any) => item.key === "meta_description",
    )?.value;
    return data;
  };

  const handleTranslate = async (
    resourceType: string,
    key: string,
    type: string,
    context: string,
  ) => {
    if (!key || !type || !context) {
      return;
    }
    setLoadingItems((prev) => [...prev, key]);
    const data = await SingleTextTranslate({
      shopName: shopName,
      source: pagesData.nodes
        .find((item: any) => item?.resourceId === selectPageKey)
        ?.translatableContent.find((item: any) => item.key === key)?.locale,
      target: searchTerm || "",
      resourceType: resourceType,
      context: context,
      key: key,
      type: type,
      server: server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(key)) {
        handleInputChange(key, data.response);
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
      setIsLoading(true);
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/page?language=${language}`);
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
      setSelectPageKey(key);
    }
  };

  const onPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      const formData = new FormData();
      const startCursor = pagesData.pageInfo.startCursor;
      formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/page?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const onNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      const formData = new FormData();
      const endCursor = pagesData.pageInfo.endCursor;
      formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
      submit(formData, {
        method: "post",
        action: `/app/manage_translation/page?language=${searchTerm}`,
      }); // 提交表单请求
    }
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    confirmFetcher.submit(formData, {
      method: "post",
      action: `/app/manage_translation/page?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const handleDiscard = () => {
    shopify.saveBar.hide("save-bar");
    const data = transBeforeData({
      pages: pagesData,
    });
    setPagesData(data);
    setConfirmData([]);
  };

  // const handleLeaveItem = (
  //   key: string | boolean | { language: string } | { item: string },
  // ) => {
  //   setIsVisible(false);
  //   if (typeof key === "string" && key !== "previous" && key !== "next") {
  //     setSelectPageKey(key);
  //   } else if (key === "previous") {
  //     // 向前翻页
  //     const formData = new FormData();
  //     const startCursor = pagesData.pageInfo.startCursor;
  //     formData.append("startCursor", JSON.stringify(startCursor));
  //     submit(formData, {
  //       method: "post",
  //       action: `/app/manage_translation/page?language=${searchTerm}`,
  //     });
  //   } else if (key === "next") {
  //     // 向后翻页
  //     const formData = new FormData();
  //     const endCursor = pagesData.pageInfo.endCursor;
  //     formData.append("endCursor", JSON.stringify(endCursor));
  //     submit(formData, {
  //       method: "post",
  //       action: `/app/manage_translation/page?language=${searchTerm}`,
  //     });
  //   } else if (typeof key === "object" && "language" in key) {
  //     setIsLoading(true);
  //     isManualChangeRef.current = true;
  //     setSelectedLanguage(key.language);
  //     navigate(`/app/manage_translation/page?language=${key.language}`);
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
      title={t("Pages")}
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
          loading={confirmFetcher.state === "submitting" && ""}
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
        ) : pages.nodes.length ? (
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[pagesData.nodes[0]?.resourceId]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                      backgroundColor: "var(--p-color-bg)",
                    }}
                    items={menuData}
                    selectedKeys={[selectPageKey]}
                    onClick={(e: any) => {
                      handleMenuChange(e.key);
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Pagination
                      hasPrevious={hasPrevious}
                      onPrevious={onPrevious}
                      hasNext={hasNext}
                      onNext={onNext}
                    />
                  </div>
                </div>
              </Sider>
            )}
            <Content
              style={{
                paddingLeft: isMobile ? "16px" : "24px",
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
                          (item: any) => item.key === selectPageKey,
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
                      {resourceData.map((item: any) => {
                        return (
                          <Space
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
                                    "PAGE",
                                    item?.key || "",
                                    item?.type || "",
                                    item?.default_language || "",
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
                  <Card title={t("SEO")}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {SeoData.map((item: any, index: number) => {
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
                                    "PAGE",
                                    item?.key || "",
                                    item?.type || "",
                                    item?.default_language || "",
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
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={[pagesData.nodes[0]?.resourceId]}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                    }}
                    items={menuData}
                    selectedKeys={[selectPageKey]}
                    onClick={(e) => handleMenuChange(e.key)}
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
                          (item: any) => item.key === selectPageKey,
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
                  <Table
                    columns={SEOColumns}
                    dataSource={SeoData}
                    pagination={false}
                  />
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
