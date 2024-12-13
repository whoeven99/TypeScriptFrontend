import { useEffect, useState } from "react";
import {
  Modal,
  Input,
  Space,
  message,
  Button,
  Typography,
  Select,
  Checkbox,
  InputProps,
  SelectProps,
  CheckboxProps,
} from "antd";
import { FetcherWithComponents, useFetcher } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { ShopLocalesType } from "~/routes/app.language/route";
import { GLossaryDataType } from "../route";
import { updateGLossaryTableData } from "~/store/modules/glossaryTableData";

const { Text } = Typography;

interface GlossaryModalProps {
  id: number;
  title: string;
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  shopLocales: ShopLocalesType[];
}

const UpdateGlossaryModal: React.FC<GlossaryModalProps> = ({
  id,
  title,
  isVisible,
  setIsModalOpen,
  shopLocales,
}) => {
  const [sourceText, setSourceText] = useState<string>("");
  const [targetText, setTargetText] = useState<string>("");
  const [rangeCode, setRangeCode] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const [options, setOptions] = useState<SelectProps["options"]>();
  const [confirmButtonDisable, setConfirmButtonDisable] =
    useState<boolean>(false);
  const [sourceTextStatus, setSourceTextStatus] = useState<
    "" | "warning" | "error"
  >("");
  const [targetTextStatus, setTargetTextStatus] = useState<
    "" | "warning" | "error"
  >("");
  const [rangeCodeStatus, setRangeCodeStatus] = useState<
    "" | "warning" | "error"
  >("");

  const dispatch = useDispatch();
  const updateFetcher = useFetcher<any>();
  const data = useSelector((state: any) =>
    state.glossaryTableData.rows.find(
      (row: GLossaryDataType) => row.key === id,
    ),
  );

  useEffect(() => {
    if (shopLocales) {
      const localeOptions = shopLocales.map((shopLocale: ShopLocalesType) => ({
        value: shopLocale.locale,
        label: shopLocale.name,
      }));
      localeOptions.unshift({
        value: "ALL",
        label: "All languages",
      });
      setOptions(localeOptions);
    }
  }, []);

  useEffect(() => {
    if (updateFetcher.data) {
      if (updateFetcher.data.data.success) {
        console.log(updateFetcher.data);
        dispatch(updateGLossaryTableData(updateFetcher.data.data.response));
        message.success("Saved successfully");
        handleCloseModal();
      } else {
        message.error(updateFetcher.data.data.errorMsg);
        setConfirmButtonDisable(false);
      }
    }
  }, [updateFetcher.data]);

  useEffect(() => {
    if (isVisible && data) {
      setSourceText(data.sourceText);
      setTargetText(data.sourceText);
      setRangeCode(data.rangeCode);
      setChecked(data.type);
    }
  }, [isVisible]);

  const handleConfirm = (id: number) => {
    let isValid = true;
    // Reset status
    // Validate fields
    if (!sourceText) {
      setSourceTextStatus("warning");
      isValid = false;
    }
    if (!targetText) {
      setTargetTextStatus("warning");
      isValid = false;
    }
    if (!rangeCode) {
      setRangeCodeStatus("warning");
      isValid = false;
    }

    if (isValid) {
      const formData = new FormData();
      formData.append(
        "updateInfo",
        JSON.stringify({
          key: id,
          sourceText: sourceText,
          targetText: targetText,
          rangeCode: rangeCode,
          caseSensitive: checked ? 1 : 0,
          status: data?.status || 0,
        }),
      );
      updateFetcher.submit(formData, {
        method: "post",
        action: "/app/glossary",
      });
      setConfirmButtonDisable(true);
    } else {
      message.warning(
        "There are empty fields. Please complete all the required information.",
      );
    }
  };

  const handleCloseModal = () => {
    setSourceText("");
    setTargetText("");
    setRangeCode("");
    setChecked(false);
    setIsModalOpen(false);
    setConfirmButtonDisable(false);
  };

  const onSourceTextChange: InputProps["onChange"] = (e) => {
    if (e) {
      setSourceTextStatus("");
      setSourceText(e.target.value);
    }
  };

  const onTargetTextChange: InputProps["onChange"] = (e) => {
    if (e) {
      setTargetTextStatus("");
      setTargetText(e.target.value);
    }
  };

  const onRangeCodeChange: SelectProps["onChange"] = (e) => {
    if (e) {
      setRangeCodeStatus("");
      setRangeCode(e);
    }
  };

  const onCheckboxChange: CheckboxProps["onChange"] = (e) => {
    setChecked(e.target.checked);
  };

  return (
    <Modal
      title={title}
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
            onClick={() => handleConfirm(id)}
            key={"manage_confirm_button"}
            type="primary"
            disabled={confirmButtonDisable}
            loading={confirmButtonDisable}
          >
            Save
          </Button>
        </div>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <Text strong>Always translate</Text>
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Input
            style={{ flex: 1 }}
            placeholder="Please enter original text"
            value={sourceText}
            onChange={onSourceTextChange}
            status={sourceTextStatus}
          />
          <Text
            style={{
              margin: "0 8px",
            }}
          >
            to
          </Text>
          <Input
            style={{ flex: 1 }}
            placeholder="Please enter escaped text"
            value={targetText}
            onChange={onTargetTextChange}
            status={targetTextStatus}
          />
        </div>
        <Text strong>Language</Text>
        <Select
          options={options}
          style={{ width: "200px" }}
          onChange={onRangeCodeChange}
          value={rangeCode}
          status={rangeCodeStatus}
        />
        <Checkbox checked={checked} onChange={onCheckboxChange}>
          {checked ? "Case-sensitive" : "Case-insensitive"}
        </Checkbox>
      </Space>
    </Modal>
  );
};

export default UpdateGlossaryModal;
