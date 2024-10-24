import { useState } from "react";
import { Input, Modal, Select, Space, Typography } from "antd";
import { SubmitFunction } from "@remix-run/react";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import "../styles.css";
import { CurrencyDataType } from "~/routes/app.currency/route";

const { Title, Text } = Typography;

interface CurrencyEditModalProps {
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  // allCurrencies: AllLanguagesType[];
  submit: SubmitFunction;
  exRateColumns: (BaseOptionType | DefaultOptionType)[];
  roundingColumns: (BaseOptionType | DefaultOptionType)[];
  selectedRow: CurrencyDataType | undefined ;
}

const CurrencyEditModal: React.FC<CurrencyEditModalProps> = ({
  isVisible,
  setIsModalOpen,
  submit,
  exRateColumns,
  roundingColumns,
  selectedRow,
}) => {
  const [exRateSelectValue, setExRateSelectValue] = useState("auto");
  const title = `Edit ${selectedRow?.currency}`

  const handleCloseModal = () => {
    // setAllSelectedKeys([]); // 清除已选中的语言
    // setSearchInput(""); // 清除搜索框内容
    // setFilteredCurrencies(Currencies); // 重置为初始语言列表
    // setAllSelectedCurrency([]); // 清除已选中的语言对象

    setIsModalOpen(false); // 关闭Modal
  };

  const handleSelectChange = (value: string) => {
    setExRateSelectValue(value);
  };

  return (
    <Modal
      title={title}
      open={isVisible}
      onCancel={handleCloseModal}
      //   onOk={() => handleConfirm()} // 确定按钮绑定确认逻辑
      okText="Confirm"
      cancelText="Cancel"
      style={{
        top: "40%",
      }}
    >
      <Space direction="vertical" size="small" style={{ display: "flex" }}>
        <div>
          <Title level={5}>Exchange rate</Title>
          <Select
            defaultValue="Auto"
            value={selectedRow?.exRate}
            style={{ width: "100%" }}
            options={exRateColumns}
            onChange={handleSelectChange}
          />
          {exRateSelectValue === "auto" ? (
            <Text>Australian dollar will fluctuate based on market rates.</Text>
          ) : (
            <Space className="manual_rate_input">
              <Text>1 EUR =</Text>
              <Input defaultValue={0.617} style={{ width: 120 }} min={0} />
              <span>{selectedRow?.currencyCode}</span>
            </Space>
          )}
        </div>
        <div>
          <Title level={5}>Rounding</Title>
          <Select
            defaultValue="Disable"
            value={selectedRow?.rounding}
            style={{ width: "100%" }}
            options={roundingColumns}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default CurrencyEditModal;
