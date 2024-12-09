import { useEffect, useState } from "react";
import { Modal, Input, Table, Space, Button, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import SelectedLanguageTag from "../../../components/selectedLanguageTag";
import { SubmitFunction, useFetcher } from "@remix-run/react";
import { useSelector } from "react-redux";
import { CurrencyDataType } from "../route";

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
  const [confirmButtonDisable, setConfirmButtonDisable] =
    useState<boolean>(false);
  const [searchInput, setSearchInput] = useState("");
  const [filteredCurrencies, setFilteredCurrencies] = useState(Currencies);
  const [allSelectedCurrency, setAllSelectedCurrency] = useState<
    CurrencyType[]
  >([]);
  const selectedCurrency: CurrencyDataType[] = useSelector(
    (state: any) => state.currencyTableData.rows,
  );
  const selectedCurrenciesSet = new Set(
    selectedCurrency.map((cur) => cur.currencyCode),
  );
  const addFetcher = useFetcher<any>();

  useEffect(() => {
    if (addFetcher.data) {
      addFetcher.data.data.map((res: any) => {
        if (res.value.success) {
          message.success("Add success");
        } else {
          message.error(res.value.errorMsg);
        }
      });
    }
  }, [addFetcher.data]);

  useEffect(() => {
    console.log(allSelectedCurrency);
  }, [allSelectedCurrency]);

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
    setConfirmButtonDisable(true); // 选择后关闭Modal
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
      title="Select Languages"
      open={isVisible}
      onCancel={handleCloseModal}
      footer={[
        <div key={"footer_buttons"}>
          <Button
            key={"manage_cancel_button"}
            onClick={handleCloseModal}
            style={{ marginRight: "10px" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            key={"manage_confirm_button"}
            type="primary"
            disabled={confirmButtonDisable}
            loading={confirmButtonDisable}
          >
            Add
          </Button>
        </div>,
      ]}
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
          const currency = Currencies.find((cur) => cur.key === key)?.currency;
          return (
            <SelectedLanguageTag
              key={key}
              item={currency!}
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
