import { Page } from "@shopify/polaris";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Pagination,
  Popover,
  Skeleton,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { globalStore } from "~/globalStore";
import {
  SyncUserIp,
  GetCurrencyByShopName,
  UpdateUserIpStatus,
} from "~/api/JavaServer";
import UpdateCustomRedirectsModal from "./components/updateCustomRedirectsModal";
import { useDispatch, useSelector } from "react-redux";
import { LanguagesDataType } from "../app.language/route";
import { CurrencyDataType } from "../app.currency/route";
import { authenticate } from "~/shopify.server";
import { queryMarketDomainData } from "~/api/admin";
import languageLocaleData from "~/utils/language-locale-data";
import countryLocaleData from "~/utils/country-locale-data";
import currencyLocaleData from "~/utils/currency-locale-data";
import { QuestionCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const isMobile = request.headers.get("user-agent")?.includes("Mobile");

  return {
    server: process.env.SERVER_URL,
    mobile: isMobile as boolean,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  const formData = await request.formData();
  const marketsData = JSON.parse(formData.get("marketsData") as string);

  switch (true) {
    case !!marketsData:
      try {
        const data = await queryMarketDomainData({
          shop,
          accessToken: accessToken as string,
        });
        console.log(data);
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: data,
        };
      } catch (error) {
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    default:
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
  }
};

const Index = () => {
  const { server, mobile } = useLoaderData<typeof loader>();

  const { t } = useTranslation();
  const navigate = useNavigate();

  const initRef = useRef(false);

  const shopHandle = useMemo(() => {
    if (!globalStore?.shop) return "";
    return globalStore?.shop?.split(".")[0];
  }, [globalStore?.shop]);

  //语言源数据
  const languageTableData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  //货币源数据
  const [currencyDataSource, setCurrencyDataSource] = useState<
    CurrencyDataType[]
  >([]);
  //市场数据
  const [regionsDataSource, setRegionsDataSource] = useState<any[]>([]);

  //加载状态数组，目前loading表示页面正在加载
  const [loadingArray, setLoadingArray] = useState<string[]>(["loading"]);

  //切换器加载状态数组，存储正在loading的Switch组件对应的id
  const [switchLoadingArray, setSwitchLoadingArray] = useState<number[]>([]);

  //移动端判断依据
  const [isMobile, setIsMobile] = useState<boolean>(mobile);

  //表格数据源
  const [dataSource, setDataSource] = useState<
    {
      key: number;
      status: boolean;
      region: string;
      languageCode: string;
      currencyCode: string;
    }[]
  >([]);

  //表格多选控制key
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  //编辑表单类型及数据控制
  const [createOrEditModal, setCreateOrEditModal] = useState<{
    open: boolean;
    key: number;
  }>({
    open: false,
    key: 0,
  });

  //编辑表单数据源
  const editData = useMemo(() => {
    return dataSource.find((item) => item.key == createOrEditModal.key);
  }, [dataSource, createOrEditModal.key]);

  const hasSelected = useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);

  //页面管理数据
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // 每页显示5条，可自定义
  const pagedData = useMemo(
    () =>
      dataSource.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [dataSource, currentPage, pageSize],
  );
  const currentPageKeys = useMemo(
    () => pagedData.map((item: any) => item.key),
    [pagedData],
  );
  const allCurrentPageSelected = useMemo(
    () => currentPageKeys.every((key: any) => selectedRowKeys.includes(key)),
    [currentPageKeys, selectedRowKeys],
  );
  const someCurrentPageSelected = useMemo(
    () => currentPageKeys.some((key: any) => selectedRowKeys.includes(key)),
    [currentPageKeys, selectedRowKeys],
  );

  const fetcher = useFetcher<any>();
  const marketsFetcher = useFetcher<any>();

  useEffect(() => {
    marketsFetcher.submit(
      {
        marketsData: JSON.stringify({}),
      },
      {
        method: "POST",
      },
    );
    getCurrencyByShopName();
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
    if (initRef.current) return; // 防止重复执行
    if (Array.isArray(regionsDataSource) && regionsDataSource.length) {
      initRef.current = true; // 标记已执行

      const initData = regionsDataSource.map((regionsDataSourceItem) => ({
        region: regionsDataSourceItem?.code,
        languageCode: "auto",
        currencyCode: regionsDataSourceItem?.currencyCode || "auto",
      }));

      const initCustomRedirectData = async () => {
        const data = await SyncUserIp({
          shop: globalStore?.shop || "",
          server: server || "",
          initData,
        });

        if (data?.success) {
          if (Array.isArray(data?.response) && data?.response?.length) {
            const newData = data.response.map((item: any) => ({
              ...item,
              key: item.id,
            }));
            setDataSource(newData);
          }
        }
        setLoadingArray((prev) => prev.filter((item) => item !== "loading"));
      };

      initCustomRedirectData();
    }
  }, [regionsDataSource, currencyDataSource]);

  useEffect(() => {
    if (!marketsFetcher.data?.success) return;

    const marketsData = marketsFetcher.data?.response?.markets?.nodes || [];

    const regionMap = new Map(); // key = region.id → { region, domains: Set }

    marketsData.forEach((market: any, index: any) => {
      const regions =
        market?.conditions?.regionsCondition?.regions?.nodes || [];

      const currencyCode =
        market?.currencySettings?.baseCurrency?.currencyCode || null;

      regions.forEach((region: any) => {
        if (!region?.id) return;

        if (!regionMap.has(region.id)) {
          regionMap.set(region.id, { ...region, currencyCode });
        } else {
          const existingRegion = regionMap.get(region.id);

          if (existingRegion && existingRegion.currencyCode !== currencyCode) {
            regionMap.set(region.id, { ...existingRegion, currencyCode });
          }
        }
      });
    });

    // Region 列表
    const regionsData = [...regionMap.values()].map((v) => v);

    setRegionsDataSource(regionsData);
  }, [marketsFetcher.data]);

  //表格列管理
  const columns = [
    {
      title: t("Region"),
      dataIndex: "region",
      key: "region",
      width: "30%",
      render: (_: any, record: any) => {
        const item =
          countryLocaleData[record?.region as keyof typeof countryLocaleData];
        if (item) {
          return <Text>{item}</Text>;
        } else {
          return <Text>{record?.region}</Text>;
        }
      },
    },
    {
      title: t("Language"),
      dataIndex: "languageCode",
      key: "languageCode",
      width: "30%",
      render: (_: any, record: any) => {
        const item =
          languageLocaleData[
            record?.languageCode as keyof typeof languageLocaleData
          ];
        if (item) {
          return (
            <Text>
              {item?.Name}({item?.isoCode})
            </Text>
          );
        } else {
          return <Text>{t("Match  visitor's browser")}</Text>;
        }
      },
    },
    {
      title: t("Currency"),
      dataIndex: "currencyCode",
      key: "currencyCode",
      width: "30%",
      render: (_: any, record: any) => {
        const item =
          currencyLocaleData[
            record?.currencyCode as keyof typeof currencyLocaleData
          ];
        if (item) {
          console.log(regionsDataSource);

          return (
            <Space>
              <Text>
                {item?.currencyName}({record?.currencyCode})
              </Text>
              {!!regionsDataSource?.find(
                (item) => item?.currencyCode == record?.currencyCode,
              ) && (
                <Popover
                  content={t(
                    "Due to Shopify Markets rules, each market must use its default currency, so currencies cannot be customized per language.",
                  )}
                >
                  <QuestionCircleOutlined />
                </Popover>
              )}
            </Space>
          );
        } else {
          return <Text>{t("Match visitor’s currency")}</Text>;
        }
      },
    },
    {
      title: t("Action"),
      dataIndex: "action",
      key: "action",
      width: "10%",
      render: (_: any, record: any) => (
        <Button
          onClick={() =>
            setCreateOrEditModal({
              open: true,
              key: record.key,
            })
          }
        >
          {t("Edit")}
        </Button>
      ),
    },
  ];

  //表格行管理
  const rowSelection = {
    selectedRowKeys,
    onChange: (e: any) => setSelectedRowKeys(e),
  };

  //获取用户货币数据
  const getCurrencyByShopName = async () => {
    const data = await GetCurrencyByShopName({
      shop: globalStore?.shop || "",
      server: server as string,
    });
    if (data?.success) {
      setCurrencyDataSource(data?.response);
    }
  };

  //编辑表单数据更新和提交后更新表格方法
  const handleUpdateDataSource = ({
    key,
    region,
    languageCode,
    currencyCode,
  }: {
    key: number;
    region: string;
    languageCode: string;
    currencyCode: string;
  }) => {
    const index = dataSource.findIndex((item) => item.key === key);

    if (index == -1) return;

    setDataSource((prev) => {
      // ✅ 更新已有项
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        region,
        languageCode,
        currencyCode,
      };
      return updated;
    });
  };

  //状态更新方法
  const handleCustomRedirectStatus = async ({
    id,
    status,
  }: {
    id: number;
    status: boolean;
  }) => {
    setSwitchLoadingArray([...switchLoadingArray, id]);
    const updateLiquidReplacementMethod = await UpdateUserIpStatus({
      shop: globalStore?.shop || "",
      server: server || "",
      id,
      status,
    });
    if (updateLiquidReplacementMethod?.success) {
      const newData = dataSource.map((item) =>
        item.key === id
          ? {
              ...item,
              status: !item.status,
            }
          : item,
      );
      setDataSource(newData);
    } else {
      shopify.toast.show(updateLiquidReplacementMethod?.errorMsg);
    }
    setSwitchLoadingArray((prev) => prev.filter((item) => item !== id));
  };

  const onCancel = () => {
    navigate(`/app/switcher`); // 跳转到 /app/manage_translation
  };

  return (
    <Page
      title={t("Customize Redirects by Region")}
      backAction={{
        onAction: onCancel,
      }}
    >
      <Space
        direction="vertical"
        size="middle"
        style={{ display: "flex", width: "100%" }}
      >
        <Text>
          {t(
            "Configure region-specific redirects for your visitors.Need more regions? Add them in your",
          )}{" "}
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() =>
              window.open(
                `https://admin.shopify.com/store/${shopHandle}/markets`,
              )
            }
          >
            {t("Shopify Markets settings")}
          </Button>
        </Text>

        {isMobile ? (
          <>
            <Card
              title={
                <Checkbox
                  checked={
                    allCurrentPageSelected && !loadingArray.includes("loading")
                  }
                  indeterminate={
                    someCurrentPageSelected && !allCurrentPageSelected
                  }
                  onChange={(e) =>
                    setSelectedRowKeys(
                      e.target.checked
                        ? [
                            ...currentPageKeys,
                            ...selectedRowKeys.filter(
                              (key) => !currentPageKeys.includes(key),
                            ),
                          ]
                        : [
                            ...selectedRowKeys.filter(
                              (key) => !currentPageKeys.includes(key),
                            ),
                          ],
                    )
                  }
                >
                  {t("Custom Liquid")}
                </Checkbox>
              }
              loading={loadingArray.includes("loading")}
            >
              {pagedData.map((item: any) => (
                <Card.Grid key={item.key} style={{ width: "100%" }}>
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    <Flex justify="space-between">
                      <Checkbox
                        checked={selectedRowKeys.includes(item.key)}
                        onChange={(e: any) => {
                          setSelectedRowKeys(
                            e.target.checked
                              ? [...selectedRowKeys, item.key]
                              : selectedRowKeys.filter(
                                  (key) => key !== item.key,
                                ),
                          );
                        }}
                      >
                        {t("Text")}{" "}
                      </Checkbox>
                      <Text>{item.sourceText}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text>{t("Translation text")}</Text>
                      <Text>
                        {countryLocaleData[
                          item?.region as keyof typeof countryLocaleData
                        ]
                          ? countryLocaleData[
                              item?.region as keyof typeof countryLocaleData
                            ]
                          : item?.region}
                      </Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text>{t("Translation text")}</Text>
                      <Text>
                        {languageLocaleData[
                          item?.languageCode as keyof typeof languageLocaleData
                        ]
                          ? `${
                              languageLocaleData[
                                item?.languageCode as keyof typeof languageLocaleData
                              ]?.Name
                            }(${item?.languageCode})`
                          : t("Match  visitor's browser")}
                      </Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text>{t("Translation text")}</Text>
                      <Text>
                        {currencyLocaleData[
                          item?.currencyCode as keyof typeof currencyLocaleData
                        ]
                          ? `${
                              currencyLocaleData[
                                item?.currencyCode as keyof typeof currencyLocaleData
                              ]?.currencyName
                            }(${item?.currencyCode})`
                          : t("Match visitor’s currency")}
                      </Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text>{t("Status")}</Text>
                      <Switch
                        loading={switchLoadingArray.includes(item?.key)}
                        onChange={(e) => {
                          handleCustomRedirectStatus({
                            id: item?.key,
                            status: e,
                          });
                        }}
                        value={item.status}
                      />
                    </Flex>
                    <Button
                      style={{ width: "100%" }}
                      onClick={() =>
                        setCreateOrEditModal({
                          open: true,
                          key: item.key,
                        })
                      }
                    >
                      {t("Edit")}
                    </Button>
                  </Space>
                </Card.Grid>
              ))}
            </Card>
            <div
              style={{
                display: "flex",
                background: "#fff",
                padding: "12px 0",
                textAlign: "center",
                justifyContent: "center",
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={dataSource.length}
                onChange={(page) => setCurrentPage(page)}
              />
            </div>
          </>
        ) : (
          <Table
            rowSelection={rowSelection}
            columns={columns}
            loading={loadingArray.includes("loading")}
            dataSource={dataSource}
          />
        )}
      </Space>
      <UpdateCustomRedirectsModal
        languageTableData={languageTableData}
        currencyTableData={currencyDataSource}
        regionsData={regionsDataSource}
        server={server || ""}
        dataSource={dataSource}
        handleUpdateDataSource={({
          key,
          region,
          languageCode,
          currencyCode,
        }: {
          key: number;
          region: string;
          languageCode: string;
          currencyCode: string;
        }) =>
          handleUpdateDataSource({
            key,
            region,
            languageCode,
            currencyCode,
          })
        }
        defaultData={editData}
        open={createOrEditModal.open}
        setIsModalHide={() =>
          setCreateOrEditModal({
            ...createOrEditModal,
            open: false,
          })
        }
      ></UpdateCustomRedirectsModal>
    </Page>
  );
};

export default Index;
