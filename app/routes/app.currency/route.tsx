import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Button,
  Flex,
  message,
  Space,
  Table,
  Typography,
  Skeleton,
  Card,
  Checkbox,
  Pagination,
} from "antd";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { ColumnsType } from "antd/es/table";
import { TableRowSelection } from "antd/es/table/interface";
import { useDispatch, useSelector } from "react-redux";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { queryShop } from "~/api/admin";
import {
  AddCurrency,
  DeleteCurrency,
  GetCacheData,
  GetCurrencyByShopName,
  InitCurrency,
  UpdateCurrency,
  UpdateDefaultCurrency,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import AddCurrencyModal from "./components/addCurrencyModal";
import CurrencyEditModal from "./components/currencyEditModal";
import { setTableData } from "~/store/modules/currencyDataTable";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import { useNavigate } from "react-router-dom";
import useReport from "scripts/eventReport";
import { globalStore } from "~/globalStore";
import { authForShopify } from "~/utils/auth";
const { Title, Text } = Typography;

export interface CurrencyDataType {
  key: React.Key;
  currency: string;
  currencyCode: string;
  rounding: string;
  exchangeRate: string | number;
}

export interface CurrencyType {
  key: number;
  currencyName: string;
  currencyCode: string;
  symbol: string;
  locale: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const isMobile = request.headers.get("user-agent")?.includes("Mobile");

  return json({
    server: process.env.SERVER_URL,
    mobile: isMobile as boolean,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const authForShopifyData = await authForShopify({ request });
  if (!authForShopifyData) return null;
  const { admin, shop, accessToken } = authForShopifyData;
  const formData = await request.formData();
  const theme = JSON.parse(formData.get("theme") as string);
  const deleteCurrencies: number[] = JSON.parse(
    formData.get("deleteCurrencies") as string,
  );
  const updateCurrencies = JSON.parse(
    formData.get("updateCurrencies") as string,
  );

  switch (true) {
    case !!theme:
      try {
        const response = await admin.graphql(
          `#graphql
            query {
              themes(roles: MAIN, first: 1) {
                nodes {
                  files(filenames: "config/settings_data.json") { 
                    nodes {
                      body {
                        ... on OnlineStoreThemeFileBodyText {
                          __typename
                          content
                        }
                      }
                    }
                  }
                }
              }
            }`,
        );
        const data = await response.json();
        return json({ data: data.data.themes });
      } catch (error) {
        console.error("Error theme currency:", error);
      }
    case !!deleteCurrencies:
      try {
        const promises = deleteCurrencies.map((currency) =>
          DeleteCurrency({ shop, id: currency }),
        );
        const data = await Promise.allSettled(promises);
        return data;
      } catch (error) {
        console.error("Error deleteCurrencies currency:", error);
        return [];
      }
    case !!updateCurrencies:
      try {
        const data = await UpdateCurrency({
          shop,
          updateCurrencies,
        });
        return data;
      } catch (error) {
        console.error("Error updateCurrencies currency:", error);
      }
    default:
      return null;
  }
};

const Index = () => {
  const { server, mobile } = useLoaderData<typeof loader>();
  const [loading, setLoading] = useState<boolean>(true);
  const [defaultCurrency, setDefaultCurrency] = useState<{
    code: string;
    symbol: string;
  }>({
    code: "",
    symbol: "",
  });
  const [currencyData, setCurrencyData] = useState<CurrencyType[]>([]);
  const [currencyAutoRate, setCurrencyAutoRate] = useState<any>([]);
  const [deleteloading, setDeleteLoading] = useState(false);
  const [deleteCode, setDeleteCode] = useState<any>("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [addCurrencies, setAddCurrencies] = useState<CurrencyType[]>([]);
  const [isCurrencyEditModalOpen, setIsCurrencyEditModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<
    CurrencyDataType | undefined
  >();
  const [isMobile, setIsMobile] = useState<boolean>(mobile);
  const dataSource: CurrencyDataType[] = useSelector(
    (state: any) => state.currencyTableData.rows,
  );
  const [filteredData, setFilteredData] = useState<CurrencyDataType[]>([]);
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
    () => currentPageKeys.every((key) => selectedRowKeys.includes(key)),
    [currentPageKeys, selectedRowKeys],
  );
  const someCurrentPageSelected = useMemo(
    () => currentPageKeys.some((key) => selectedRowKeys.includes(key)),
    [currentPageKeys, selectedRowKeys],
  );
  const { reportClick } = useReport();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const fetcher = useFetcher<any>();
  const initFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();

  useEffect(() => {
    initFetcher.submit(
      {},
      {
        method: "POST",
        action: "/currencyInit",
      },
    );
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在货币页面`,
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
    if (initFetcher.data) {
      if (initFetcher.data?.success) {
        const defaultCurrencyCode =
          initFetcher.data?.response?.defaultCurrencyCode;
        const currencyLocaleData =
          initFetcher.data?.response?.currencyLocaleData;
        const currencyDataWithoutPrimary = currencyLocaleData.filter(
          (item: any) => item.currencyCode !== defaultCurrencyCode,
        );
        setCurrencyData(currencyLocaleData);
        setAddCurrencies(currencyDataWithoutPrimary);
        const defaultCurrencySymbol = currencyLocaleData.find(
          (item: any) => item.currencyCode === defaultCurrencyCode,
        )?.symbol;
        setDefaultCurrency({
          code: defaultCurrencyCode,
          symbol: defaultCurrencySymbol || "",
        });
      }
      getCurrencyByShopName();
    }
  }, [initFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.data) {
      if (deleteFetcher.data?.length) {
        let newData = [...dataSource];
        // 遍历 deleteFetcher.data
        deleteFetcher.data?.forEach((item: any) => {
          if (item?.value?.success) {
            newData = newData.filter(
              (currency) => currency.key !== item?.value?.response,
            );
          } else {
            shopify.toast.show(item?.value?.errorMsg);
          }
        });
        dispatch(setTableData(newData));
        shopify.toast.show(t("Delete successfully"));
        setDeleteLoading(false);
        setSelectedRowKeys([]);
        setDeleteCode("");
        setFilteredData(newData);
      }
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    setFilteredData(dataSource);
  }, [dataSource]);

  const hasSelected = selectedRowKeys.length > 0;

  const columns: ColumnsType<any> = [
    {
      title: t("Currency"),
      dataIndex: "currencyCode",
      key: "currencyCode",
      width: "20%",
      render: (_: any, record: any) => (
        <Text>
          {record.currency}({record.currencyCode})
        </Text>
      ),
    },
    {
      title: t("Rounding"),
      dataIndex: "rounding",
      key: "rounding",
      width: "15%",
      render: (_: any, record: any) => {
        switch (record.rounding) {
          case null:
            return <Text></Text>;
          case "":
            return <Text>{t("Disable")}</Text>;
          case "0":
            return <Text>{t("No decimal")}</Text>;
          default:
            return <Text>{Number(record.rounding).toFixed(2)}</Text>;
        }
      },
    },
    {
      title: t("Exchange rate"),
      dataIndex: "exchangeRate",
      key: "exchangeRate",
      width: "35%",
      render: (_: any, record: any) => {
        const autoRate: any = currencyAutoRate.find(
          (item: any) => item?.currencyCode == record.currencyCode,
        );

        return record.exchangeRate === "Auto" ? (
          <div>
            <Text>{t("Auto")}</Text>
            {typeof autoRate?.exchangeRate === "number" && (
              <Text>
                ({defaultCurrency.symbol}1 = {autoRate.exchangeRate.toFixed(4)}{" "}
                {record.currencyCode})
              </Text>
            )}
          </div>
        ) : (
          <Text>
            {defaultCurrency.symbol}1 = {record?.exchangeRate}{" "}
            {record?.currencyCode}
          </Text>
        );
      },
    },
    {
      title: t("Action"),
      dataIndex: "action",
      key: "action",
      width: "30%",
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => handleEdit(record.key)}>{t("Edit")}</Button>
          <Button onClick={() => handleDelete(record.key)}>
            {t("Delete")}
          </Button>
        </Space>
      ),
    },
  ];

  const getCurrencyByShopName = async () => {
    const data = await GetCurrencyByShopName({
      shop: globalStore?.shop as string,
      server: server as string,
    });
    if (data?.success) {
      const tableData = data?.response?.filter(
        (item: any) => !item?.primaryStatus,
      );
      setFilteredData(tableData);
      dispatch(setTableData(tableData));
      const autoRateData = data?.response
        ?.filter((item: any) => item?.exchangeRate == "Auto")
        .map((item: any) => item?.currencyCode);
      setLoading(false);
      if (autoRateData?.length) {
        getAutoRateData(autoRateData);
      }
    }
  };

  const getAutoRateData = async (autoRateData: string[]) => {
    const promises = autoRateData.map((currencyCode: any) =>
      GetCacheData({
        shop: globalStore?.shop as string,
        server: server as string,
        currencyCode,
      }),
    );
    const data = await Promise.allSettled(promises);
    if (data?.length) {
      let currencyAutoRateData: any[] = [];
      data?.map((item: any) => {
        if (item?.value?.success && item?.status == "fulfilled") {
          currencyAutoRateData.push(item?.value?.response);
        }
      });
      setCurrencyAutoRate(currencyAutoRateData);
    }
  };

  const handleEdit = (key: number) => {
    const row = dataSource.find((item) => item.key === key);
    setSelectedRow(row);
    setIsCurrencyEditModalOpen(true);
    reportClick("currency_list_edit");
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<CurrencyDataType> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handleDelete = (key?: React.Key) => {
    const formData = new FormData();
    if (key) {
      setDeleteCode(key);
      formData.append("deleteCurrencies", JSON.stringify([key]));
      deleteFetcher.submit(formData, {
        method: "post",
        action: "/app/currency",
      });
    } else {
      formData.append("deleteCurrencies", JSON.stringify(selectedRowKeys));
      deleteFetcher.submit(formData, {
        method: "post",
        action: "/app/currency",
      });
    }
    setDeleteLoading(true);
    reportClick("currency_list_delete");
  };

  return (
    <Page>
      <TitleBar title={t("Currency")}></TitleBar>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div>
          <Title style={{ fontSize: "1.25rem", display: "inline" }}>
            {t("Currency")}
          </Title>
          {defaultCurrency.code ? (
            <div>
              <Text type="secondary">
                {t("Your store's default currency:")}
              </Text>
              <Text strong> {defaultCurrency.code}</Text>
            </div>
          ) : (
            <Skeleton active paragraph={{ rows: 0 }} />
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Flex align="center" gap="middle">
            <Button
              onClick={() => handleDelete()}
              disabled={!hasSelected}
              loading={deleteloading}
            >
              {t("Delete")}
            </Button>
            <Text style={{ color: "#007F61" }}>
              {hasSelected
                ? `${t("Selected")} ${selectedRowKeys.length} ${t("items")}`
                : null}
            </Text>
          </Flex>
          <Button
            type="primary"
            onClick={() => {
              setIsAddCurrencyModalOpen(true);
              reportClick("currency_navi_add");
            }}
          >
            {t("Add Currency")}
          </Button>
        </div>
        {/* <Flex align="center" gap="middle">
            <Text>
              {t("After setting, you can")}
              <Link url={userShop} target="_blank">
                {t("Preview")}
              </Link>
              {t("to view the prices in different currencies.")}
            </Text>
          </Flex>
          <Input
            placeholder={t("Search currencies...")}
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearch}
            style={{ marginBottom: 16 }}
          /> */}
        {isMobile ? (
          <>
            <Card
              title={
                <Checkbox
                  checked={allCurrentPageSelected && !loading}
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
                  {t("Currency")}
                </Checkbox>
              }
              loading={loading}
            >
              {pagedData.map((item: any) => (
                <Card.Grid key={item.key} style={{ width: "100%" }}>
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    <Checkbox
                      checked={selectedRowKeys.includes(item.key)}
                      onChange={(e: any) => {
                        setSelectedRowKeys(
                          e.target.checked
                            ? [...selectedRowKeys, item.key]
                            : selectedRowKeys.filter((key) => key !== item.key),
                        );
                      }}
                    >
                      {item.currency}({item.currencyCode})
                    </Checkbox>
                    <Flex justify="space-between">
                      <Text>{t("Rounding")}</Text>
                      {item.rounding === null ? (
                        <Text></Text>
                      ) : item.rounding === "" ? (
                        <Text>{t("Disable")}</Text>
                      ) : item.rounding === "0" ? (
                        <Text>{t("No decimal")}</Text>
                      ) : (
                        <Text>{Number(item.rounding).toFixed(2)}</Text>
                      )}
                    </Flex>
                    <Flex justify="space-between">
                      <Text>{t("Exchange rate")}</Text>
                      {item.exchangeRate === "Auto" ? (
                        <div>
                          <Text>{t("Auto")}</Text>
                          {typeof currencyAutoRate.find(
                            (item: any) =>
                              item?.currencyCode == item.currencyCode,
                          )?.rate === "number" && (
                            <Text>
                              ({defaultCurrency.symbol}1 ={" "}
                              {currencyAutoRate
                                .find(
                                  (item: any) =>
                                    item?.currencyCode == item.currencyCode,
                                )
                                ?.rate.toFixed(4)}{" "}
                              {item.currencyCode})
                            </Text>
                          )}
                        </div>
                      ) : (
                        <Text>
                          {defaultCurrency.symbol}1 = {item.exchangeRate}{" "}
                          {item.currencyCode}
                        </Text>
                      )}
                    </Flex>
                    <Button
                      style={{ width: "100%" }}
                      onClick={() => handleEdit(item.key)}
                    >
                      {t("Edit")}
                    </Button>
                    <Button
                      style={{ width: "100%" }}
                      loading={
                        deleteFetcher.state === "submitting" &&
                        deleteCode === item.key
                      }
                      onClick={() => handleDelete(item.key)}
                    >
                      {t("Delete")}
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
            dataSource={filteredData}
            loading={deleteloading || loading}
          />
        )}
      </Space>
      <AddCurrencyModal
        server={server as string}
        isVisible={isAddCurrencyModalOpen}
        setIsModalOpen={setIsAddCurrencyModalOpen}
        addCurrencies={addCurrencies}
        defaultCurrencyCode={defaultCurrency.code}
      />
      <CurrencyEditModal
        isVisible={isCurrencyEditModalOpen}
        setIsModalOpen={setIsCurrencyEditModalOpen}
        selectedRow={selectedRow}
        defaultCurrencyCode={defaultCurrency.code}
      />
    </Page>
  );
};

export default Index;
