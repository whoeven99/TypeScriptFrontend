import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { SaveBar } from "@shopify/app-bridge-react";
import { Page, Pagination, Select } from "@shopify/polaris";
import {
  Button,
  Card,
  Layout,
  Space,
  Spin,
  Image,
  Typography,
  Divider,
  Table,
  Input,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { authenticate } from "~/shopify.server";
import {
  GetProductImageData,
  SingleTextTranslate,
  UpdateProductImageAltData,
} from "~/api/JavaServer";
import { globalStore } from "~/globalStore";
import { getItemOptions } from "../app.manage_translation/route";
import useReport from "~/scripts/eventReport";
import styles from "./styles.module.css";
import SideMenu from "~/components/sideMenu/sideMenu";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return json({
    searchTerm,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  const formData = await request.formData();
  const loading: any = JSON.parse(formData.get("loading") as string);
  const productStartCursor: any = JSON.parse(
    formData.get("productStartCursor") as string,
  );
  const productEndCursor: any = JSON.parse(
    formData.get("productEndCursor") as string,
  );
  const imageStartCursor: any = JSON.parse(
    formData.get("imageStartCursor") as string,
  );
  const imageEndCursor: any = JSON.parse(
    formData.get("imageEndCursor") as string,
  );

  switch (true) {
    case !!loading:
      try {
        const loadData = await admin.graphql(
          `query {
            products(first: 20, reverse: true) {
              edges {
                node {
                  id
                  title
                  images(first: 20) {
                    edges {
                      node {
                        id
                        url
                        altText
                      }
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                    }
                  }
                }
              } 
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
            }
          }`,
        );
        const response = await loadData.json();
        console.log("loadData", response?.data?.products?.edges);
        if (response?.data?.products?.edges.length > 0) {
          const menuData = response?.data?.products?.edges.map((item: any) => {
            return {
              key: item?.node?.id,
              label: item?.node?.title,
            };
          });
          const imageData = response?.data?.products?.edges.map((item: any) => {
            return item?.node?.images?.edges.map((image: any) => {
              return {
                key: image?.node?.id,
                productId: item?.node?.id,
                productTitle: item?.node?.title,
                imageUrl: image?.node?.url,
                imageId: image?.node?.id,
                altText: image?.node?.altText,
                targetAltText: "",
                imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                imageHasPreviousPage:
                  item?.node?.images?.pageInfo?.hasPreviousPage,
              };
            });
          });
          return json({
            menuData,
            imageData,
            productStartCursor: response?.data?.products?.pageInfo?.startCursor,
            productEndCursor: response?.data?.products?.pageInfo?.endCursor,
            productHasNextPage: response?.data?.products?.pageInfo?.hasNextPage,
            productHasPreviousPage:
              response?.data?.products?.pageInfo?.hasPreviousPage,
          });
        } else {
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      } catch (error) {
        console.error("Error action loadData productImage:", error);
        return json({
          menuData: [],
          imageData: [],
          productStartCursor: "",
          productEndCursor: "",
          productHasNextPage: "",
          productHasPreviousPage: "",
        });
      }
    case !!productStartCursor:
      try {
        const loadData = await admin.graphql(
          `query {
              products(last: 20, before: "${productStartCursor?.productsStartCursor}", reverse: true) {
                edges {
                  node {    
                    id
                    title
                    images(first: 20) {
                      edges {
                        node {
                          id    
                          url
                          altText
                        }
                      }
                      pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                      }
                    }
                  }
                }   
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
              }
            }`,
        );
        const response = await loadData.json();
        console.log("productStartCursor", response?.data?.products?.edges);
        if (response?.data?.products?.edges.length > 0) {
          const menuData = response?.data?.products?.edges.map((item: any) => {
            return {
              key: item?.node?.id,
              label: item?.node?.title,
            };
          });
          const imageData = response?.data?.products?.edges.map((item: any) => {
            return item?.node?.images?.edges.map((image: any) => {
              return {
                key: image?.node?.id,
                productId: item?.node?.id,
                productTitle: item?.node?.title,
                imageUrl: image?.node?.url,
                imageId: image?.node?.id,
                altText: image?.node?.altText,
                targetAltText: "",
                imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                imageHasPreviousPage:
                  item?.node?.images?.pageInfo?.hasPreviousPage,
              };
            });
          });
          return json({
            menuData,
            imageData,
            productStartCursor: response?.data?.products?.pageInfo?.startCursor,
            productEndCursor: response?.data?.products?.pageInfo?.endCursor,
            productHasNextPage: response?.data?.products?.pageInfo?.hasNextPage,
            productHasPreviousPage:
              response?.data?.products?.pageInfo?.hasPreviousPage,
          });
        } else {
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      } catch (error) {
        console.error("Error action productStartCursor productImage:", error);
        return json({
          menuData: [],
          imageData: [],
          productStartCursor: "",
          productEndCursor: "",
          productHasNextPage: "",
          productHasPreviousPage: "",
        });
      }
    case !!productEndCursor:
      try {
        const loadData = await admin.graphql(
          `query {
              products(first: 20, after: "${productEndCursor?.productsEndCursor}", reverse: true) {
                edges {
                  node {    
                    id
                    title
                    images(first: 20) {
                      edges {
                        node {
                          id    
                          url
                          altText
                        }
                      }
                      pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                      }
                    }
                  }
                } 
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
              }
            }`,
        );
        const response = await loadData.json();
        console.log("productEndCursor", response?.data?.products?.edges);
        if (response?.data?.products?.edges.length > 0) {
          const menuData = response?.data?.products?.edges.map((item: any) => {
            return {
              key: item?.node?.id,
              label: item?.node?.title,
            };
          });
          const imageData = response?.data?.products?.edges.map((item: any) => {
            return item?.node?.images?.edges.map((image: any) => {
              return {
                key: image?.node?.id,
                productId: item?.node?.id,
                productTitle: item?.node?.title,
                imageUrl: image?.node?.url,
                imageId: image?.node?.id,
                altText: image?.node?.altText,
                targetAltText: "",
                imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                imageHasPreviousPage:
                  item?.node?.images?.pageInfo?.hasPreviousPage,
              };
            });
          });
          return json({
            menuData,
            imageData,
            productStartCursor: response?.data?.products?.pageInfo?.startCursor,
            productEndCursor: response?.data?.products?.pageInfo?.endCursor,
            productHasNextPage: response?.data?.products?.pageInfo?.hasNextPage,
            productHasPreviousPage:
              response?.data?.products?.pageInfo?.hasPreviousPage,
          });
        } else {
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      } catch (error) {
        console.error("Error action productStartCursor productImage:", error);
        return json({
          menuData: [],
          imageData: [],
          productStartCursor: "",
          productEndCursor: "",
          productHasNextPage: "",
          productHasPreviousPage: "",
        });
      }
    case !!imageStartCursor:
      try {
        const loadData = await admin.graphql(
          `query {
            product(id: "${imageStartCursor?.productId}") {
              id
              title
              images(last: 20, before: "${imageStartCursor?.imageStartCursor}") {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
              }
            }
          }`,
        );
        const response = await loadData.json();
        console.log("imageStartCursor", response?.data?.product?.images?.edges);
        if (response?.data?.product?.images?.edges.length > 0) {
          const imageData = response?.data?.product?.images?.edges.map(
            (item: any) => {
              return {
                key: item?.node?.id,
                productId: response?.data?.product?.id,
                productTitle: response?.data?.product?.title,
                imageId: item?.node?.id,
                imageUrl: item?.node?.url,
                altText: item?.node?.altText,
                targetAltText: "",
                imageStartCursor:
                  response?.data?.product?.images?.pageInfo?.startCursor,
                imageEndCursor:
                  response?.data?.product?.images?.pageInfo?.endCursor,
                imageHasNextPage:
                  response?.data?.product?.images?.pageInfo?.hasNextPage,
                imageHasPreviousPage:
                  response?.data?.product?.images?.pageInfo?.hasPreviousPage,
              };
            },
          );
          return json({
            imageData,
          });
        } else {
          return json({
            imageData: [],
          });
        }
      } catch (error) {
        console.error("Error action imageStartCursor productImage:", error);
        return json({
          imageData: [],
        });
      }
    case !!imageEndCursor:
      try {
        const loadData = await admin.graphql(
          `query {
            product(id: "${imageEndCursor?.productId}") {
              id    
              title
              images(first: 20, after: "${imageEndCursor?.imageEndCursor}") {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
              }
            }
          }`,
        );
        const response = await loadData.json();
        console.log("imageEndCursor", response?.data?.product?.images?.edges);
        if (response?.data?.product?.images?.edges.length > 0) {
          const imageData = response?.data?.product?.images?.edges.map(
            (item: any) => {
              return {
                key: item?.node?.id,
                productId: response?.data?.product?.id,
                productTitle: response?.data?.product?.title,
                imageId: item?.node?.id,
                imageUrl: item?.node?.url,
                altText: item?.node?.altText,
                targetAltText: "",
                imageStartCursor:
                  response?.data?.product?.images?.pageInfo?.startCursor,
                imageEndCursor:
                  response?.data?.product?.images?.pageInfo?.endCursor,
                imageHasNextPage:
                  response?.data?.product?.images?.pageInfo?.hasNextPage,
                imageHasPreviousPage:
                  response?.data?.product?.images?.pageInfo?.hasPreviousPage,
              };
            },
          );
          return json({
            imageData,
          });
        } else {
          return json({
            imageData: [],
          });
        }
      } catch (error) {
        console.error("Error action imageEndCursor productImage:", error);
        return json({
          imageData: [],
        });
      }

    default:
      return null;
  }
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reportClick } = useReport();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { searchTerm } = useLoaderData<typeof loader>();

  const isManualChangeRef = useRef(false);
  const loadingItemsRef = useRef<string[]>([]);

  const fetcher = useFetcher<any>();
  const loadFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [menuData, setMenuData] = useState<any>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [dataResource, setDataResource] = useState<any>([]);
  const [productAltTextData, setProductAltTextData] = useState<
    {
      key: string;
      productTitle: string;
      imageUrl: string;
      altText: string;
      targetAltText: string;
      imageHasNextPage: boolean;
      imageHasPreviousPage: boolean;
      imageStartCursor: string;
      imageEndCursor: string;
    }[]
  >([
    {
      key: "",
      productTitle: "",
      imageUrl: "",
      altText: "",
      targetAltText: "",
      imageHasNextPage: false,
      imageHasPreviousPage: false,
      imageStartCursor: "",
      imageEndCursor: "",
    },
  ]);
  const [productsHasNextPage, setProductsHasNextPage] = useState(false);
  const [productsHasPreviousPage, setProductsHasPreviousPage] = useState(false);
  const [productsStartCursor, setProductsStartCursor] = useState("");
  const [productsEndCursor, setProductsEndCursor] = useState("");
  const [imageHasPreviousPage, setImageHasPreviousPage] = useState(false);
  const [imageHasNextPage, setImageHasNextPage] = useState(false);
  const [imageStartCursor, setImageStartCursor] = useState("");
  const [imageEndCursor, setImageEndCursor] = useState("");
  const [confirmData, setConfirmData] = useState<any>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("productImageAlt");
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [successTranslatedKey, setSuccessTranslatedKey] = useState<string[]>(
    [],
  );
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const itemOptions = getItemOptions(t);

  useEffect(() => {
    loadFetcher.submit({ loading: true }, { method: "post" });
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在翻译管理-产品图片Alt图片描述页面`,
      },
      {
        method: "POST",
        action: "/log",
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
    if (loadFetcher.data) {
      setMenuData(loadFetcher.data.menuData);
      setDataResource(loadFetcher.data.imageData);
      setSelectedKey(loadFetcher.data.menuData[0]?.key || "");
      setProductsHasNextPage(loadFetcher.data.productHasNextPage);
      setProductsHasPreviousPage(loadFetcher.data.productHasPreviousPage);
      setProductsStartCursor(loadFetcher.data.productStartCursor);
      setProductsEndCursor(loadFetcher.data.productEndCursor);
      setTableDataLoading(false);
      setIsLoading(false);
    }
  }, [loadFetcher.data]);

  useEffect(() => {
    if (productsFetcher.data) {
      setMenuData(productsFetcher.data.menuData);
      setDataResource(productsFetcher.data.imageData);
      setSelectedKey(productsFetcher.data.menuData[0]?.key || "");
      setProductsHasNextPage(productsFetcher.data.productHasNextPage);
      setProductsHasPreviousPage(productsFetcher.data.productHasPreviousPage);
      setProductsStartCursor(productsFetcher.data.productStartCursor);
      setProductsEndCursor(productsFetcher.data.productEndCursor);
    }
  }, [productsFetcher.data]);

  useEffect(() => {
    if (imageFetcher.data) {
      setProductAltTextData(imageFetcher.data.imageData);
    }
  }, [imageFetcher.data]);

  // 更新 loadingItemsRef 的值
  useEffect(() => {
    loadingItemsRef.current = loadingItems;
  }, [loadingItems]);

  useEffect(() => {
    if (selectedKey && dataResource.length > 0) {
      const data =
        dataResource.filter(
          (item: any) => item[0]?.productId === selectedKey,
        )[0] || [];
      async function getTargetData() {
        const targetData = await GetProductImageData({
          server: globalStore?.server || "",
          shopName: globalStore?.shop || "",
          productId: selectedKey,
          languageCode: selectedLanguage,
        });
        if (targetData?.success && targetData?.response?.length > 0) {
          setProductAltTextData(
            data.map((item: any) => {
              const index = targetData.response.findIndex(
                (image: any) => item.imageUrl === image.imageBeforeUrl,
              );
              if (index !== -1) {
                return {
                  ...item,
                  imageUrl:
                    targetData.response[index].imageAfterUrl || item.imageUrl,
                  targetAltText: targetData.response[index].altAfterTranslation,
                };
              }
              return item;
            }),
          );
        } else {
          setProductAltTextData(data);
        }
      }
      getTargetData();
      setConfirmData([]);
      setSuccessTranslatedKey([]);
      setIsLoading(false);
    }
  }, [selectedKey, dataResource, selectedLanguage]);

  useEffect(() => {
    setImageHasNextPage(productAltTextData[0]?.imageHasNextPage);
    setImageHasPreviousPage(productAltTextData[0]?.imageHasPreviousPage);
    setImageStartCursor(productAltTextData[0]?.imageStartCursor);
    setImageEndCursor(productAltTextData[0]?.imageEndCursor);
  }, [productAltTextData]);

  useEffect(() => {
    if (languageTableData) {
      setLanguageOptions(
        languageTableData
          .filter((item: any) => !item.primary)
          .map((item: any) => ({
            label: item.name,
            value: item.locale,
          })),
      );
    }
  }, [languageTableData]);

  useEffect(() => {
    if (confirmData.length > 0) {
      shopify.saveBar.show("save-bar");
    } else {
      shopify.saveBar.hide("save-bar");
    }
  }, [confirmData]);

  const columns = [
    {
      title: t("Resource"),
      key: "productTitle",
      width: "10%",
      render: (_: any, record: any) => {
        return (
          <Image
            src={record?.imageUrl}
            preview={false}
            width={"100%"}
            height={"auto"}
          />
        );
      },
    },
    {
      title: t("Default Language"),
      key: "altText",
      width: "40%",
      render: (_: any, record: any) => {
        return <Input disabled value={record?.altText} />;
      },
    },
    {
      title: t("Translated"),
      key: "targetAltText",
      width: "40%",
      render: (_: any, record: any) => {
        return (
          <Input
            className={
              successTranslatedKey?.includes(record?.key)
                ? styles.success_input
                : ""
            }
            value={
              confirmData.find((item: any) => item.key === record?.imageId)
                ? confirmData.find((item: any) => item.key === record?.imageId)
                    ?.value
                : record?.targetAltText
            }
            onChange={(e) => handleInputChange(record, e.target.value)}
          />
        );
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: any) => {
        return (
          <Button
            onClick={() => {
              handleTranslate(
                "PRODUCT_OPTION_VALUE",
                record,
                handleInputChange,
              );
              reportClick("editor_list_translate");
            }}
            loading={loadingItems.includes(record?.key || "")}
          >
            {t("Translate")}
          </Button>
        );
      },
    },
  ];

  const handleInputChange = (record: any, value: string) => {
    setConfirmData((prevData: any) => {
      const existingItemIndex = prevData.findIndex(
        (item: any) => item.key === record?.imageId,
      );
      if (existingItemIndex !== -1) {
        const updatedConfirmData = [...prevData];
        updatedConfirmData[existingItemIndex] = {
          ...updatedConfirmData[existingItemIndex],
          value: value,
        };
        return updatedConfirmData;
      } else {
        return [
          ...prevData,
          {
            key: record?.imageId,
            productId: record?.productId,
            imageUrl: record?.imageUrl,
            altText: record?.altText,
            value,
          },
        ];
      }
    });
  };

  const handleTranslate = async (
    resourceType: string,
    record: any,
    handleInputChange: (record: any, value: string) => void,
  ) => {
    if (!record?.key || !record?.altText) {
      shopify.toast.show(
        t("The source text is empty and cannot be translated"),
      );
      return;
    }
    fetcher.submit(
      {
        log: `${globalStore?.shop} 从翻译管理-产品图片Alt页面点击单行翻译`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );

    setLoadingItems((prev) => [...prev, record?.key]);

    const data = await SingleTextTranslate({
      shopName: globalStore?.shop || "",
      source: globalStore?.source || "",
      target: searchTerm || "",
      resourceType: resourceType,
      context: record?.altText,
      key: record?.key,
      type: "SINGLE_LINE_TEXT_FIELD",
      server: globalStore?.server || "",
    });
    if (data?.success) {
      if (loadingItemsRef.current.includes(record?.key)) {
        handleInputChange(record, data.response);
        setSuccessTranslatedKey((prev) => [...prev, record?.key]);
        shopify.toast.show(t("Translated successfully"));
        fetcher.submit(
          {
            log: `${globalStore?.shop} 从翻译管理-产品图片Alt页面点击单行翻译返回结果 ${data?.response}`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      }
    } else {
      shopify.toast.show(data.errorMsg);
    }
    setLoadingItems((prev) => prev.filter((item) => item !== record?.key));
  };

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setSelectedKey(key);
    }
  };

  const handleLanguageChange = (language: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setIsLoading(true);
      isManualChangeRef.current = true;
      setSelectedLanguage(language);
      navigate(`/app/manage_translation/productImageAlt?language=${language}`);
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

  const handleProductPrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      productsFetcher.submit(
        {
          productStartCursor: JSON.stringify({
            productsStartCursor,
          }),
        },
        {
          method: "post",
        },
      ); // 提交表单请求
    }
  };

  const handleProductNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            productsEndCursor,
          }),
        },
        {
          method: "post",
        },
      ); // 提交表单请求
    }
  };

  const handleImagePrevious = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      imageFetcher.submit(
        {
          imageStartCursor: JSON.stringify({
            imageStartCursor,
            productId: selectedKey,
          }),
        },
        {
          method: "post",
        },
      );
    }
  };

  const handleImageNext = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      imageFetcher.submit(
        {
          imageEndCursor: JSON.stringify({
            imageEndCursor,
            productId: selectedKey,
          }),
        },
        {
          method: "post",
        },
      );
    }
  };

  const handleConfirm = async () => {
    setSaveLoading(true);
    const promises = confirmData.map((item: any) =>
      UpdateProductImageAltData({
        server: globalStore?.server || "",
        shopName: globalStore?.shop || "",
        productId: item.productId,
        imageUrl: item.imageUrl,
        altText: item.altText,
        targetAltText: item.value,
        languageCode: selectedLanguage,
      }),
    );

    // 并发执行所有请求
    try {
      let successCount = 0;
      const results = await Promise.all(promises);
      // 这里可以根据 results 做成功/失败的提示
      results.forEach((result) => {
        if (result.success) {
          successCount++;
        }
      });
      if (successCount === confirmData.length) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
    } catch (error) {
      shopify.saveBar.hide("save-bar");
      shopify.toast.show(t("Some items saved failed"));
    } finally {
      setProductAltTextData(
        productAltTextData.map((item: any) => {
          return {
            ...item,
            targetAltText: confirmData.find(
              (confirmItem: any) => item.key === confirmItem.key,
            )?.value,
          };
        }),
      );
      setConfirmData([]);
      setSuccessTranslatedKey([]);
      shopify.saveBar.hide("save-bar");
      setSaveLoading(false);
    }
  };

  const handleDiscard = () => {
    setConfirmData([]);
    setSuccessTranslatedKey([]);
    shopify.saveBar.hide("save-bar");
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
      title={t("Product image alt text")}
      fullWidth={true}
      backAction={{
        onAction: onCancel,
      }}
    >
      <SaveBar id="save-bar">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={saveLoading ? "true" : undefined}
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
        ) : (
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
                  <SideMenu
                    items={menuData}
                    selectedKeys={selectedKey}
                    onClick={handleMenuChange}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {(productsHasPreviousPage || productsHasNextPage) && (
                      <Pagination
                        hasPrevious={productsHasPreviousPage}
                        onPrevious={handleProductPrevious}
                        hasNext={productsHasNextPage}
                        onNext={handleProductNext}
                      />
                    )}
                  </div>
                </div>
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
                        menuData!.find((item: any) => item.key === selectedKey)
                          ?.label
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
                      {productAltTextData.map(
                        (productAltTextItem: any, index: number) => {
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
                                {productAltTextItem.productTitle}
                              </Text>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                <Text>{t("Default Language")}</Text>
                                <Input
                                  disabled
                                  value={productAltTextItem.altText}
                                />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                <Text>{t("Translated")}</Text>
                                <Input
                                  className={
                                    successTranslatedKey?.includes(
                                      productAltTextItem?.imageId,
                                    )
                                      ? styles.success_input
                                      : ""
                                  }
                                  value={
                                    confirmData.find(
                                      (confirmItem: any) =>
                                        confirmItem.key ===
                                        productAltTextItem?.imageId,
                                    )
                                      ? confirmData.find(
                                          (confirmItem: any) =>
                                            confirmItem.key ===
                                            productAltTextItem?.imageId,
                                        )?.value
                                      : productAltTextItem.targetAltText
                                  }
                                  onChange={(e) =>
                                    handleInputChange(
                                      productAltTextItem,
                                      e.target.value,
                                    )
                                  }
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
                                      "PRODUCT_OPTION_VALUE",
                                      productAltTextItem,
                                      handleInputChange,
                                    );
                                    reportClick("editor_list_translate");
                                  }}
                                  loading={loadingItems.includes(
                                    productAltTextItem?.key || "",
                                  )}
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
                        },
                      )}
                    </Space>
                  </Card>
                  <SideMenu
                    items={menuData}
                    selectedKeys={selectedKey}
                    onClick={handleMenuChange}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {(productsHasPreviousPage || productsHasNextPage) && (
                      <Pagination
                        hasPrevious={productsHasPreviousPage}
                        onPrevious={handleProductPrevious}
                        hasNext={productsHasNextPage}
                        onNext={handleProductNext}
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
                        menuData!.find((item: any) => item.key === selectedKey)
                          ?.label
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
                    columns={columns}
                    dataSource={productAltTextData}
                    pagination={false}
                    loading={tableDataLoading}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {(imageHasPreviousPage || imageHasNextPage) && (
                      <Pagination
                        hasPrevious={imageHasPreviousPage}
                        onPrevious={handleImagePrevious}
                        hasNext={imageHasNextPage}
                        onNext={handleImageNext}
                      />
                    )}
                  </div>
                </Space>
              )}
            </Content>
          </>
        )}
      </Layout>
    </Page>
  );
};

export default Index;
