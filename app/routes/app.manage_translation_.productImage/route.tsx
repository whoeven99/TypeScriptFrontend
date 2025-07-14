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
  Skeleton,
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
import { Page, Pagination, Select } from "@shopify/polaris";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { authenticate } from "~/shopify.server";
import { ShopLocalesType } from "../app.language/route";
import { setUserConfig } from "~/store/modules/userConfig";
import { setTableData } from "~/store/modules/languageTableData";
import { DeleteProductImageData, GetProductImageData } from "~/api/JavaServer";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  console.log(`${shop} load manage_translation_productImage`);

  return {
    shop: shop,
    server: process.env.SERVER_URL,
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
  const { searchTerm, shop, server } = useLoaderData<typeof loader>();

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const languageTableData = useSelector(
    (state: any) => state.languageTableData.rows,
  );
  const navigate = useNavigate();
  const isManualChange = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [tableDataLoading, setTableDataLoading] = useState(true);
  const [menuData, setMenuData] = useState<any>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [dataResource, setDataResource] = useState<any>([]);
  const [productImageData, setProductImageData] = useState<
    {
      key: string;
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
      key: "",
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
    { label: t("Product images"), value: "productImage" },
    { label: t("Product image alt text"), value: "productImageAlt" },
    { label: t("Delivery"), value: "delivery" },
    { label: t("Shipping"), value: "shipping" },
  ];

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
      const data =
        dataResource.filter(
          (item: any) => item[0]?.productId === selectedKey,
        )[0] || [];
      async function getTargetData() {
        const targetData = await GetProductImageData({
          server: server || "",
          shopName: shop,
          productId: selectedKey,
          languageCode: selectedLanguage,
        });

        setProductImageData(
          data.map((item: any) => {
            const index = targetData.response.findIndex(
              (image: any) => item.imageUrl === image.imageBeforeUrl,
            );
            if (index !== -1) {
              return {
                ...item,
                targetImageUrl: targetData.response[index].imageAfterUrl,
              };
            }
            return item;
          }),
        );
      }
      getTargetData();
      setIsLoading(false);
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

  const columns = [
    {
      title: t("Products"),
      key: "productTitle",
      width: "10%",
      render: (_: any, record: any) => {
        return (
          <div>
            {record?.imageUrl.split("/files/")[2] || record?.productTitle}
          </div>
        );
      },
    },
    {
      title: t("Default image"),
      key: "imageUrl",
      width: "40%",
      render: (_: any, record: any) => {
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
      title: t("Translated image"),
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
            action={`${server}/picture/insertPictureToDbAndCloud`}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith("image/");
              const isLt20M = file.size / 1024 / 1024 < 20;

              // 检查文件格式
              const supportedFormats = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/heic",
                "image/gif",
              ];
              const isSupportedFormat = supportedFormats.includes(file.type);

              if (!isImage) {
                shopify.toast.show(t("Only images can be uploaded"));
                return false;
              }

              if (!isSupportedFormat) {
                shopify.toast.show(
                  t("Only JPEG, PNG, WEBP, HEIC and GIF formats are supported"),
                );
                return false;
              }

              if (!isLt20M) {
                shopify.toast.show(t("File must be less than 20MB"));
                return false;
              }

              // 检查图片像素大小
              return new Promise((resolve) => {
                const img = new window.Image();
                img.onload = () => {
                  const pixelCount = img.width * img.height;
                  const maxPixels = 20000000; // 2000万像素

                  if (pixelCount > maxPixels) {
                    shopify.toast.show(
                      t("Image pixel size cannot exceed 20 million pixels"),
                    );
                    resolve(false);
                  } else {
                    resolve(true);
                  }
                };
                img.onerror = () => {
                  shopify.toast.show(t("Failed to read image dimensions"));
                  resolve(false);
                };
                img.src = URL.createObjectURL(file);
              });
            }}
            data={(file) => {
              return {
                shopName: shop,
                file: file,
                userPicturesDoJson: JSON.stringify({
                  shopName: shop,
                  imageId: record?.productId,
                  imageBeforeUrl: record?.imageUrl,
                  altBeforeTranslation: "",
                  altAfterTranslation: "",
                  languageCode: selectedLanguage,
                }),
              };
            }}
            onChange={(info) => {
              if (info.file.status !== "uploading") {
              }
              if (info.file.status === "done") {
                setProductImageData(
                  productImageData.map((item: any) => {
                    if (
                      item.imageUrl ===
                      info.fileList[0].response.response?.imageBeforeUrl
                    ) {
                      return {
                        ...item,
                        targetImageUrl:
                          info.fileList[0].response.response.imageAfterUrl,
                      };
                    }
                    return item;
                  }),
                );
                if (info.fileList[0].response?.success) {
                  shopify.toast.show(
                    `${info.file.name} ${t("Upload Success")}`,
                  );
                } else {
                  shopify.toast.show(`${info.file.name} ${t("Upload Failed")}`);
                }
              } else if (info.file.status === "error") {
                shopify.toast.show(`${info.file.name} ${t("Upload Failed")}`);
              }
            }}
          >
            <Button icon={<UploadOutlined />}>{t("Click to Upload")}</Button>
          </Upload>
        );
      },
    },
    {
      title: t("Action"),
      key: "translate",
      width: "10%",
      render: (_: any, record: any) => {
        return (
          // <Space>
          //   <Button>{t("Translate")}</Button>
          <Button
            disabled={!record?.targetImageUrl}
            loading={isDeleteLoading}
            onClick={() => handleDelete(record?.productId, record?.imageUrl)}
          >
            {t("Delete")}
          </Button>
          // </Space>
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
    setIsLoading(true);
    isManualChange.current = true;
    setSelectedLanguage(language);
    navigate(`/app/manage_translation/productImage?language=${language}`);
  };

  const handleItemChange = (item: string) => {
    setIsLoading(true);
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

  const handleDelete = async (productId: string, imageUrl: string) => {
    setIsDeleteLoading(true);
    const res = await DeleteProductImageData({
      server: server || "",
      shopName: shop,
      productId: productId,
      imageUrl: imageUrl,
      languageCode: selectedLanguage,
    });

    console.log("res", res);

    if (res.success) {
      setDataResource(
        dataResource.map((item: any) => {
          return item.map((image: any) => {
            if (image.imageId === productId) {
              image.targetImageUrl = "";
            }
            return image;
          });
        }),
      );
      shopify.toast.show(t("Delete Success"));
    } else {
      shopify.toast.show(t("Delete Failed"));
    }
    setIsDeleteLoading(false);
  };

  const onCancel = () => {
    navigate(`/app/manage_translation?language=${searchTerm}`, {
      state: { key: searchTerm },
    }); // 跳转到 /app/manage_translation
  };

  return (
    <Page
      title={t("Product images")}
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
      {/* <SaveBar id="save-bar">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={confirmFetcher.state === "submitting" && ""}
        >
          {t("Save")}
        </button>
        <button onClick={handleDiscard}>{t("Cancel")}</button>
      </SaveBar> */}
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
                {/* <ItemsScroll
                selectItem={selectProductKey}
                menuData={menuData}
                setSelectItem={setSelectProductKey}
              /> */}
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
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                      backgroundColor: "var(--p-color-bg)",
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
                                width={"50%"}
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
                              {item.targetImageUrl ? (
                                <Image
                                  src={item.targetImageUrl}
                                  preview={false}
                                  width={"50%"}
                                />
                              ) : (
                                <Upload
                                  pastable={false}
                                  maxCount={1}
                                  accept="image/*"
                                  name="file"
                                  action={`${server}/picture/insertPictureToDbAndCloud`}
                                  beforeUpload={(file) => {
                                    const isImage =
                                      file.type.startsWith("image/");
                                    const isLt20M =
                                      file.size / 1024 / 1024 < 20;

                                    // 检查文件格式
                                    const supportedFormats = [
                                      "image/jpeg",
                                      "image/png",
                                      "image/webp",
                                      "image/heic",
                                      "image/gif",
                                    ];
                                    const isSupportedFormat =
                                      supportedFormats.includes(file.type);

                                    if (!isImage) {
                                      shopify.toast.show(
                                        t("Only images can be uploaded"),
                                      );
                                      return false;
                                    }

                                    if (!isSupportedFormat) {
                                      shopify.toast.show(
                                        t(
                                          "Only JPEG, PNG, WEBP, HEIC and GIF formats are supported",
                                        ),
                                      );
                                      return false;
                                    }

                                    if (!isLt20M) {
                                      shopify.toast.show(
                                        t("File must be less than 20MB"),
                                      );
                                      return false;
                                    }

                                    // 检查图片像素大小
                                    return new Promise((resolve) => {
                                      const img = new window.Image();
                                      img.onload = () => {
                                        const pixelCount =
                                          img.width * img.height;
                                        const maxPixels = 20000000; // 2000万像素

                                        if (pixelCount > maxPixels) {
                                          shopify.toast.show(
                                            t(
                                              "Image pixel size cannot exceed 20 million pixels",
                                            ),
                                          );
                                          resolve(false);
                                        } else {
                                          resolve(true);
                                        }
                                      };
                                      img.onerror = () => {
                                        shopify.toast.show(
                                          t("Failed to read image dimensions"),
                                        );
                                        resolve(false);
                                      };
                                      img.src = URL.createObjectURL(file);
                                    });
                                  }}
                                  data={(file) => {
                                    return {
                                      shopName: shop,
                                      file: file,
                                      userPicturesDoJson: JSON.stringify({
                                        shopName: shop,
                                        imageId: item?.productId,
                                        imageBeforeUrl: item?.imageUrl,
                                        altBeforeTranslation: "",
                                        altAfterTranslation: "",
                                        languageCode: selectedLanguage,
                                      }),
                                    };
                                  }}
                                  onChange={(info) => {
                                    console.log("info", info);

                                    if (info.file.status !== "uploading") {
                                    }
                                    if (info.file.status === "done") {
                                      setProductImageData(
                                        productImageData.map((item: any) => {
                                          if (
                                            item.imageUrl ===
                                            info.fileList[0].response.response
                                              ?.imageBeforeUrl
                                          ) {
                                            return {
                                              ...item,
                                              targetImageUrl:
                                                info.fileList[0].response
                                                  .response.imageAfterUrl,
                                            };
                                          }
                                          return item;
                                        }),
                                      );
                                      if (info.fileList[0].response?.success) {
                                        shopify.toast.show(
                                          `${info.file.name} ${t("Upload Success")}`,
                                        );
                                      } else {
                                        shopify.toast.show(
                                          `${info.file.name} ${t("Upload Failed")}`,
                                        );
                                      }
                                    } else if (info.file.status === "error") {
                                      shopify.toast.show(
                                        `${info.file.name} ${t("Upload Failed")}`,
                                      );
                                    }
                                  }}
                                >
                                  <Button icon={<UploadOutlined />}>
                                    {t("Click to Upload")}
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
                              <Button
                                disabled={!item.targetImageUrl}
                                loading={isDeleteLoading}
                                onClick={() =>
                                  handleDelete(item?.productId, item?.imageUrl)
                                }
                              >
                                {t("Delete")}
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
    </Page>
  );
};

export default Index;
