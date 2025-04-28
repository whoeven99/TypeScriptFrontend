import { useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  InputNumber,
  InputRef,
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
  const [exRateValue, setExRateValue] = useState<number>(0);
  const [updateFetcherLoading, setUpdateFetcherLoading] =
    useState<boolean>(false);
  const [saveButtonDisable, setSaveButtonDisable] = useState<boolean>(true);
  const [exRateError, setExRateError] = useState<boolean>(false);
  const [exRateErrorMsg, setExRateErrorMsg] = useState<string>("");
  const [exRateStatus, setExRateStatus] = useState<"warning" | "error" | "">("");
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
        shopify.toast.show(t("Saved successfully"));
        setIsModalOpen(false);
        setExRateSelectValue(undefined);
        setRoundingSelectValue(undefined);
        setExRateValue(0);
      } else {
        setExRateError(true);
        setExRateErrorMsg(updateFetcher.data?.data.errorMsg);
      }
    }
    setUpdateFetcherLoading(false);
  }, [updateFetcher.data]);

  useEffect(() => {
    if (selectedRow?.exchangeRate === "Auto") {
      setExRateSelectValue("Auto");
    } else {
      setExRateSelectValue("Manual Rate");
      if (selectedRow?.exchangeRate !== null && typeof selectedRow?.exchangeRate === "number") {
        setExRateValue(selectedRow?.exchangeRate);
      }
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
      setExRateStatus("");
    }
  }, [exRateSelectValue, exRateValue, isVisible]);

  const handleConfirm = () => {
    setUpdateFetcherLoading(true);
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
    } else if (exRateSelectValue === "Manual Rate") {      
      if (exRateValue > 2147483647) {
        setExRateError(true);
        setExRateErrorMsg(t("Exchange rate must be less than 2147483647"));
        setExRateStatus("error");
        setUpdateFetcherLoading(false);
        return;
      }
      
      if (exRateValue < 0 || typeof exRateValue !== "number") {
        setExRateError(true);
        setExRateErrorMsg(t("Exchange rate must be a positive number"));
        setExRateStatus("error");
        setUpdateFetcherLoading(false);
        return;
      }
      setExRateError(false);
      setExRateErrorMsg("");
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
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // 关闭Modal
    setExRateSelectValue(undefined);
    setRoundingSelectValue(undefined);
    setExRateError(false);
    setExRateErrorMsg("");
    setExRateValue(0);
  };

  const handleExRateSelectChange = (value: string) => {
    setExRateSelectValue(value);
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
        <div key={"footer_buttons"} style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          gap: "12px"        // 使用 gap 替代 marginRight
        }}>
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
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div>
          <Title level={5}>{t("Exchange rate")}</Title>
          <Select
            defaultValue={selectedRow?.exchangeRate.toString()}
            value={exRateSelectValue}
            style={{ width: "100%" }}
            options={exRateColumns}
            onChange={handleExRateSelectChange}
          />
          {exRateSelectValue === "Auto" && (
            <div style={{ marginBottom: '8px' }}>
              {selectedRow?.currency}{t("will fluctuate based on market rates.")}.
            </div>
          )}
        </div>
        {exRateSelectValue !== "Auto" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text>1 {defaultCurrencyCode} =</Text>
              <InputNumber
                placeholder={t("Please enter Exchange rate")}
                value={exRateValue}
                style={{ width: 120 }}
                onChange={(e) => setExRateValue(e || 0)}
                status={exRateStatus}
              />
              <Text>{selectedRow?.currencyCode}</Text>
            </div>
            {/* 错误提示放在下方，并且与输入框左对齐 */}
            <div style={{
              marginLeft: '60px',  // 80px(标签宽度) + 8px(间距)
              visibility: exRateError ? 'visible' : 'hidden',
            }}>
              <Text type="danger" strong>
                {t(exRateErrorMsg)}
              </Text>
            </div>
          </div>
        )}
      </Space>
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
    </Modal>
  );
};

export default CurrencyEditModal;
