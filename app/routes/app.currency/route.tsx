import { TitleBar } from "@shopify/app-bridge-react";
import { Link, Page } from "@shopify/polaris";
import {
  Button,
  Flex,
  Input,
  message,
  Space,
  Table,
  Typography,
  Skeleton,
  Switch,
  Popover,
} from "antd";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useEffect, useState } from "react";
import "./styles.css";
import { ColumnsType } from "antd/es/table";
import { TableRowSelection } from "antd/es/table/interface";
import { useDispatch, useSelector } from "react-redux";
import { SearchOutlined } from "@ant-design/icons";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { queryShop, queryTheme } from "~/api/admin";
import {
  AddCurrency,
  DeleteCurrency,
  GetCacheData,
  GetCurrencyByShopName,
  GetSwitchId,
  InitCurrency,
  InsertSwitch,
  UpdateCurrency,
  UpdateDefaultCurrency,
} from "~/api/serve";
import { authenticate } from "~/shopify.server";
import AddCurrencyModal from "./components/addCurrencyModal";
import CurrencyEditModal from "./components/currencyEditModal";
import { setTableData } from "~/store/modules/currencyDataTable";
import SwitcherSettingCard from "./components/switcherSettingCard";
import { useTranslation } from "react-i18next";

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
  try {
    const adminAuthResult = await authenticate.admin(request);
    const { shop } = adminAuthResult.session;

    return json({
      shop,
      ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID,
      ciwiSwitcherBlocksId: process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID,
    });
  } catch (error) {
    console.error("Error during authentication:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const adminAuthResult = await authenticate.admin(request);
    const { shop } = adminAuthResult.session;
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const theme = JSON.parse(formData.get("theme") as string);
    const rateData = JSON.parse(formData.get("rateData") as string);
    const updateDefaultCurrency = JSON.parse(
      formData.get("updateDefaultCurrency") as string,
    );
    const addCurrencies = JSON.parse(formData.get("addCurrencies") as string);
    const deleteCurrencies: number[] = JSON.parse(
      formData.get("deleteCurrencies") as string,
    );
    const updateCurrencies = JSON.parse(
      formData.get("updateCurrencies") as string,
    );
    const ip = JSON.parse(
      formData.get("ip") as string,
    );

    switch (true) {
      case !!loading:
        try {
          const primaryCurrency = await InitCurrency({ request });
          const shopLoad = await queryShop({ request });
          const currencyList = await GetCurrencyByShopName({ request });
          const finalCurrencyList = currencyList || [];
          const moneyFormat = shopLoad.currencyFormats.moneyFormat;
          const moneyWithCurrencyFormat =
            shopLoad.currencyFormats.moneyWithCurrencyFormat;
          return json({
            primaryCurrency,
            defaultCurrencyCode: shopLoad.currencyCode,
            currencyList: finalCurrencyList,
            moneyFormat,
            moneyWithCurrencyFormat,
            ip,
          });
        } catch (error) {
          console.error("Error loading currency:", error);
          return json({ error: "Error loading currency" }, { status: 500 });
        }
      case !!theme:
        try {
          const data = await queryTheme({ request });
          return json({ data });
        } catch (error) {
          console.error("Error theme currency:", error);
          return json({ error: "Error theme currency" }, { status: 500 });
        }
      case !!rateData:
        try {
          const promises = rateData.map((currencyCode: any) =>
            GetCacheData({ shop, currencyCode }),
          );
          const data = await Promise.allSettled(promises);
          console.log("rateData: ", data);
          return json({ data });
        } catch (error) {
          console.error("Error rateData currency:", error);
          return json({ error: "Error rateData currency" }, { status: 500 });
        }
      case !!updateDefaultCurrency:
        try {
          const data = await UpdateDefaultCurrency({
            request,
            currencyName: updateDefaultCurrency.currencyName,
            currencyCode: updateDefaultCurrency.currencyCode,
            primaryStatus: updateDefaultCurrency.primaryStatus,
          });
          return json({ data });
        } catch (error) {
          console.error("Error updateDefaultCurrency currency:", error);
          return json(
            { error: "Error updateDefaultCurrency currency" },
            { status: 500 },
          );
        }
      case !!addCurrencies:
        try {
          const promises = addCurrencies.map((currency: any) =>
            AddCurrency({
              request,
              currencyName: currency.currencyName,
              currencyCode: currency.currencyCode,
              primaryStatus: currency?.primaryStatus || 0,
            }),
          );
          const data = await Promise.allSettled(promises);
          return json({ data });
        } catch (error) {
          console.error("Error addCurrencies currency:", error);
          return json(
            { error: "Error addCurrencies currency" },
            { status: 500 },
          );
        }
      case !!deleteCurrencies:
        const promises = deleteCurrencies.map((currency) =>
          DeleteCurrency({ request, id: currency }),
        );
        const data = await Promise.allSettled(promises);
        return json({ data });
      case !!updateCurrencies:
        try {
          const data = await UpdateCurrency({
            request,
            updateCurrencies,
          });
          return json({ data });
        } catch (error) {
          console.error("Error updateCurrencies currency:", error);
          return json(
            { error: "Error updateCurrencies currency" },
            { status: 500 },
          );
        }
      case !!ip:
        try {
          const data = await InsertSwitch({
            shopName: ip.shop,
            switchId: ip.ip,
          });
          console.log(data);

          return json({ data });
        } catch (error) {
          console.error("Error updateCurrencies currency:", error);
          return json(
            { error: "Error updateCurrencies currency" },
            { status: 500 },
          );
        }
    }
    return null;
  } catch (error) {
    console.error("Error action currency:", error);
    return json({ error: "Error action currency" }, { status: 500 });
  }
};

const Index = () => {
  const { shop, ciwiSwitcherId, ciwiSwitcherBlocksId } =
    useLoaderData<typeof loader>();
  const userShop = `https://${shop}`;
  const settingUrl = `https://admin.shopify.com/store/${shop.split(".")[0]}/settings/general`;
  const [loading, setLoading] = useState<boolean>(true);
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [currencyData, setCurrencyData] = useState<CurrencyType[]>([]);
  const [currencyAutoRate, setCurrencyAutoRate] = useState([]);
  const [defaultSymbol, setDefaultSymbol] = useState<string>("");
  const [deleteloading, setDeleteLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [addCurrencies, setAddCurrencies] = useState<CurrencyType[]>([]);
  const [isCurrencyEditModalOpen, setIsCurrencyEditModalOpen] = useState(false);
  const [moneyFormatHtml, setMoneyFormatHtml] = useState<string | null>("");
  const [moneyWithCurrencyFormatHtml, setMoneyWithCurrencyFormatHtml] =
    useState<string | null>("");
  const [switcherEnableCardOpen, setSwitcherEnableCardOpen] =
    useState<boolean>(false);
  const [selectedRow, setSelectedRow] = useState<
    CurrencyDataType | undefined
  >();
  const dataSource: CurrencyDataType[] = useSelector(
    (state: any) => state.currencyTableData.rows,
  );
  const [originalData, setOriginalData] = useState<
    CurrencyDataType[] | undefined
  >();
  const [filteredData, setFilteredData] = useState<
    CurrencyDataType[] | undefined
  >(dataSource);
  const [ip, setIp] = useState(false);

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const loadingFetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  const rateFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();
  const initCurrencyFetcher = useFetcher<any>();
  const ipFetcher = useFetcher<any>();

  useEffect(() => {
    const loadingFormData = new FormData();
    loadingFormData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(loadingFormData, {
      method: "post",
      action: "/app/currency",
    });

    const themeFormData = new FormData();
    themeFormData.append("theme", JSON.stringify(true));
    themeFetcher.submit(themeFormData, {
      method: "post",
      action: "/app/currency",
    });

    fetch("/currencies.json")
      .then((response) => response.json())
      .then((data) => {
        setCurrencyData(data);
        setAddCurrencies(
          data.filter(
            (item: CurrencyType) => item.currencyCode !== defaultCurrencyCode,
          ),
        );
      })
      .catch((error) => console.error("Error loading currencies:", error));

    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingFetcher.data && currencyData.length) {
      setDefaultCurrencyCode(loadingFetcher.data.defaultCurrencyCode);
      const defaultCurrency = currencyData.find(
        (item) => item.currencyCode === loadingFetcher.data.defaultCurrencyCode,
      );
      if (defaultCurrency) {
        setDefaultSymbol(defaultCurrency.symbol);
      }
      const tableData = loadingFetcher.data.currencyList.filter(
        (item: any) => !item.primaryStatus,
      );
      setOriginalData(tableData);
      setFilteredData(tableData);
      dispatch(setTableData(tableData));
      const autoRateData = loadingFetcher.data.currencyList
        .filter((item: any) => item.exchangeRate == "Auto")
        .map((item: any) => item.currencyCode);
      const rateFormData = new FormData();
      rateFormData.append("rateData", JSON.stringify(autoRateData));
      rateFetcher.submit(rateFormData, {
        method: "post",
        action: "/app/currency",
      });
      const parser = new DOMParser();
      setMoneyFormatHtml(
        parser.parseFromString(loadingFetcher.data.moneyFormat, "text/html")
          .documentElement.textContent,
      );
      setMoneyWithCurrencyFormatHtml(
        parser.parseFromString(
          loadingFetcher.data.moneyWithCurrencyFormat,
          "text/html",
        ).documentElement.textContent,
      );
      setIp(loadingFetcher.data.ip);
      shopify.loading(false);
      setLoading(false);
      const primaryCurrency = loadingFetcher.data.primaryCurrency;
      if (!primaryCurrency && defaultCurrency) {
        const formData = new FormData();
        formData.append(
          "addCurrencies",
          JSON.stringify([
            {
              currencyName: defaultCurrency.currencyName,
              currencyCode: defaultCurrency.currencyCode,
              primaryStatus: 1,
            },
          ]),
        );
        initCurrencyFetcher.submit(formData, {
          method: "post",
          action: "/app/currency",
        });
      } else if (
        primaryCurrency?.currencyCode !==
        loadingFetcher.data.defaultCurrencyCode &&
        defaultCurrency
      ) {
        const formData = new FormData();
        formData.append(
          "updateDefaultCurrency",
          JSON.stringify({
            currencyName: defaultCurrency.currencyName,
            currencyCode: defaultCurrency.currencyCode,
            primaryStatus: 1,
          }),
        );
        initCurrencyFetcher.submit(formData, {
          method: "post",
          action: "/app/currency",
        });
      }
    }
  }, [loadingFetcher.data]);

  useEffect(() => {
    if (themeFetcher.data) {
      const switcherData =
        themeFetcher.data.data.nodes[0].files.nodes[0].body.content;
      const jsonString = switcherData.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      const blocks = JSON.parse(jsonString).current.blocks;
      const switcherJson: any = Object.values(blocks).find(
        (block: any) => block.type === ciwiSwitcherBlocksId,
      );
      if (!switcherJson || switcherJson.disabled) {
        setSwitcherEnableCardOpen(true);
      }
    }
  }, [themeFetcher.data]);

  useEffect(() => {
    if (rateFetcher.data) {
      const newRates = rateFetcher.data.data.reduce((acc: any[], item: any) => {
        if (item.status === "fulfilled" && item.value) {
          acc.push(item.value);
        }
        return acc;
      }, []);
      if (newRates.length > 0) {
        setCurrencyAutoRate(newRates);
        console.log(newRates);
      }
    }
  }, [rateFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.data !== undefined) {
      let newData = [...dataSource];
      // 遍历 deleteFetcher.data
      deleteFetcher.data.data.forEach((data: any) => {
        if (data.value.success) {
          newData = newData.filter((item) => item.key !== data.value.response);
        } else {
          message.error(data.value.errorMsg);
        }
      });
      dispatch(setTableData(newData));
      message.success(t("Deleted successfully"));
      setDeleteLoading(false);
      setSelectedRowKeys([]);
      setOriginalData(newData);
      setFilteredData(newData);
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    if (ipFetcher.data) {
      if (ipFetcher.data.data.success) {
        if (ipFetcher.data.data.response) {
          setIp(true);
        } else {
          setIp(false);
        }
      }
    }
  }, [ipFetcher.data])

  useEffect(() => {
    setOriginalData(dataSource);
    setFilteredData(dataSource);
  }, [dataSource]);

  const hasSelected = selectedRowKeys.length > 0;

  const exRateColumns: (BaseOptionType | DefaultOptionType)[] = [
    { value: "Auto", label: t("Auto") },
    { value: "Manual Rate", label: t("Manual Rate") },
  ];

  const roundingColumns: (BaseOptionType | DefaultOptionType)[] = [
    { value: "", label: t("Disable") },
    { value: "0", label: t("No decimal") },
    { value: "1.00", label: `1.00 (${t("Recommend")})` },
    { value: "0.99", label: "0.99" },
    { value: "0.95", label: "0.95" },
    { value: "0.75", label: "0.75" },
    { value: "0.5", label: "0.50" },
    { value: "0.25", label: "0.25" },
  ];

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
            {typeof autoRate?.rate === "number" && (
              <Text>
                ({defaultSymbol}1 = {autoRate.rate.toFixed(4)}{" "}
                {record.currencyCode})
              </Text>
            )}
          </div>
        ) : (
          <Text>
            {defaultSymbol}1 = {record.exchangeRate} {record.currencyCode}
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (originalData) {
      if (value) {
        const filtered = originalData.filter(
          (data) =>
            data.currency.toLowerCase().includes(value.toLowerCase()) ||
            data.currencyCode.toLowerCase().includes(value.toLowerCase()),
        );
        setFilteredData(filtered);
      } else {
        setFilteredData(originalData);
      }
    }
  };

  const handleEdit = (key: number) => {
    const row = dataSource.find((item) => item.key === key);
    setSelectedRow(row);
    setIsCurrencyEditModalOpen(true);
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
  };

  const onIpChange = (checked: boolean) => {
    const formData = new FormData();
    formData.append("ip", JSON.stringify({
      shop,
      ip: checked ? 1 : 0,
    }));
    ipFetcher.submit(formData, {
      method: "post",
      action: "/app/currency",
    });
  };

  return (
    <Page>
      <TitleBar title={t("Currency")}></TitleBar>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <SwitcherSettingCard
          settingUrl={settingUrl}
          moneyFormatHtml={moneyFormatHtml}
          moneyWithCurrencyFormatHtml={moneyWithCurrencyFormatHtml}
          shop={shop}
          ciwiSwitcherId={ciwiSwitcherId}
          isEnable={switcherEnableCardOpen}
          defaultCurrencyCode={defaultCurrencyCode}
        />
        <div className="currency-header">
          <Title style={{ fontSize: "1.25rem", display: "inline" }}>
            {t("Currency")}
          </Title>
          <div className="currency-action">
            <Space>
              {hasSelected ? `Selected ${selectedRowKeys.length} items` : null}
              <Button
                type="primary"
                onClick={() => handleDelete()}
                disabled={!hasSelected}
                loading={deleteloading}
              >
                {t("Delete")}
              </Button>
              <Button
                type="primary"
                onClick={() => setIsAddCurrencyModalOpen(true)}
              >
                {t("Add Currency")}
              </Button>
            </Space>
          </div>
        </div>
        {defaultCurrencyCode ? (
          <div>
            <Text type="secondary">{t("Your store's default currency:")}</Text>
            <Text strong> {defaultCurrencyCode}</Text>
          </div>
        ) : (
          <Skeleton active paragraph={{ rows: 0 }} />
        )}
        <Flex gap="middle" vertical>
          <div className="ip_action">
            <Flex align="center" gap="middle">
              <Text>
                {t("After setting, you can")}
                <Link url={userShop} target="_blank">
                  {t("Preview")}
                </Link>
                {t("to view the prices in different currencies.")}
              </Text>
            </Flex>
            {!loading && <div>
              <Popover content={t("Automatically switch to the target language and currency.")}>
                <Text strong>Geolocation{" "}</Text>
                <Switch onChange={onIpChange} checked={ip} loading={ipFetcher.state === "submitting"} />
              </Popover>
            </div>}
          </div>
          <Input
            placeholder={t("Search currencies...")}
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearch}
            style={{ marginBottom: 16 }}
          />
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filteredData}
            loading={deleteloading || loading}
          />
        </Flex>
      </Space>
      <AddCurrencyModal
        isVisible={isAddCurrencyModalOpen}
        setIsModalOpen={setIsAddCurrencyModalOpen}
        addCurrencies={addCurrencies}
        defaultCurrencyCode={defaultCurrencyCode}
      />
      <CurrencyEditModal
        isVisible={isCurrencyEditModalOpen}
        setIsModalOpen={setIsCurrencyEditModalOpen}
        roundingColumns={roundingColumns}
        exRateColumns={exRateColumns}
        selectedRow={selectedRow}
        defaultCurrencyCode={defaultCurrencyCode}
      />
    </Page>
  );
};

export default Index;
