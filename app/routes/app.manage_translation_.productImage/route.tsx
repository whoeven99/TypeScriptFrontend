import {
  Button,
  Image,
  Layout,
  message,
  Result,
  Space,
  Spin,
  Table,
  theme,
  Upload,
  Typography,
  Menu,
  Card,
  Divider,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import { Modal, SaveBar, TitleBar } from "@shopify/app-bridge-react";
import { Pagination, Select } from "@shopify/polaris";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { authenticate } from "~/shopify.server";
import { ShopLocalesType } from "../app.language/route";
import { setUserConfig } from "~/store/modules/userConfig";
import { setTableData } from "~/store/modules/languageTableData";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return {
    searchTerm,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  console.log(`${shop} load manage_translation_productImage`);

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
            products(first: 20) {
              edges {
                node {
                  id
                  title
                  images(first: 20) {
                    edges {
                      node {
                        id
                        url 
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
                imageId: image?.node?.id,
                imageUrl: image?.node?.url,
                targetImageUrl: "",
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
            products(last: 20, before: "${productStartCursor?.productsStartCursor}") {
              edges {
                node {
                  id
                  title
                  images(first: 20) {
                    edges {
                      node {
                        id
                        url 
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
                imageId: image?.node?.id,
                imageUrl: image?.node?.url,
                targetImageUrl: "",
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
            products(first: 20, after: "${productEndCursor?.productsEndCursor}") {
              edges {
                node {
                  id
                  title
                  images(first: 20) {
                    edges {
                      node {
                        id
                        url 
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
                imageId: image?.node?.id,
                imageUrl: image?.node?.url,
                targetImageUrl: "",
                imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                imageHasPreviousPage:
                  item?.node?.images?.pageInfo?.hasPreviousPage,
              };
            });
          });
          console.log("data:", response?.data?.products);

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
        console.error("Error action productEndCursor productImage:", error);
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
                productId: item?.node?.id,
                productTitle: item?.node?.title,
                imageId: item?.node?.id,
                imageUrl: item?.node?.url,
                targetImageUrl: "",
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

        console.log("imageEndCursor", response?.data?.product?.images);
        if (response?.data?.product?.images?.edges.length > 0) {
          const imageData = response?.data?.product?.images?.edges.map(
            (item: any) => {
              return {
                key: item?.node?.id,
                productId: item?.node?.id,
                productTitle: item?.node?.title,
                imageId: item?.node?.id,
                imageUrl: item?.node?.url,
                targetImageUrl: "",
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
  }
  return null;
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { searchTerm } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );
  const navigate = useNavigate();
  const isManualChange = useRef(true);

  const [isVisible, setIsVisible] = useState(() => {
    return !!searchParams.get("language");
  });
  const [tableDataLoading, setTableDataLoading] = useState(true);
  const [menuData, setMenuData] = useState<any>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [dataResource, setDataResource] = useState<any>([]);
  const [productImageData, setProductImageData] = useState<
    {
      productTitle: string;
      imageUrl: string;
      targetImageUrl: string;
      imageHasNextPage: boolean;
      imageHasPreviousPage: boolean;
      imageStartCursor: string;
      imageEndCursor: string;
    }[]
  >([
    {
      productTitle: "",
      imageUrl: "",
      targetImageUrl: "",
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
  const [imageHasNextPage, setImageHasNextPage] = useState(false);
  const [imageHasPreviousPage, setImageHasPreviousPage] = useState(false);
  const [imageStartCursor, setImageStartCursor] = useState("");
  const [imageEndCursor, setImageEndCursor] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchTerm || "",
  );
  const [selectedItem, setSelectedItem] = useState<string>("productImage");
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >([]);
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
    { label: t("Product image"), value: "productImage" },
    { label: t("Product image alt"), value: "productImageAlt" },
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ];

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const loadFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();

  useEffect(() => {
    loadFetcher.submit({ loading: true }, { method: "post" });
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
    }
  }, [loadFetcher.data]);

  useEffect(() => {
    if (productsFetcher.data) {
      console.log("productsFetcher.data", productsFetcher.data);
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
      setProductImageData(imageFetcher.data.imageData);
    }
  }, [imageFetcher.data]);

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
    if (selectedKey && dataResource.length > 0) {
      setProductImageData(
        dataResource.filter(
          (item: any) => item[0]?.productId === selectedKey,
        )[0] || [],
      );
    }
  }, [selectedKey, dataResource]);

  useEffect(() => {
    setImageHasNextPage(productImageData[0]?.imageHasNextPage);
    setImageHasPreviousPage(productImageData[0]?.imageHasPreviousPage);
    setImageStartCursor(productImageData[0]?.imageStartCursor);
    setImageEndCursor(productImageData[0]?.imageEndCursor);
  }, [productImageData]);

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
    setIsVisible(!!searchParams.get("language"));
  }, [location]);

  const columns = [
    {
      title: t("Resource"),
      dataIndex: "productTitle",
      key: "productTitle",
      width: "10%",
    },
    {
      title: t("Default Language"),
      key: "imageUrl",
      width: "40%",
      render: (_: any, record: any) => {
        console.log("record", record?.imageUrl);
        return (
          <Image
            src={record?.imageUrl}
            preview={false}
            width={"50%"}
            height={"auto"}
          />
        );
      },
    },
    {
      title: t("Translated"),
      key: "targetImageUrl",
      width: "40%",
      render: (_: any, record: any) => {
        return record?.targetImageUrl ? (
          <Image
            src={record?.targetImageUrl}
            preview={false}
            width={"50%"}
            height={"auto"}
          />
        ) : (
          <Upload
            pastable={false}
            maxCount={1}
            accept="image/*"
            name="file"
            action="https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload"
            headers={{
              authorization: "authorization-text",
            }}
            onChange={(info) => {
              if (info.file.status !== "uploading") {
                console.log(info.file, info.fileList);
              }
              if (info.file.status === "done") {
                message.success(`${info.file.name} file uploaded successfully`);
              } else if (info.file.status === "error") {
                message.error(`${info.file.name} file upload failed.`);
              }
            }}
          >
            <Button icon={<UploadOutlined />}>Click to Upload</Button>
          </Upload>
        );
      },
    },
    {
      title: t("Translate"),
      key: "translate",
      width: "10%",
      render: (_: any, record: any) => {
        return (
          <Space>
            <Button>{t("Translate")}</Button>
            <Button disabled={!record?.targetImageUrl}>{t("Delete")}</Button>
          </Space>
        );
      },
    },
  ];

  const handleMenuChange = (key: string) => {
    // if (confirmData.length > 0) {
    // shopify.saveBar.leaveConfirmation();
    // } else {
    setSelectedKey(key);
    // }
  };

  const handleLanguageChange = (language: string) => {
    isManualChange.current = true;
    setSelectedLanguage(language);
    navigate(`/app/manage_translation/product?language=${language}`);
  };

  const handleItemChange = (item: string) => {
    isManualChange.current = true;
    setSelectedItem(item);
    navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
  };

  const handleProductPrevious = () => {
    // if (confirmData.length > 0) {
    //   shopify.saveBar.leaveConfirmation();
    // } else {
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
    // }
  };

  const handleProductNext = () => {
    // if (confirmData.length > 0) {
    //   shopify.saveBar.leaveConfirmation();
    // } else {
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
  };

  const handleImagePrevious = () => {
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
  };

  const handleImageNext = () => {
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
  };

  const onCancel = () => {
    setIsVisible(false);
    shopify.saveBar.hide("product-image-confirm-save");
    navigate(`/app/manage_translation?language=${searchTerm}`, {
      state: { key: searchTerm },
    }); // 跳转到 /app/manage_translation
  };

  return (
    <>
      <SaveBar id="product-image-confirm-save">
        {/* <button
          variant="primary"
          onClick={handleConfirm}
          loading={confirmLoading && ""}
        >
        </button>
        <button
          onClick={handleDiscard}
        >
        </button> */}
      </SaveBar>
      <Modal variant="max" open={isVisible} onHide={onCancel}>
        <TitleBar title={t("Article")}></TitleBar>
        <Layout
          style={{
            padding: "24px 0",
            height: "calc(100vh - 64px)",
            overflow: "auto",
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {loadFetcher.state === "submitting" ? (
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
                    background: colorBgContainer,
                    height: "calc(100vh - 124px)",
                    width: "200px",
                    minHeight: "70vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "auto",
                  }}
                >
                  {/* <ItemsScroll
                selectItem={selectProductKey}
                menuData={menuData}
                setSelectItem={setSelectProductKey}
              /> */}
                  <Menu
                    mode="inline"
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                      marginBottom: "10px",
                    }}
                    items={menuData}
                    selectedKeys={[selectedKey]}
                    onClick={(e: any) => handleMenuChange(e.key)}
                  />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Pagination
                      hasPrevious={productsHasPreviousPage}
                      onPrevious={handleProductPrevious}
                      hasNext={productsHasNextPage}
                      onNext={handleProductNext}
                    />
                  </div>
                </Sider>
              )}
              <Content
                style={{
                  padding: "0 24px",
                  height: "calc(100vh - 112px)", // 64px为FullscreenBar高度
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
                            (item: any) => item.key === selectedKey,
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
                        {productImageData.map((item: any, index: number) => {
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
                                {item.productTitle}
                              </Text>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                <Text>{t("Default Language")}</Text>
                                <Image
                                  src={item.imageUrl}
                                  preview={false}
                                  width={100}
                                  height={100}
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
                                {item.translatedImageUrl ? (
                                  <Image
                                    src={item.translatedImageUrl}
                                    preview={false}
                                    width={100}
                                    height={100}
                                  />
                                ) : (
                                  <Upload
                                    name="file"
                                    headers={{
                                      authorization: "authorization-text",
                                    }}
                                  >
                                    <Button icon={<UploadOutlined />}>
                                      Click to Upload
                                    </Button>
                                  </Upload>
                                )}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <Button>{t("Translate")}</Button>
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
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        minHeight: 0,
                      }}
                      items={menuData}
                      selectedKeys={[selectedKey]}
                      onClick={(e: any) => handleMenuChange(e.key)}
                    />
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Pagination
                        hasPrevious={productsHasPreviousPage}
                        onPrevious={handleProductPrevious}
                        hasNext={productsHasNextPage}
                        onNext={handleProductNext}
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
                            (item: any) => item.key === selectedKey,
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
                      columns={columns}
                      dataSource={productImageData}
                      pagination={false}
                      loading={tableDataLoading}
                    />
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Pagination
                        hasPrevious={imageHasPreviousPage}
                        onPrevious={handleImagePrevious}
                        hasNext={imageHasNextPage}
                        onNext={handleImageNext}
                      />
                    </div>
                  </Space>
                )}
              </Content>
            </>
          )}
          {/* {dataResource.length > 0 && ( */}
          {/* )} */}
          {/* {dataResource.length === 0 && !isLoading && (
            <Result
              title={t("The specified fields were not found in the store.")}
              extra={
                <Button type="primary" onClick={onCancel}>
                  {t("Yes")}
                </Button>
              }
              />
            )} */}
        </Layout>
      </Modal>
    </>
  );
};

export default Index;
