import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Button, Flex, Input, Space, Table, Typography } from "antd";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useEffect, useState } from "react";
// import { SearchOutlined } from "@ant-design/icons"
import "./styles.css";
import { ColumnsType } from "antd/es/table";
import { TableRowSelection } from "antd/es/table/interface";
// import { updateUserInfo } from "~/api/serve";
import { useDispatch, useSelector } from "react-redux";
import { setTableData } from "~/store/modules/currencyTableData";
import { SearchOutlined } from "@ant-design/icons";
import Mock from "mockjs";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { queryShop } from "~/api/admin";
import AddCurrencyModal from "./components/addCurrencyModal";
import CurrencyEditModal from "./components/currencyEditModal";
import SwitcherSettingCard from "./components/switcherSettingCard";

const { Title, Text, Paragraph } = Typography;

export interface CurrencyDataType {
  key: React.Key;
  currency: string;
  rounding: string;
  exRate: string;
  currencyCode: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // 调用 authenticate 并获取认证结果
    // try {
    //   // 登录成功后调用 updateUserInfo 更新用户信息
    //   await updateUserInfo(request);
    // } catch (error) {
    //   console.error("Error updating user info:", error);
    // }
    const shop = await queryShop(request);
    const shopName = shop.name;

    const moneyFormat = shop.currencyFormats.moneyFormat;

    const moneyWithCurrencyFormat =
      shop.currencyFormats.moneyWithCurrencyFormat;

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

    const data: CurrencyDataType[] = Mock.mock({
      "data|10": [
        {
          "key|+1": 1,
          currency: "@WORD",
          rounding:
            "@pick(" +
            JSON.stringify(roundingColumns.map((item) => item.value)) +
            ")",
          exRate:
            "@pick(" +
            JSON.stringify(exRateColumns.map((item) => item.value)) +
            ")",
          currencyCode: "@WORD",
        },
      ],
    }).data;

    // 返回包含 userId 的 json 响应
    return json({
      shopName,
      roundingColumns,
      exRateColumns,
      data,
      moneyFormat,
      moneyWithCurrencyFormat,
    });
  } catch (error) {
    // 打印错误信息，方便调试
    console.error("Error during authentication:", error);

    // 返回带有错误信息的 500 响应
    return new Response("Internal Server Error", { status: 500 });
  }
};

const Index = () => {
  const {
    shopName,
    roundingColumns,
    exRateColumns,
    data,
    moneyFormat,
    moneyWithCurrencyFormat,
  } = useLoaderData<typeof loader>();
  const settingUrl = `https://admin.shopify.com/store/${shopName}/settings/general`;
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
  console.log(dataSource);

  const [originalData, setOriginalData] = useState<CurrencyDataType[]>();
  // 当前显示的数据源
  const [filteredData, setFilteredData] =
    useState<CurrencyDataType[]>(dataSource);
  console.log(filteredData);

  const dispatch = useDispatch();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    const parser = new DOMParser();
    const parsedMoneyFormat = parser.parseFromString(moneyFormat, "text/html")
      .documentElement.textContent;
    const parsedMoneyWithCurrencyFormat = parser.parseFromString(
      moneyWithCurrencyFormat,
      "text/html",
    ).documentElement.textContent;

    setMoneyFormatHtml(parsedMoneyFormat);
    setMoneyWithCurrencyFormatHtml(parsedMoneyWithCurrencyFormat);
  }, [moneyFormat, moneyWithCurrencyFormat]);

  useEffect(() => {
    setOriginalData(data);
    setFilteredData(data); // 用加载的数据初始化 filteredData

    dispatch(setTableData(data));
  }, [data, dispatch]);

  const hasSelected = selectedRowKeys.length > 0;

  const columns: ColumnsType<any> = [
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
    },
    {
      title: "Rounding",
      dataIndex: "rounding",
      key: "rounding",
    },
    {
      title: "Exchange rate",
      dataIndex: "exRate",
      key: "exRate",
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => handleEdit(record.key)}>Edit</Button>
          <Button>Remove</Button>
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
    console.log("selectedRowKeys changed: ", newSelectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<CurrencyDataType> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handleDelete = () => {
    const newData = dataSource.filter(
      (item: CurrencyDataType) => !selectedRowKeys.includes(item.key),
    );

    dispatch(setTableData(newData)); // 更新表格数据
    setSelectedRowKeys([]); // 清空已选中项
    setOriginalData(newData);
    setFilteredData(newData); // 确保当前显示的数据也更新
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
              <Button type="default">Cart notification</Button>
              <Button type="primary">Preview Store</Button>
            </Space>
          </div>
        </div>
        <Text type="secondary">Your store’s default currency:</Text>
        <Flex gap="middle" vertical>
          <Flex align="center" gap="middle">
            <Button
              type="primary"
              onClick={handleDelete}
              disabled={!hasSelected}
              loading={deleteloading}
            >
              Delete
            </Button>
            {hasSelected ? `Selected ${selectedRowKeys.length} items` : null}
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
    </Page>
  );
};

export default Index;
