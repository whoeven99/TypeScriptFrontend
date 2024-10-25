import { useEffect, useState } from "react";
import { Input, InputNumber, Modal, Select, Space, Typography } from "antd";
import { SubmitFunction } from "@remix-run/react";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { CurrencyDataType } from "~/routes/app.currency/route";

const { Title, Text } = Typography;

interface CurrencyEditModalProps {
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  // allCurrencies: AllLanguagesType[];
  submit: SubmitFunction;
  exRateColumns: (BaseOptionType | DefaultOptionType)[];
  roundingColumns: (BaseOptionType | DefaultOptionType)[];
  selectedRow: CurrencyDataType | undefined;
}

const CurrencyEditModal: React.FC<CurrencyEditModalProps> = ({
  isVisible,
  setIsModalOpen,
  submit,
  exRateColumns,
  roundingColumns,
  selectedRow,
}) => {
  const [exRateSelectValue, setExRateSelectValue] = useState<string>();
  const [roundingSelectValue, setRoundingSelectValue] = useState<string>();
  const [exRateValue, setExRateValue] = useState<number | null>();
  const title = `Edit ${selectedRow?.currency}`;
  console.log(selectedRow);

  useEffect(() => {
    if (selectedRow?.exchangeRate === "Auto") {
      setExRateSelectValue("Auto");
    } else {
      setExRateSelectValue("Manual Rate");
      setExRateValue(Number(selectedRow?.exchangeRate));
    }
    setRoundingSelectValue(selectedRow?.rounding);
  }, [isVisible]);

  const handleConfirm = () => {
    if (exRateSelectValue === "Auto") {
      const okdata = {
        id: selectedRow?.key,
        rounding: roundingSelectValue,
        exchangeRate: "Auto",
      };
      const formData = new FormData();
      formData.append("updatecurrencies", JSON.stringify(okdata)); // 将选中的语言作为字符串发送

      submit(formData, {
        method: "post",
        action: "/app/currency",
      }); // 提交表单请求
    } else {
      const okdata = {
        id: selectedRow?.key,
        rounding: roundingSelectValue,
        exchangeRate: exRateValue,
      };
      const formData = new FormData();
      formData.append("updatecurrencies", JSON.stringify(okdata)); // 将选中的语言作为字符串发送

      submit(formData, {
        method: "post",
        action: "/app/currency",
      }); // 提交表单请求
    }

    setIsModalOpen(false); // 关闭Modal
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // 关闭Modal
  };

  const handleExRateSelectChange = (value: string) => {
    setExRateSelectValue(value);
  };

  const handleExRateChange = (value: number | null) => {
    setExRateValue(value);
  };

  const handleRoundingSelectChange = (value: string) => {
    setRoundingSelectValue(value);
  };

  return (
    <Modal
      title={title}
      open={isVisible}
      onCancel={handleCloseModal}
      onOk={() => handleConfirm()} // 确定按钮绑定确认逻辑
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
            defaultValue={selectedRow?.exchangeRate.toString()}
            value={exRateSelectValue}
            style={{ width: "100%" }}
            options={exRateColumns}
            onChange={handleExRateSelectChange}
          />
          {exRateSelectValue === "Auto" ? (
            <Text>Australian dollar will fluctuate based on market rates.</Text>
          ) : (
            <Space className="manual_rate_input">
              <Text>1 EUR =</Text>
              <InputNumber
                defaultValue={Number(selectedRow?.exchangeRate)}
                style={{ width: 120 }}
                min={0}
                value={exRateValue}
                onChange={handleExRateChange}
              />
              <span>{selectedRow?.currencyCode}</span>
            </Space>
          )}
        </div>
        <div>
          <Title level={5}>Rounding</Title>
          <Select
            defaultValue={selectedRow?.rounding}
            value={roundingSelectValue}
            style={{ width: "100%" }}
            options={roundingColumns}
            onChange={handleRoundingSelectChange}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default CurrencyEditModal;
