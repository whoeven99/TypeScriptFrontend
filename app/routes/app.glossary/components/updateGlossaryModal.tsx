import { useEffect, useState } from "react";
import { Modal, Input, Space, Typography, Select, Checkbox, Alert } from "antd";
import Button from "~/ui/components/AppButton";
import { useFetcher } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { ShopLocalesType } from "~/routes/app.language/route";
import { planMapping } from "../route";
import { updateGLossaryTableData } from "~/store/modules/glossaryTableData";
import { useTranslation } from "react-i18next";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { insertGlossaryCompat, updateGlossaryCompat } from "../glossaryClient";
import {
  getTranslateV4ErrorMessage,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

const { Text } = Typography;

interface GlossaryModalProps {
  id: number;
  title: string;
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  shopLocales: ShopLocalesType[];
  shop: string;
  server: string;
  migrated: boolean;
}

const UpdateGlossaryModal: React.FC<GlossaryModalProps> = ({
  id,
  title,
  isVisible,
  setIsModalOpen,
  shopLocales,
  shop,
  server,
  migrated,
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
  const [modalAlert, setModalAlert] = useState<{
    type: "warning" | "error";
    message: string;
  } | null>(null);

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
        setSourceText(data?.sourceText);
        setTargetText(data?.targetText);
        setRangeCode(data?.rangeCode);
        setChecked(data?.type);
      } else {
        setRangeCode("ALL");
      }
      if (shopLocales) {
        const localeOptions = shopLocales.map(
          (shopLocale: ShopLocalesType) => ({
            value: shopLocale.locale,
            label: shopLocale.name,
          }),
        );
        setOptions([...options, ...localeOptions]);
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
      setModalAlert(null);
      isValid = false;
    }
    if (!targetText) {
      setTargetTextStatus("error");
      setTargetTextError(true);
      setTargetTextErrorMsg(t("Please enter escaped text"));
      setModalAlert(null);
      isValid = false;
    }
    if (!rangeCode || !options.find((option) => option.value === rangeCode)) {
      setRangeCodeStatus("error");
      setRangeCodeError(true);
      setRangeCodeErrorMsg(t("Please select a language"));
      setModalAlert(null);
      isValid = false;
    }

    if (
      title === "Create rule" &&
      dataSource.length >= planMapping[plan?.type as keyof typeof planMapping]
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
      setModalAlert(null);
      setSourceTextStatus("");
      setSourceTextError(false);
      setSourceTextErrorMsg("");
      setTargetTextStatus("");
      setTargetTextError(false);
      setTargetTextErrorMsg("");
      setRangeCodeStatus("");
      setRangeCodeError(false);
      setRangeCodeErrorMsg("");

      try {
        const item = dataSource.find((item: any) => item.key === id);
        let data;
        if (item) {
          data = await updateGlossaryCompat({
            migrated,
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
          data = await insertGlossaryCompat({
            migrated,
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
              key: res?.id,
              sourceText: res?.sourceText,
              targetText: res?.targetText,
              language:
                shopLocales.find((language: ShopLocalesType) => {
                  return language.locale === res.rangeCode;
                })?.name || "All Languages",
              rangeCode: res?.rangeCode,
              type: res?.caseSensitive,
              status: res?.status,
              loading: false,
              createdDate: res?.createdDate,
            };
          }
          dispatch(updateGLossaryTableData(res));
          shopify.toast.show("Saved successfully");
          setConfirmButtonDisable(false);
          handleCloseModal();
        } else {
          const errorMsg = getTranslateV4ErrorMessage(
            t,
            data.errorMsg,
            TRANSLATE_V4_ERROR_KEYS.GLOSSARY_SAVE_FAILED,
          );
          setModalAlert({ type: "error", message: errorMsg });
          setConfirmButtonDisable(false);
        }
      } catch {
        setModalAlert({
          type: "error",
          message: getTranslateV4ErrorMessage(
            t,
            TRANSLATE_V4_ERROR_KEYS.GLOSSARY_SAVE_FAILED,
          ),
        });
        setConfirmButtonDisable(false);
      }
    } else if (!isOversizeError) {
      setModalAlert({
        type: "warning",
        message: t("You can add up to {{count}} translation rules", {
          count: planMapping[plan?.type as keyof typeof planMapping] ?? 10,
        }),
      });
      return;
    } else if (!isSameRuleError) {
      setModalAlert({
        type: "warning",
        message: t("You cannot add two conflicting rules."),
      });
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
    setModalAlert(null);
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
        {modalAlert ? (
          <Alert
            type={modalAlert.type}
            showIcon
            message={modalAlert.message}
            closable
            onClose={() => setModalAlert(null)}
          />
        ) : null}
        <Text>{t("Keep translation consistent across your store")}</Text>
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
                setModalAlert(null);
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
                setModalAlert(null);
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
              setModalAlert(null);
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
