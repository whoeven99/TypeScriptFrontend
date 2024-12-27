import { TitleBar } from "@shopify/app-bridge-react";
import { Link, Page } from "@shopify/polaris";
import { Button, Flex, Input, message, Space, Table, Typography } from "antd";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useEffect, useState } from "react";
// import { SearchOutlined } from "@ant-design/icons"
import "./styles.css";
import { ColumnsType } from "antd/es/table";
import { TableRowSelection } from "antd/es/table/interface";
// import { updateUserInfo } from "~/api/serve";
import { useDispatch, useSelector } from "react-redux";

import { SearchOutlined } from "@ant-design/icons";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { queryShop, queryTheme } from "~/api/admin";
import {
  AddCurrency,
  DeleteCurrency,
  GetCacheData,
  GetCurrencyByShopName,
  InitCurrency,
  UpdateCurrency,
  UpdateDefaultCurrency,
} from "~/api/serve";
import { authenticate } from "~/shopify.server";
import AddCurrencyModal from "./components/addCurrencyModal";
import CurrencyEditModal from "./components/currencyEditModal";
import { setTableData } from "~/store/modules/currencyDataTable";
import SwitcherSettingCard from "./components/switcherSettingCard";

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

    // 返回包含 userId 的 json 响应
    return json({
      shop,
      ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID,
      ciwiSwitcherBlocksId: process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID,
    });
  } catch (error) {
    // 打印错误信息，方便调试
    console.error("Error during authentication:", error);
    // 返回带有错误信息的 500 响应
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

    switch (true) {
      case !!loading:
        try {
          const primaryCurrency = await InitCurrency({ request });
          const shopLoad = await queryShop({ request });
          const currencyList = await GetCurrencyByShopName({ request });
          const finalCurrencyList =
            currencyList === undefined ? [] : currencyList;
          console.log("finalCurrencyList: ", finalCurrencyList);
          const moneyFormat = shopLoad.currencyFormats.moneyFormat;
          const moneyWithCurrencyFormat =
            shopLoad.currencyFormats.moneyWithCurrencyFormat;
          return json({
            primaryCurrency: primaryCurrency,
            defaultCurrencyCode: shopLoad.currencyCode,
            currencyList: finalCurrencyList,
            moneyFormat,
            moneyWithCurrencyFormat,
          });
        } catch (error) {
          console.error("Error loading currency:", error);
          return json({ error: "Error loading currency" }, { status: 500 });
        }
      case !!theme:
        try {
          const data = await queryTheme({ request });
          return json({ data: data });
        } catch (error) {
          console.error("Error theme currency:", error);
          return json({ error: "Error theme currency" }, { status: 500 });
        }
      case !!rateData:
        try {
          console.log("rateData: ", rateData);
          const promises = rateData.map((currencyCode: any) => {
            return GetCacheData({
              shop,
              currencyCode: currencyCode,
            });
          });
          console.log("promises: ", promises);

          // 使用 Promise.allSettled
          const res = await Promise.allSettled(promises);
          console.log("result: ", res);

          // 处理每个请求的结果
          res.forEach((result) => {
            if (result.status === "fulfilled") {
              console.log("Request successful:", result.value);
            } else {
              console.error("Request failed:", result.reason);
            }
          });
          return json({ data: res });
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
          return json({ data: data });
        } catch (error) {
          console.error("Error updateDefaultCurrency currency:", error);
          return json(
            { error: "Error updateDefaultCurrency currency" },
            { status: 500 },
          );
        }

      case !!addCurrencies:
        try {
          console.log("addCurrencies: ", addCurrencies);
          const promises = addCurrencies.map((currency: any) => {
            return AddCurrency({
              request,
              currencyName: currency.currencyName,
              currencyCode: currency.currencyCode,
              primaryStatus: currency?.primaryStatus || 0,
            });
          });
          console.log("promises: ", promises);

          // 使用 Promise.allSettled
          const res = await Promise.allSettled(promises);
          console.log("result: ", res);

          // 处理每个请求的结果
          res.forEach((result) => {
            if (result.status === "fulfilled") {
              console.log("Request successful:", result.value);
            } else {
              console.error("Request failed:", result.reason);
            }
          });
          return json({ data: res });
        } catch (error) {
          console.error("Error addCurrencies currency:", error);
          return json(
            { error: "Error addCurrencies currency" },
            { status: 500 },
          );
        }
      case !!deleteCurrencies:
        const promises = deleteCurrencies.map(async (currency) => {
          return DeleteCurrency({
            request,
            id: currency,
          });
        });
        console.log("promises: ", promises);
        const res = await Promise.allSettled(promises);
        console.log("result: ", res);

        // 处理每个请求的结果
        res.forEach((result) => {
          if (result.status === "fulfilled") {
            console.log("Request successful:", result.value);
          } else {
            console.error("Request failed:", result.reason);
          }
        });
        return json({ data: res });
      case !!updateCurrencies:
        const data = await UpdateCurrency({
          request,
          updateCurrencies: updateCurrencies,
        });
        return json({ data: data });
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
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>(
    "No defaultCurrencyCode set",
  );
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
  // 当前显示的数据源
  const [filteredData, setFilteredData] = useState<
    CurrencyDataType[] | undefined
  >(dataSource);

  const dispatch = useDispatch();
  const loadingFetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  const rateFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();
  const initCurrencyFetcher = useFetcher<any>();

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
    // 使用 fetch 从 public 文件夹加载 JSON 数据
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
      const defaultCurrency = currencyData.find((item: CurrencyType) => {
        if (item.currencyCode == loadingFetcher.data.defaultCurrencyCode)
          return item;
      });
      if (defaultCurrency) {
        setDefaultSymbol(defaultCurrency.symbol);
      }
      const tableData = loadingFetcher.data.currencyList.filter(
        (item: any) => !item.primaryStatus,
      );
      setOriginalData(tableData);
      setFilteredData(tableData); // 用加载的数据初始化 filteredData
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
      const parsedMoneyFormat = parser.parseFromString(
        loadingFetcher.data.moneyFormat,
        "text/html",
      ).documentElement.textContent;
      const parsedMoneyWithCurrencyFormat = parser.parseFromString(
        loadingFetcher.data.moneyWithCurrencyFormat,
        "text/html",
      ).documentElement.textContent;

      setMoneyFormatHtml(parsedMoneyFormat);
      setMoneyWithCurrencyFormatHtml(parsedMoneyWithCurrencyFormat);
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
        ); // 将选中的语言作为字符串发送
        initCurrencyFetcher.submit(formData, {
          method: "post",
          action: "/app/currency",
        }); // 提交表单请求
      } else if (
        primaryCurrency?.currencyCode !=
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
        ); // 将选中的语言作为字符串发送
        initCurrencyFetcher.submit(formData, {
          method: "post",
          action: "/app/currency",
        }); // 提交表单请求
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
        (block: any) => block.type == ciwiSwitcherBlocksId,
      );
      if (!switcherJson || switcherJson.disabled) {
        setSwitcherEnableCardOpen(true);
      }
    }
  }, [themeFetcher.data]);

  useEffect(() => {
    if (rateFetcher.data) {
      // 创建一个新数组，存放符合条件的 item.value
      const newRates = rateFetcher.data.data.reduce((acc: any[], item: any) => {
        if (item.status === "fulfilled" && item.value) {
          acc.push(item.value); // 将 item.value 添加到数组中
        }
        return acc;
      }, []);

      // 更新状态
      if (newRates.length > 0) {
        setCurrencyAutoRate(newRates); // 更新 currencyAutoRates
      }
    }
  }, [rateFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.data !== undefined) {
      // 创建一个新数组来存储需要更新的数据
      let newData = [...dataSource];
      // 遍历 deleteFetcher.data
      deleteFetcher.data.data.forEach((res: any) => {
        if (res.value.success) {
          // 过滤掉需要删除的项
          newData = newData.filter(
            (item: CurrencyDataType) => item.key !== res.value.response,
          );
        } else {
          message.error(res.value.errorMsg);
        }
      });
      // 一次性更新表格数据
      dispatch(setTableData(newData)); // 更新表格数据
      message.success("Deleted successfully");
      setDeleteLoading(false);
      setSelectedRowKeys([]); // 清空已选中项
      setOriginalData(newData);
      setFilteredData(newData); // 确保当前显示的数据也更新
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    setOriginalData(dataSource);
    setFilteredData(dataSource); // 用加载的数据初始化 filteredData
  }, [dataSource]);

  const hasSelected = selectedRowKeys.length > 0;

  const exRateColumns: (BaseOptionType | DefaultOptionType)[] = [
    { value: "Auto", label: "Auto" },
    { value: "Manual Rate", label: "Manual Rate" },
  ];

  const roundingColumns: (BaseOptionType | DefaultOptionType)[] = [
    { value: "", label: "Disable" },
    { value: "0", label: "No decimal" },
    { value: "1.00", label: "1.00 (Recommend)" },
    { value: "0.99", label: "0.99" },
    { value: "0.95", label: "0.95" },
    { value: "0.75", label: "0.75" },
    { value: "0.5", label: "0.50" },
    { value: "0.25", label: "0.25" },
  ];

  const columns: ColumnsType<any> = [
    {
      title: "Currency",
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
      title: "Rounding",
      dataIndex: "rounding",
      key: "rounding",
      width: "15%",
      render: (_: any, record: any) => {
        switch (record.rounding) {
          case null:
            return <Text></Text>;
          case "":
            return <Text>Disable</Text>;
          case "0":
            return <Text>No decimal</Text>;
          default:
            return <Text>{Number(record.rounding).toFixed(2)}</Text>;
        }
      },
    },
    {
      title: "Exchange rate",
      dataIndex: "exchangeRate",
      key: "exchangeRate",
      width: "35%",
      render: (_: any, record: any) => {
        const autoRate: any = currencyAutoRate.find(
          (item: any) => item?.currencyCode == record.currencyCode,
        );
        return record.exchangeRate === "Auto" ? (
          <div>
            <Text>Auto</Text>
            {autoRate && (
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
      title: "Action",
      dataIndex: "action",
      key: "action",
      width: "30%",
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => handleEdit(record.key)}>Edit</Button>
          <Button onClick={() => handleDelete(record.key)}>Delete</Button>
        </Space>
      ),
    },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (originalData) {
      // 检查 originalData 是否定义
      if (value) {
        const filtered = originalData.filter(
          (data) =>
            data.currency.toLowerCase().includes(value.toLowerCase()) ||
            data.currencyCode.toLowerCase().includes(value.toLowerCase()),
        );
        setFilteredData(filtered);
      } else {
        setFilteredData(originalData); // 恢复 originalData
      }
    }
  };

  const handleEdit = (key: number) => {
    const row = dataSource.find((item: any) => item.key === key);
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
      formData.append("deleteCurrencies", JSON.stringify([key])); // 将选中的语言作为字符串发送
      deleteFetcher.submit(formData, {
        method: "post",
        action: "/app/currency",
      }); // 提交表单请求
      // newData = dataSource.filter((item: CurrencyDataType) => item.key !== key);
      // dispatch(setTableData(newData)); // 更新表格数据
    } else {
      formData.append("deleteCurrencies", JSON.stringify(selectedRowKeys)); // 将选中的语言作为字符串发送
      deleteFetcher.submit(formData, {
        method: "post",
        action: "/app/currency",
      }); // 提交表单请求
      // newData = dataSource.filter(
      //   (item: CurrencyDataType) => !selectedRowKeys.includes(item.key),
      // );
      // dispatch(setTableData(newData)); // 更新表格数据
    }
    setDeleteLoading(true);
  };

  return (
    <Page>
      <TitleBar title="Currency"></TitleBar>
      {loading ? (
        <div>loading...</div>
      ) : (
        <div>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <SwitcherSettingCard
              settingUrl={settingUrl}
              moneyFormatHtml={moneyFormatHtml}
              moneyWithCurrencyFormatHtml={moneyWithCurrencyFormatHtml}
              shop={shop}
              ciwiSwitcherId={ciwiSwitcherId}
              isEnable={switcherEnableCardOpen}
            />

            <div className="currency-header">
              <Title style={{ fontSize: "1.25rem", display: "inline" }}>
                Currency
              </Title>
              <div className="currency-action">
                <Space>
                  {hasSelected
                    ? `Selected ${selectedRowKeys.length} items`
                    : null}
                  <Button
                    type="primary"
                    onClick={() => handleDelete()}
                    disabled={!hasSelected}
                    loading={deleteloading}
                  >
                    Delete
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => setIsAddCurrencyModalOpen(true)}
                  >
                    Add Currency
                  </Button>
                </Space>
              </div>
            </div>
            <div>
              <Text type="secondary">Your store’s default currency: </Text>
              <Text strong> {defaultCurrencyCode}</Text>
            </div>
            <Flex gap="middle" vertical>
              <Flex align="center" gap="middle">
                <Text>
                  After setting, you can{" "}
                  <Link url={userShop} target="_blank">
                    Preview
                  </Link>{" "}
                  to view the prices in different currencies.
                </Text>
              </Flex>
              <Input
                placeholder="Search currencies..."
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={handleSearch}
                style={{ marginBottom: 16 }}
              />
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={filteredData}
                loading={deleteloading}
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
        </div>
      )}
    </Page>
  );
};

export default Index;
