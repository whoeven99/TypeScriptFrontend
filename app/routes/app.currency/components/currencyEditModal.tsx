import { useEffect, useState } from "react";
import {
  Button,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { useFetcher } from "@remix-run/react";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { CurrencyDataType } from "../route";
import { useDispatch, useSelector } from "react-redux";
import { updateTableData } from "~/store/modules/currencyDataTable";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

interface CurrencyEditModalProps {
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  // allCurrencies: AllLanguagesType[];
  exRateColumns: (BaseOptionType | DefaultOptionType)[];
  roundingColumns: (BaseOptionType | DefaultOptionType)[];
  selectedRow: CurrencyDataType | undefined;
  defaultCurrencyCode: string;
}

const CurrencyEditModal: React.FC<CurrencyEditModalProps> = ({
  isVisible,
  setIsModalOpen,
  exRateColumns,
  roundingColumns,
  selectedRow,
  defaultCurrencyCode,
}) => {
  const [exRateSelectValue, setExRateSelectValue] = useState<string>();
  const [roundingSelectValue, setRoundingSelectValue] = useState<string>();
  const [exRateValue, setExRateValue] = useState<number | null>();
  const [updateFetcherLoading, setUpdateFetcherLoading] =
    useState<boolean>(false);
  const [saveButtonDisable, setSaveButtonDisable] = useState<boolean>(true);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const updateFetcher = useFetcher<any>();
  const dataSource = useSelector((state: any) => state.currencyTableData.rows);
  const title = `${t("Edit")} ${selectedRow?.currency}`;

  useEffect(() => {
    if (updateFetcher.data) {
      if (updateFetcher.data?.data.success) {
        const newData = updateFetcher.data.data.response;
        const oldData: CurrencyDataType = dataSource.find(
          (row: CurrencyDataType) => row.key === newData.id,
        );
        const data: CurrencyDataType[] = [
          {
            key: oldData.key,
            currency: oldData.currency,
            currencyCode: oldData.currencyCode,
            rounding: newData.rounding,
            exchangeRate: newData.exchangeRate,
          },
        ];
        dispatch(updateTableData(data));
        message.success(t("Saved successfully"));
        setIsModalOpen(false);
        setExRateSelectValue(undefined);
        setRoundingSelectValue(undefined);
        setExRateValue(null);
      } else {
        message.error(updateFetcher.data?.data.errorMsg);
      }
    }
    setUpdateFetcherLoading(false);
  }, [updateFetcher.data]);

  useEffect(() => {
    if (selectedRow?.exchangeRate === "Auto") {
      setExRateSelectValue("Auto");
    } else {
      setExRateSelectValue("Manual Rate");
      setExRateValue(Number(selectedRow?.exchangeRate));
    }
    setRoundingSelectValue(selectedRow?.rounding);
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      if (
        exRateSelectValue === "Manual Rate" &&
        (Number.isNaN(exRateValue) || exRateValue === null)
      ) {
        setSaveButtonDisable(true);
      } else if (
        (exRateSelectValue === "Manual Rate" &&
          !Number.isNaN(exRateValue) &&
          exRateValue !== null &&
          saveButtonDisable === true) ||
        (exRateSelectValue === "Auto" && saveButtonDisable === true)
      ) {
        setSaveButtonDisable(false);
      }
    }
  }, [exRateSelectValue, exRateValue, isVisible]);

  const handleConfirm = () => {
    if (exRateSelectValue === "Auto") {
      const okdata = {
        id: selectedRow?.key,
        rounding: roundingSelectValue,
        exchangeRate: "Auto",
      };
      const formData = new FormData();
      formData.append("updateCurrencies", JSON.stringify(okdata)); // 将选中的语言作为字符串发送

      updateFetcher.submit(formData, {
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
      formData.append("updateCurrencies", JSON.stringify(okdata)); // 将选中的语言作为字符串发送

      updateFetcher.submit(formData, {
        method: "post",
        action: "/app/currency",
      }); // 提交表单请求
    }
    setUpdateFetcherLoading(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // 关闭Modal
    setExRateSelectValue(undefined);
    setRoundingSelectValue(undefined);
    setExRateValue(null);
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
      onCancel={handleCloseModal}
      open={isVisible}
      style={{
        top: "40%",
      }}
      footer={[
        <div key={"footer_buttons"}>
          <Button
            key={"manage_cancel_button"}
            onClick={handleCloseModal}
            style={{ marginRight: "10px" }}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            key={"manage_confirm_button"}
            type="primary"
            disabled={saveButtonDisable || updateFetcherLoading}
            loading={updateFetcherLoading}
          >
            {t("Save")}
          </Button>
        </div>,
      ]}
    >
      <Space direction="vertical" size="small" style={{ display: "flex" }}>
        <div>
          <Title level={5}>{t("Exchange rate")}</Title>
          <Select
            defaultValue={selectedRow?.exchangeRate.toString()}
            value={exRateSelectValue}
            style={{ width: "100%" }}
            options={exRateColumns}
            onChange={handleExRateSelectChange}
          />
          {exRateSelectValue === "Auto" ? (
            <Text>
              {selectedRow?.currency}{t("will fluctuate based on market rates.")}.
            </Text>
          ) : (
            <Space className="manual_rate_input">
              <Text>1 {defaultCurrencyCode} =</Text>
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
          <Title level={5}>{t("Rounding")}</Title>
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
