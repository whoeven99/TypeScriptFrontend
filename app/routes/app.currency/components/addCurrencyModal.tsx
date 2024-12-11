import { useEffect, useState } from "react";
import { Modal, Input, Table, Space, Button, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import SelectedTag from "../../../components/selectedTag";
import { SubmitFunction, useFetcher } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { CurrencyDataType } from "../route";
import { updateTableData } from "~/store/modules/currencyDataTable";

interface CurrencyType {
  key: number;
  currencyCode: string;
  currency: string;
}

interface AddCurrencyModalProps {
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  // allCurrencies: AllCurrenciesType[];
  defaultCurrencyCode: string;
}

const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  isVisible,
  setIsModalOpen,
  defaultCurrencyCode,
}) => {
  const addCurrencies: CurrencyType[] = [
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
  const [filteredCurrencies, setFilteredCurrencies] = useState(addCurrencies);
  const [allSelectedCurrency, setAllSelectedCurrency] = useState<
    CurrencyType[]
  >([]);
  const selectedCurrency: CurrencyDataType[] = useSelector(
    (state: any) => state.currencyTableData.rows,
  );
  const selectedCurrenciesSet = new Set(
    selectedCurrency.map((cur) => cur.currencyCode),
  );
  const dispatch = useDispatch();
  const addFetcher = useFetcher<any>();

  useEffect(() => {
    if (addFetcher.data) {
      addFetcher.data.data.map((res: any) => {
        if (res.value.success) {
          const data = [
            {
              key: res.value.response.id, // 将 id 转换为 key
              currency: res.value.response.countryName, // 将 countryName 作为 currency
              rounding: res.value.response.rounding,
              exchangeRate: res.value.response.exchangeRate,
              currencyCode: res.value.response.currencyCode,
            },
          ];
          dispatch(updateTableData(data));
          message.success("Add success");
          setAllSelectedKeys([]);
          setSearchInput("");
          setFilteredCurrencies(addCurrencies);
          setAllSelectedCurrency([]);
          setIsModalOpen(false);
        } else {
          setConfirmButtonDisable(false);
          message.error(res.value.errorMsg);
        }
      });
    }
  }, [addFetcher.data]);

  useEffect(() => {
    // 更新语言状态
    const updatedCurrencies = addCurrencies.map((cur) => {
      if (selectedCurrenciesSet.has(cur.currencyCode)) {
        // 检查是否是默认语言
        const isPrimary = cur.currencyCode === defaultCurrencyCode;

        return { ...cur, state: isPrimary ? "Primary" : "Added" }; // 根据 primary 设置状态
      }
      return { ...cur, state: "" }; // 其他语言的默认状态
    });

    // 根据状态排序
    const sortedFilteredCurrencies = updatedCurrencies.sort((a, b) => {
      const aSelected = selectedCurrenciesSet.has(a.currencyCode) ? 1 : -1; // 将已选语言放前面
      const bSelected = selectedCurrenciesSet.has(b.currencyCode) ? 1 : -1;
      return aSelected - bSelected;
    });

    // 更新过滤后的语言状态
    setFilteredCurrencies(sortedFilteredCurrencies);
  }, [selectedCurrency, isVisible]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (value.trim() === "") {
      // 当搜索框为空时，恢复初始排序
      const updatedCurrencies = addCurrencies.map((cur) => {
        const isPrimary = selectedCurrency.some(
          (sl) => sl.currencyCode === defaultCurrencyCode,
        );
        const state = selectedCurrenciesSet.has(cur.currencyCode)
          ? isPrimary
            ? "Primary"
            : "Added"
          : ""; // 更新语言状态
        return { ...cur, state };
      });

      const sortedFilteredCurrencies = updatedCurrencies.sort((a, b) => {
        const aSelected = selectedCurrenciesSet.has(a.currencyCode) ? 1 : -1;
        const bSelected = selectedCurrenciesSet.has(b.currencyCode) ? 1 : -1;
        return aSelected - bSelected;
      });

      setFilteredCurrencies(sortedFilteredCurrencies);
      return;
    }
    const filteredData = addCurrencies.filter((cur) =>
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
      .map((key) => addCurrencies.find((cur) => cur.key === key))
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
    formData.append("addCurrencies", JSON.stringify(allSelectedCurrency)); // 将选中的语言作为字符串发送

    addFetcher.submit(formData, {
      method: "post",
      action: "/app/currency",
    }); // 提交表单请求
    setAllSelectedKeys([]); // 清除已选中的语言
    setSearchInput(""); // 清除搜索框内容
    setAllSelectedCurrency([]); // 清除已选中的语言对象
    setConfirmButtonDisable(true);
  };

  const handleCloseModal = () => {
    setAllSelectedKeys([]);
    setSearchInput("");
    setFilteredCurrencies(addCurrencies);
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

  // 表格的行选择配置
  const rowSelection = {
    selectedRowKeys: allSelectedKeys.filter((key) =>
      filteredCurrencies.some((cur) => cur.key === key),
    ), // Filter selected keys based on current filtered languages
    onChange: handleRowSelectionChange,
    getCheckboxProps: (record: any) => ({
      disabled: selectedCurrenciesSet.has(record.currencyCode), // Disable checkbox if the language is already selected
    }),
  };

  const columns = [
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
      width: "20%",
    },
    {
      title: "Relevant region(s)",
      dataIndex: "src",
      key: "src",
      width: "60%",
      // render: (_: any, record: any) => {
      //   return (
      //     <div
      //       style={{
      //         display: "flex",
      //         flexWrap: "wrap",
      //         justifyContent: "left",
      //         alignItems: "left",
      //         gap: "10px",
      //       }}
      //     >
      //       {record.src?.map((url: string, index: number) => (
      //         <img
      //           key={index} // 为每个 img 标签添加唯一的 key 属性
      //           src={url}
      //           alt={`${record.name} flag`}
      //           style={{
      //             width: "30px",
      //             height: "auto",
      //             border: "1px solid #888",
      //             borderRadius: "2px",
      //           }}
      //         />
      //       ))}
      //     </div>
      //   );
      // },
    },
    {
      title: "Status",
      dataIndex: "state",
      key: "state",
      width: "20%",
    },
  ];

  return (
    <Modal
      width={1000}
      title="Select Currencies"
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
          const currency = addCurrencies.find(
            (cur) => cur.key === key,
          )?.currency;
          return (
            <SelectedTag
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
        loading={confirmButtonDisable}
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
