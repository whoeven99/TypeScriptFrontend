import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Button, Flex, Input, Space, Table, Typography } from "antd";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useSubmit } from "@remix-run/react";
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
import { queryShop } from "~/api/admin";
import {
  addCurrency,
  DeleteCurrency,
  GetCurrency,
  UpdateCurrency,
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
  rounding: string;
  exchangeRate: string | number;
  currencyCode: string;
}

interface CurrencyType {
  key: number;
  currencyCode: string;
  currency: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const adminAuthResult = await authenticate.admin(request);
    const { shop } = adminAuthResult.session;

    // 返回包含 userId 的 json 响应
    return json({
      shop,
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
    const formData = await request.formData();

    const loading = JSON.parse(formData.get("loading") as string);
    const addCurrencies: CurrencyType[] = JSON.parse(
      formData.get("addCurrencies") as string,
    );
    const deleteCurrencies: number[] = JSON.parse(
      formData.get("deleteCurrencies") as string,
    );
    const updateCurrencies = JSON.parse(
      formData.get("updateCurrencies") as string,
    );

    switch (true) {
      case !!loading:
        try {
          const shopLoad = await queryShop({ request });
          const currencyList = await GetCurrency({ request });
          const finalCurrencyList =
            currencyList === undefined ? [] : currencyList;
          console.log("finalCurrencyList: ", finalCurrencyList);
          const moneyFormat = shopLoad.currencyFormats.moneyFormat;
          const moneyWithCurrencyFormat =
            shopLoad.currencyFormats.moneyWithCurrencyFormat;
          return json({
            defaultCurrencyCode: shopLoad.currencyCode,
            currencyList: finalCurrencyList,
            moneyFormat,
            moneyWithCurrencyFormat,
          });
        } catch (error) {
          console.error("Error loading currency:", error);
          return json({ error: "Error loading currency" }, { status: 500 });
        }
      case !!addCurrencies:
        try {
          console.log("addCurrencies: ", addCurrencies);
          console.log("type: ", typeof addCurrencies);

          const promises = addCurrencies.map((currency) => {
            return addCurrency({
              request,
              countryName: currency.currency,
              currencyCode: currency.currencyCode,
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
          console.error("Error addCurrency:", error);
          return json({ error: "Error addCurrency" }, { status: 500 });
        }
      case !!deleteCurrencies:
        await Promise.all(
          deleteCurrencies.map(async (currency) => {
            // 调用 addCurrency 函数
            await DeleteCurrency({
              request,
              id: currency,
            });
          }),
        );
      case !!updateCurrencies:
        await UpdateCurrency({
          request,
          updateCurrencies: updateCurrencies,
        });
    }
    return null;
  } catch (error) {
    console.error("Error action currency:", error);
    return json({ error: "Error action currency" }, { status: 500 });
  }
};

const Index = () => {
  const { shop } =
    useLoaderData<typeof loader>();

  const settingUrl = `https://admin.shopify.com/store/${shop.split(".")[0]}/settings/general`;
  const [loading, setLoading] = useState<boolean>(true);
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>(
    "No defaultCurrencyCode set",
  );
  const [searchInput, setSearchInput] = useState("");
  const [deleteloading, setDeleteLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [isCurrencyEditModalOpen, setIsCurrencyEditModalOpen] = useState(false);
  const [moneyFormatHtml, setMoneyFormatHtml] = useState<string | null>("");
  const [moneyWithCurrencyFormatHtml, setMoneyWithCurrencyFormatHtml] =
    useState<string | null>("");
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
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const loadingFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();

  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app/currency",
    });
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      setDefaultCurrencyCode(loadingFetcher.data.defaultCurrencyCode);
      console.log("currencyList: ", loadingFetcher.data.currencyList);
      
      setOriginalData(loadingFetcher.data.currencyList);
      setFilteredData(loadingFetcher.data.currencyList); // 用加载的数据初始化 filteredData
      dispatch(setTableData(loadingFetcher.data.currencyList));
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
    }
  }, [loadingFetcher.data]);

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
    { value: "Disable", label: "Disable" },
    { value: "No decimal", label: "No decimal" },
    { value: "1", label: "1 (Recommend)" },
    { value: "0.99", label: "0.99" },
    { value: "0.95", label: "0.95" },
    { value: "0.75", label: "0.75" },
    { value: "0.5", label: "0.5" },
    { value: "0.25", label: "0.25" },
  ];

  const columns: ColumnsType<any> = [
    {
      title: "Currency",
      dataIndex: "currencyCode",
      key: "currencyCode",
    },
    {
      title: "Rounding",
      dataIndex: "rounding",
      key: "rounding",
    },
    {
      title: "Exchange rate",
      dataIndex: "exchangeRate",
      key: "exchangeRate",
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => handleEdit(record.key)}>Edit</Button>
          <Button onClick={() => handleDelete(record.key)}>Remove</Button>
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
        const filtered = originalData.filter((data) =>
          data.currency.toLowerCase().includes(value.toLowerCase()),
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
    let newData: CurrencyDataType[] | undefined;
    if (key) {
      formData.append("deleteCurrencies", JSON.stringify(key)); // 将选中的语言作为字符串发送
      deleteFetcher.submit(formData, {
        method: "post",
        action: "/app/currency",
      }); // 提交表单请求
      newData = dataSource.filter((item: CurrencyDataType) => item.key !== key);
      dispatch(setTableData(newData)); // 更新表格数据
    } else {
      formData.append("deleteCurrencies", JSON.stringify(selectedRowKeys)); // 将选中的语言作为字符串发送
      deleteFetcher.submit(formData, {
        method: "post",
        action: "/app/currency",
      }); // 提交表单请求
      newData = dataSource.filter(
        (item: CurrencyDataType) => !selectedRowKeys.includes(item.key),
      );
      dispatch(setTableData(newData)); // 更新表格数据
    }
    setSelectedRowKeys([]); // 清空已选中项
    setOriginalData(newData);
    setFilteredData(newData); // 确保当前显示的数据也更新
  };

  const PreviewClick = () => {
    const shopUrl = `https://${shop}`;
    window.open(shopUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Page>
      <TitleBar title="Currency">
        <button
          variant="primary"
          onClick={() => setIsAddCurrencyModalOpen(true)}
        >
          Add Currency
        </button>
      </TitleBar>
      {loading ? (
        <div>loading...</div>
      ) : (
        <div>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <SwitcherSettingCard
              settingUrl={settingUrl}
              moneyFormatHtml={moneyFormatHtml}
              moneyWithCurrencyFormatHtml={moneyWithCurrencyFormatHtml}
            />
            <div className="currency-header">
              <Title style={{ fontSize: "1.25rem", display: "inline" }}>
                Currency
              </Title>
              <div className="currency-action">
                <Space>
                  <Button type="primary" onClick={PreviewClick}>
                    Preview Store
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
                <Button
                  type="primary"
                  onClick={() => handleDelete()}
                  disabled={!hasSelected}
                  loading={deleteloading}
                >
                  Delete
                </Button>
                {hasSelected
                  ? `Selected ${selectedRowKeys.length} items`
                  : null}
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
              />
            </Flex>
          </Space>

          <AddCurrencyModal
            isVisible={isAddCurrencyModalOpen}
            setIsModalOpen={setIsAddCurrencyModalOpen}
            submit={submit}
          />
          <CurrencyEditModal
            isVisible={isCurrencyEditModalOpen}
            setIsModalOpen={setIsCurrencyEditModalOpen}
            roundingColumns={roundingColumns}
            exRateColumns={exRateColumns}
            selectedRow={selectedRow}
            submit={submit}
          />
        </div>
      )}
    </Page>
  );
};

export default Index;