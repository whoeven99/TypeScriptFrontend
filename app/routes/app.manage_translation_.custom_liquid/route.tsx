import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { SaveBar } from "@shopify/app-bridge-react";
import { Page, Select } from "@shopify/polaris";
import {
  Button,
  Card,
  Divider,
  Layout,
  Result,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import ManageTableInput from "~/components/manageTableInput";
import SideMenu from "~/components/sideMenu/sideMenu";
import { authenticate } from "~/shopify.server";

const { Sider, Content } = Layout;

const { Text, Title } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return {
    searchTerm,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const menuData: any = JSON.parse(formData.get("menuData") as string);
  const contentData: any = JSON.parse(formData.get("contentData") as string);

  switch (true) {
    case !!menuData:
      try {
        const response = await admin.graphql(
          `#graphql
                query themeJson{     
                  themes(first: 1 ,roles: MAIN) {
                      nodes {
                          files(first: 2500) {
                              nodes {
                                  filename
                                  updatedAt
                                  createdAt
                                  contentType
                              }
                              pageInfo {
                                  endCursor
                                  hasNextPage
                                  hasPreviousPage
                                  startCursor
                              }
                          }
                      }
                  }
              }`,
        );

        const data = await response.json();

        const res = data.data?.themes?.nodes[0]?.files?.nodes;

        console.log("themeJson: ", res);

        if (Array.isArray(res)) {
          const themeJsonData = res.filter(
            (item) =>
              item.contentType == "application/json" &&
              item.filename.includes("templates") &&
              !item.filename.includes("customers"),
          );

          console.log("themeJsonData: ", themeJsonData);

          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: themeJsonData,
          };
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      } catch (error) {
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }

    case !!contentData:
      try {
        const response = await admin.graphql(
          `#graphql
            query themeJsonByFilename ($filename: [String!]){     
                themes(first: 1 ,roles: MAIN) {
                    nodes {
                        files(first: 1, filenames: $filename) {
                            nodes {
                                body {
                                    ... on OnlineStoreThemeFileBodyText {
                                    __typename
                                    content
                                    }
                                }
                                filename
                            }
                        }
                    }
                }
            }`,
          {
            variables: {
              filename: contentData.filename ? contentData.filename : undefined,
            },
          },
        );

        const data = await response.json();

        const res = data.data?.themes?.nodes[0]?.files?.nodes;

        console.log("themeJson: ", res);

        if (Array.isArray(res)) {
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: res[0]?.body,
          };
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
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
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { searchTerm } = useLoaderData<typeof loader>();

  const dataFetcher = useFetcher<any>();
  const contentFetcher = useFetcher<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [menuData, setMenuData] = useState<
    {
      label: string;
      key: string;
    }[]
  >([]);
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>("");
  const [confirmData, setConfirmData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);

  useEffect(() => {
    dataFetcher.submit({ menuData: JSON.stringify({}) }, { method: "POST" });
  }, []);

  useEffect(() => {
    if (dataFetcher.data) {
      if (dataFetcher.data?.success) {
        const data = dataFetcher.data?.response?.map((item: any) => {
          const label = item?.filename
            .split("/")
            .reverse()[0]
            ?.replace(/\.json$/, "");
          return {
            label,
            key: item?.filename,
          };
        });
        if (Array.isArray(data)) {
          setMenuData(data);
          setSelectedMenuKey(data[0]?.key);
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
          contentFetcher.submit(
            { contentData: JSON.stringify({ filename: data[0]?.key }) },
            { method: "POST" },
          );
        }
      }
    }
  }, [dataFetcher.data]);

  useEffect(() => {
    if (contentFetcher.data) {
      if (contentFetcher.data?.success) {
        console.log(contentFetcher.data?.response);
        const JsonData = contentFetcher.data?.response?.content;
        const jsonString = JsonData.replace(/\/\*[\s\S]*?\*\//g, "").trim();
        const sections = JSON.parse(jsonString)?.sections;
        if (sections) {
          console.log(sections);

          const matches = Object.entries(sections)
            .filter(([key]) => key.startsWith("custom_liquid"))
            .map(([key, value]) => ({ key, value }));

          console.log(matches);
          const tableData = matches.map((item: any) => {
            return {
              key: item.key,
              resource: "Liquid Code",
              default_language: item.value.settings.custom_liquid,
              translated: "",
              type: "",
            };
          });
          setResourceData(tableData);
        }
      }
    }
  }, [contentFetcher.data]);

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
      render: (_: any, record: any) => {
        return <ManageTableInput record={record} />;
      },
    },
    {
      title: t("Translated"),
      dataIndex: "translated",
      key: "translated",
      width: "40%",
      render: (_: any, record: any) => {
        return (
          <ManageTableInput
            record={record}
            // isSuccess={successTranslatedKey?.includes(record?.key as string)}
            // translatedValues={translatedValues}
            // setTranslatedValues={setTranslatedValues}
            // handleInputChange={handleInputChange}
            isRtl={searchTerm === "ar"}
          />
        );
      },
    },
    {
      title: t("Translate"),
      width: "10%",
      render: (_: any, record: any) => {
        return <Button>{t("Translate")}</Button>;
      },
    },
  ];

  const handleMenuChange = (key: string) => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      setSelectedMenuKey(key);
      contentFetcher.submit(
        { contentData: JSON.stringify({ filename: key }) },
        { method: "POST" },
      );
    }
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
      title={t("Collections")}
      fullWidth={true}
      backAction={{
        onAction: onCancel,
      }}
    >
      <SaveBar id="save-bar">
        <button
          variant="primary"
          //   onClick={handleConfirm}
          //   loading={confirmFetcher.state === "submitting" ? "true" : undefined}
        >
          {t("Save")}
        </button>
        <button
        // onClick={handleDiscard}
        >
          {t("Cancel")}
        </button>
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
        ) : menuData.length ? (
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
                    selectedKeys={selectedMenuKey}
                    onClick={handleMenuChange}
                  />
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
                        menuData!.find(
                          (item: any) => item.key === selectedMenuKey,
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
                          //   options={languageOptions}
                          //   value={selectedLanguage}
                          //   onChange={(value) => handleLanguageChange(value)}
                        />
                      </div>
                      <div
                        style={{
                          width: "100px",
                        }}
                      >
                        <Select
                          label={""}
                          //   options={itemOptions}
                          //   value={selectedItem}
                          //   onChange={(value) => handleItemChange(value)}
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
                                // isSuccess={successTranslatedKey?.includes(
                                //   item?.key as string,
                                // )}
                                // translatedValues={translatedValues}
                                // setTranslatedValues={setTranslatedValues}
                                // handleInputChange={handleInputChange}
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
                              // onClick={() => {
                              //   handleTranslate(
                              //     "COLLECTION",
                              //     item?.key || "",
                              //     item?.type || "",
                              //     item?.default_language || "",
                              //   );
                              // }}
                              // loading={loadingItems.includes(item?.key || "")}
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
                    selectedKeys={selectedMenuKey}
                    onClick={handleMenuChange}
                  />
                  {/* <div style={{ display: "flex", justifyContent: "center" }}>
                    {(hasNext || hasPrevious) && (
                      <Pagination
                        hasPrevious={hasPrevious}
                        onPrevious={onPrevious}
                        hasNext={hasNext}
                        onNext={onNext}
                      />
                    )}
                  </div> */}
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
                          (item: any) => item.key === selectedMenuKey,
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
                          //   options={languageOptions}
                          //   value={selectedLanguage}
                          //   onChange={(value) => handleLanguageChange(value)}
                        />
                      </div>
                      <div
                        style={{
                          width: "150px",
                        }}
                      >
                        <Select
                          label={""}
                          //   options={itemOptions}
                          //   value={selectedItem}
                          //   onChange={(value) => handleItemChange(value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Table
                    columns={resourceColumns}
                    dataSource={resourceData}
                    loading={contentFetcher.state === "submitting"}
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
    </Page>
  );
};

export default Index;
