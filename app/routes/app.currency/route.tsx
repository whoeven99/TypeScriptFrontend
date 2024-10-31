import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Button, Flex, Input, Space, Table, Typography } from "antd";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
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
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { queryShop } from "~/api/admin";
import AddCurrencyModal from "./components/addCurrencyModal";
import CurrencyEditModal from "./components/currencyEditModal";
import SwitcherSettingCard from "./components/switcherSettingCard";
import {
  addCurrency,
  DeleteCurrency,
  GetCurrency,
  UpdateCurrency,
} from "~/api/serve";

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
    // 调用 authenticate 并获取认证结果
    // try {
    //   // 登录成功后调用 updateUserInfo 更新用户信息
    //   await updateUserInfo(request);
    // } catch (error) {
    //   console.error("Error updating user info:", error);
    // }
    const shop = await queryShop(request);
    const currencyList = await GetCurrency({ request });
    const shopDomain = shop.myshopifyDomain;
    const moneyFormat = shop.currencyFormats.moneyFormat;
    const moneyWithCurrencyFormat =
      shop.currencyFormats.moneyWithCurrencyFormat;

      

    // 返回包含 userId 的 json 响应
    return json({
      shopDomain,
      currencyList,
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

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const addCurrencies: CurrencyType[] = JSON.parse(
      formData.get("addcurrencies") as string,
    );
    const deleteCurrencies: string[] = JSON.parse(
      formData.get("deletecurrencies") as string,
    );
    const deleteCurrency: string = JSON.parse(
      formData.get("deletecurrency") as string,
    );
    const updateCurrencies = JSON.parse(
      formData.get("updatecurrencies") as string,
    );

    if (addCurrencies) {
      await Promise.all(
        addCurrencies.map(async (currency) => {
          // 调用 addCurrency 函数
          await addCurrency({
            request,
            countryName: currency.currency,
            currencyCode: currency.currencyCode,
          });
        }),
      );
    }

    if (deleteCurrencies) {
      await Promise.all(
        deleteCurrencies.map(async (currency) => {
          // 调用 addCurrency 函数
          await DeleteCurrency({
            request,
            id: currency,
          });
        }),
      );
    }

    if (deleteCurrency) {
      // 调用 addCurrency 函数
      await DeleteCurrency({
        request,
        id: deleteCurrency,
      });
    }

    if (updateCurrencies) {
      await UpdateCurrency({
        request,
        updateCurrencies: updateCurrencies,
      });
    }

    return null;
  } catch (error) {
    console.error("Error action language:", error);
    return json({ error: "Error action language" }, { status: 500 });
  }
};

const Index = () => {
  const { shopDomain, currencyList, moneyFormat, moneyWithCurrencyFormat } =
    useLoaderData<typeof loader>();
  const shop = extractShopName(shopDomain);

  const settingUrl = `https://admin.shopify.com/store/${shop}/settings/general`;
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

  const [originalData, setOriginalData] = useState<CurrencyDataType[]>();
  // 当前显示的数据源
  const [filteredData, setFilteredData] =
    useState<CurrencyDataType[]>(dataSource);

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
    setOriginalData(currencyList);
    setFilteredData(currencyList); // 用加载的数据初始化 filteredData

    dispatch(setTableData(currencyList));
  }, [currencyList, dispatch]);

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

  function extractShopName(shopDomain: string) {
    // 正则表达式匹配 quickstart-0f992326.myshopify.com 格式
    const regex = /^(.*?)\.myshopify\.com$/;

    const match = shopDomain.match(regex);

    if (match) {
      // 提取 shop name
      return match[1]; // 返回 quickstart-0f992326
    } else {
      throw new Error("Invalid shopDomain format");
    }
  }

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

  const handleDelete = (key: React.Key) => {
    const formData = new FormData();
    formData.append("deletecurrency", JSON.stringify(key)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/currency",
    }); // 提交表单请求

    // 过滤掉被删除的项
    const newData = dataSource.filter(
      (item: CurrencyDataType) => item.key !== key,
    );
    dispatch(setTableData(newData)); // 更新表格数据
    setSelectedRowKeys([]); // 清空已选中项
    setOriginalData(newData);
    setFilteredData(newData); // 确保当前显示的数据也更新
  };

  const handleAllDelete = () => {
    const formData = new FormData();
    formData.append("deletecurrencies", JSON.stringify(selectedRowKeys)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/currency",
    }); // 提交表单请求

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
              onClick={handleAllDelete}
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
