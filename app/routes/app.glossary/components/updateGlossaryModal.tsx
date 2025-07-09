import { useEffect, useState } from "react";
import {
  Modal,
  Input,
  Space,
  Button,
  Typography,
  Select,
  Checkbox,
} from "antd";
import { useFetcher } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { ShopLocalesType } from "~/routes/app.language/route";
import { planMapping } from "../route";
import { updateGLossaryTableData } from "~/store/modules/glossaryTableData";
import { useTranslation } from "react-i18next";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { InsertGlossaryInfo, UpdateTargetTextById } from "~/api/JavaServer";

const { Text } = Typography;

interface GlossaryModalProps {
  id: number;
  title: string;
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  shopLocales: ShopLocalesType[];
  shop: string;
  server: string;
}

const UpdateGlossaryModal: React.FC<GlossaryModalProps> = ({
  id,
  title,
  isVisible,
  setIsModalOpen,
  shopLocales,
  shop,
  server,
}) => {
  const [sourceText, setSourceText] = useState<string>("");
  const [targetText, setTargetText] = useState<string>("");
  const [rangeCode, setRangeCode] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const [options, setOptions] = useState([
    {
      value: "ALL",
      label: "All languages",
    },
  ]);
  const [confirmButtonDisable, setConfirmButtonDisable] =
    useState<boolean>(false);
  const [sourceTextError, setSourceTextError] = useState<boolean>(false);
  const [targetTextError, setTargetTextError] = useState<boolean>(false);
  const [rangeCodeError, setRangeCodeError] = useState<boolean>(false);
  const [sourceTextStatus, setSourceTextStatus] = useState<
    "" | "warning" | "error"
  >("");
  const [targetTextStatus, setTargetTextStatus] = useState<
    "" | "warning" | "error"
  >("");
  const [rangeCodeStatus, setRangeCodeStatus] = useState<
    "" | "warning" | "error"
  >("");
  const [sourceTextErrorMsg, setSourceTextErrorMsg] = useState<string>("");
  const [targetTextErrorMsg, setTargetTextErrorMsg] = useState<string>("");
  const [rangeCodeErrorMsg, setRangeCodeErrorMsg] = useState<string>("");

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const updateFetcher = useFetcher<any>();
  const dataSource = useSelector((state: any) => state.glossaryTableData.rows);
  const { plan } = useSelector((state: any) => state.userConfig);

  useEffect(() => {
    if (updateFetcher.data) {
    }
  }, [updateFetcher.data]);

  useEffect(() => {
    if (isVisible) {
      const data = dataSource.find((item: any) => item.key === id);
      if (data) {
        setSourceText(data.sourceText);
        setTargetText(data.targetText);
        setRangeCode(data.rangeCode);
        setChecked(data.type);
      }
      if (shopLocales) {
        const localeOptions = shopLocales.map(
          (shopLocale: ShopLocalesType) => ({
            value: shopLocale.locale,
            label: shopLocale.name,
          }),
        );
        setOptions([...options, ...localeOptions]);
        setRangeCode("ALL");
      }
    }
  }, [isVisible]);

  const handleConfirm = async (id: number) => {
    let isValid = true;
    let isOversizeError = true;
    let isSameRuleError = true;
    // Reset status
    // Validate fields
    if (!sourceText) {
      setSourceTextStatus("error");
      setSourceTextError(true);
      setSourceTextErrorMsg(t("Please enter original text"));
      isValid = false;
    }
    if (!targetText) {
      setTargetTextStatus("error");
      setTargetTextError(true);
      setTargetTextErrorMsg(t("Please enter escaped text"));
      isValid = false;
    }
    if (!rangeCode || !options.find((option) => option.value === rangeCode)) {
      setRangeCodeStatus("error");
      setRangeCodeError(true);
      setRangeCodeErrorMsg(t("Please select a language"));
      isValid = false;
    }

    if (
      title === "Create rule" &&
      dataSource.length >= planMapping[plan as keyof typeof planMapping]
    ) {
      isOversizeError = false;
    }

    const source = sourceText + rangeCode;
    dataSource.map((item: any) => {
      const string = item.sourceText + item.rangeCode;
      if (title === "Create rule") {
        if (
          source == string ||
          ((item.rangeCode == "ALL" || rangeCode == "ALL") &&
            sourceText == item.sourceText)
        ) {
          isSameRuleError = false;
        }
      } else {
        if (
          (source == string ||
            ((item.rangeCode == "ALL" || rangeCode == "ALL") &&
              sourceText == item.sourceText)) &&
          item.key !== id
        ) {
          isSameRuleError = false;
        }
      }
    });

    if (isValid && isSameRuleError && isOversizeError) {
      setConfirmButtonDisable(true);
      setSourceTextStatus("");
      setSourceTextError(false);
      setSourceTextErrorMsg("");
      setTargetTextStatus("");
      setTargetTextError(false);
      setTargetTextErrorMsg("");
      setRangeCodeStatus("");
      setRangeCodeError(false);
      setRangeCodeErrorMsg("");
      const item = dataSource.find((item: any) => item.key === id);
      let data;
      console.log(item);
      if (item) {
        data = await UpdateTargetTextById({
          shop: shop,
          data: {
            key: id,
            sourceText: sourceText,
            targetText: targetText,
            rangeCode: rangeCode,
            type: checked ? 1 : 0,
            status: item?.status,
          },
          server: server as string,
        });
      } else {
        data = await InsertGlossaryInfo({
          shop: shop,
          sourceText: sourceText,
          targetText: targetText,
          rangeCode: rangeCode,
          type: checked ? 1 : 0,
          server: server as string,
        });
      }

      if (data.success) {
        let res = data.response;
        if (
          shopLocales.find((language: ShopLocalesType) => {
            return language.locale == res.rangeCode;
          }) ||
          res.rangeCode === "ALL"
        ) {
          res = {
            ...res,
            language:
              shopLocales.find((language: ShopLocalesType) => {
                return language.locale === res.rangeCode;
              })?.name || "All Languages",
          };
        }
        console.log(res);
        dispatch(updateGLossaryTableData(res));
        shopify.toast.show("Saved successfully");
        setConfirmButtonDisable(false);
        handleCloseModal();
      } else {
        shopify.toast.show(data.errorMsg);
        setConfirmButtonDisable(false);
      }
    } else if (!isOversizeError) {
      shopify.toast.show(
        t("You can add up to {{count}} translation rules", { count: 10 }),
      );
      return;
    } else if (!isSameRuleError) {
      shopify.toast.show(t("You cannot add two conflicting rules."));
      return;
    }
  };

  const handleCloseModal = () => {
    setSourceText("");
    setTargetText("");
    setRangeCode("");
    setOptions([
      {
        value: "ALL",
        label: "All languages",
      },
    ]);
    setChecked(false);
    setIsModalOpen(false);
    setConfirmButtonDisable(false);
    setSourceTextStatus("");
    setTargetTextStatus("");
    setRangeCodeStatus("");
    setSourceTextError(false);
    setTargetTextError(false);
    setRangeCodeError(false);
    setSourceTextErrorMsg("");
    setTargetTextErrorMsg("");
    setRangeCodeErrorMsg("");
  };

  return (
    <Modal
      title={title}
      open={isVisible}
      onCancel={handleCloseModal}
      footer={[
        <div
          key={"footer_buttons"}
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <Button
            key={"manage_cancel_button"}
            onClick={handleCloseModal}
            style={{ marginRight: "10px" }}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={() => handleConfirm(id)}
            key={"manage_confirm_button"}
            type="primary"
            disabled={confirmButtonDisable}
            loading={confirmButtonDisable}
          >
            {t("Save")}
          </Button>
        </div>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <Text>{t("Always translate")}</Text>
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Input
              placeholder={t("Please enter original text")}
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
              }}
              status={sourceTextStatus}
            />
            {sourceTextError && (
              <Text type="danger" style={{ marginTop: 2, color: "#8E0A21" }}>
                <ExclamationCircleOutlined
                  style={{
                    display: sourceTextError ? "inline-block" : "none",
                    marginRight: "4px",
                  }}
                />
                {sourceTextErrorMsg}
              </Text>
            )}
          </div>
          <Text style={{ margin: "0 8px", lineHeight: "32px" }}>{t("to")}</Text>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Input
              placeholder={t("Please enter escaped text")}
              value={targetText}
              onChange={(e) => {
                setTargetText(e.target.value);
              }}
              status={targetTextStatus}
            />
            {targetTextError && (
              <Text type="danger" style={{ marginTop: 2, color: "#8E0A21" }}>
                <ExclamationCircleOutlined
                  style={{
                    display: targetTextError ? "inline-block" : "none",
                    marginRight: "4px",
                  }}
                />
                {targetTextErrorMsg}
              </Text>
            )}
          </div>
        </div>
        <Text strong>{t("Apply for")}</Text>
        <div style={{ display: "flex", flexDirection: "column", width: 200 }}>
          <Select
            options={options}
            style={{ width: "100%" }}
            onChange={(e) => {
              setRangeCode(e);
            }}
            value={rangeCode}
            status={rangeCodeStatus}
          />
          {rangeCodeError && (
            <Text type="danger" style={{ marginTop: 2 }}>
              <ExclamationCircleOutlined
                style={{
                  display: rangeCodeError ? "inline-block" : "none",
                  marginRight: "4px",
                }}
              />
              {rangeCodeErrorMsg}
            </Text>
          )}
        </div>
        <Text strong>{t("Match by")}</Text>
        <Checkbox
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
          }}
        >
          {t("Case-sensitive")}
        </Checkbox>
      </Space>
    </Modal>
  );
};

export default UpdateGlossaryModal;
