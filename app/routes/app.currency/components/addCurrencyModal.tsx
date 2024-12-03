import { useState } from "react";
import { Modal, Input, Table, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import SelectedLanguageTag from "../../../components/selectedLanguageTag";
import { SubmitFunction, useFetcher } from "@remix-run/react";

interface CurrencyType {
  key: number;
  currencyCode: string;
  currency: string;
}

interface AddCurrencyModalProps {
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  // allCurrencies: AllLanguagesType[];
  submit: SubmitFunction;
}

const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  isVisible,
  setIsModalOpen,
  submit,
}) => {
  const Currencies: CurrencyType[] = [
    { key: 0, currencyCode: "USD", currency: "United States Dollar" },
    { key: 1, currencyCode: "EUR", currency: "Euro" },
    { key: 2, currencyCode: "GBP", currency: "British Pound Sterling" },
    { key: 3, currencyCode: "JPY", currency: "Japanese Yen" },
    { key: 4, currencyCode: "AUD", currency: "Australian Dollar" },
    { key: 5, currencyCode: "CAD", currency: "Canadian Dollar" },
    { key: 6, currencyCode: "CHF", currency: "Swiss Franc" },
    { key: 7, currencyCode: "CNY", currency: "Chinese Yuan" },
    { key: 8, currencyCode: "SEK", currency: "Swedish Krona" },
    { key: 9, currencyCode: "NZD", currency: "New Zealand Dollar" },
  ];
  const [allSelectedKeys, setAllSelectedKeys] = useState<React.Key[]>([]); // 保存所有选中的key
  const [searchInput, setSearchInput] = useState("");
  const [filteredCurrencies, setFilteredCurrencies] = useState(Currencies);
  const [allSelectedCurrency, setAllSelectedCurrency] = useState<
    CurrencyType[]
  >([]);
  const addFetcher = useFetcher();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    const filteredData = Currencies.filter((cur) =>
      cur.currency.toLowerCase().includes(value.toLowerCase()),
    );
    setFilteredCurrencies(filteredData);
  };

  const handleRowSelectionChange = (newSelectedRowKeys: React.Key[]) => {
    const addedKeys = newSelectedRowKeys.filter(
      (key) => !allSelectedKeys.includes(key),
    );
    const removedKeys = allSelectedKeys.filter(
      (key) => !newSelectedRowKeys.includes(key),
    );

    const addedCurrencies = addedKeys
      .map((key) => Currencies.find((cur) => cur.key === key))
      .filter(Boolean) as CurrencyType[];

    const updatedSelectedCurrencies = allSelectedCurrency.filter(
      (cur) => !removedKeys.includes(cur.key),
    );

    setAllSelectedCurrency([...updatedSelectedCurrencies, ...addedCurrencies]);
    setAllSelectedKeys(newSelectedRowKeys);
  };

  // 确认选择 -> 触发 action
  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("addcurrencies", JSON.stringify(allSelectedCurrency)); // 将选中的语言作为字符串发送

    addFetcher.submit(formData, {
      method: "post",
      action: "/app/currency",
    }); // 提交表单请求
    setIsModalOpen(false); // 选择后关闭Modal
  };

  const handleCloseModal = () => {
    setAllSelectedKeys([]);
    setSearchInput("");
    setFilteredCurrencies(Currencies);
    setAllSelectedCurrency([]);
    setIsModalOpen(false);
  };

  const handleRemoveCurrency = (key: React.Key) => {
    setAllSelectedKeys((prevKeys) =>
      prevKeys.filter((selectedKey) => selectedKey !== key),
    );
    setAllSelectedCurrency((prevCurrencies) =>
      prevCurrencies.filter((cur) => cur.key !== key),
    );
  };

  const rowSelection = {
    selectedRowKeys: allSelectedKeys.filter((key) =>
      filteredCurrencies.some((cur) => cur.key === key),
    ),
    onChange: handleRowSelectionChange,
  };

  const columns = [
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
    },
  ];

  return (
    <Modal
      title="Add currency"
      open={isVisible}
      onCancel={handleCloseModal}
      onOk={() => handleConfirm()} // 确定按钮绑定确认逻辑
      okText="Confirm"
      cancelText="Cancel"
    >
      <Input
        placeholder="Search languages..."
        prefix={<SearchOutlined />}
        value={searchInput}
        onChange={handleSearch}
        style={{ marginBottom: 16 }}
      />

      <Space wrap style={{ marginBottom: 16 }}>
        {allSelectedKeys.map((key) => {
          const language = Currencies.find((cur) => cur.key === key)?.currency;
          return (
            <SelectedLanguageTag
              key={key}
              language={language!}
              onRemove={() => handleRemoveCurrency(key)}
            />
          );
        })}
      </Space>

      <Table
        rowSelection={rowSelection}
        dataSource={filteredCurrencies}
        columns={columns}
        rowKey="key"
        pagination={{
          pageSize: 10,
          position: ["bottomCenter"],
          showSizeChanger: false,
        }}
      />
    </Modal>
  );
};

export default AddCurrencyModal;
