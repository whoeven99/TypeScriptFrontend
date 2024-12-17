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
  const [options, setOptions] = useState([
    {
      value: "ALL",
      label: "All languages",
    },
  ]);
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
  const dataSource = useSelector((state: any) => state.glossaryTableData.rows);
  const data = useSelector((state: any) =>
    state.glossaryTableData.rows.find(
      (row: GLossaryDataType) => row.key === id,
    ),
  );

  useEffect(() => {
    if (updateFetcher.data) {
      if (updateFetcher.data.data.success) {
        // console.log(updateFetcher.data);
        const res = updateFetcher.data.data.response;
        let data = {
          key: res.id,
          status: res.status,
          sourceText: res.sourceText,
          targetText: res.targetText,
          language: "",
          rangeCode: res.rangeCode,
          type: res.caseSensitive,
        };
        if (
          shopLocales.find((language: ShopLocalesType) => {
            return language.locale == data.rangeCode;
          }) ||
          data.rangeCode === "ALL"
        ) {
          data = {
            ...data,
            language:
              shopLocales.find((language: ShopLocalesType) => {
                return language.locale === data.rangeCode;
              })?.name || "All Languages",
          };
        }
        dispatch(updateGLossaryTableData(data));
        message.success("Saved successfully");
        handleCloseModal();
      } else {
        message.error(updateFetcher.data.data.errorMsg);
        setConfirmButtonDisable(false);
      }
    }
  }, [updateFetcher.data]);

  useEffect(() => {
    if (isVisible) {
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
      }
    }
  }, [isVisible]);

  const handleConfirm = (id: number) => {
    let isValid = true;
    let isOversizeError = true;
    let isSameRuleError = true;
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
    if (!rangeCode || !options.find((option) => option.value === rangeCode)) {
      setRangeCodeStatus("warning");
      isValid = false;
    }

    if (title === "Add rules" && dataSource.length >= 5) {
      isOversizeError = false;
    }

    const source = sourceText + rangeCode;
    dataSource.map((item: any) => {
      const string = item.sourceText + item.rangeCode;
      if (title === "Add rules") {
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

    if (isValid && isSameRuleError && isSameRuleError) {
      const formData = new FormData();
      formData.append(
        "updateInfo",
        JSON.stringify({
          key: id,
          sourceText: sourceText,
          targetText: targetText,
          rangeCode: rangeCode,
          type: checked ? 1 : 0,
          status: data?.status,
        }),
      );
      updateFetcher.submit(formData, {
        method: "post",
        action: "/app/glossary",
      });
      setConfirmButtonDisable(true);
    } else if (!isValid) {
      message.warning(
        "There are empty fields. Please complete all the required information.",
      );
    } else if (!isOversizeError) {
      message.error("You can add up to 5 translation rules");
    } else {
      message.error("You cannot add two conflicting rules.");
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
          value={
            options.some((option) => option.value === rangeCode)
              ? rangeCode
              : undefined
          }
          status={rangeCodeStatus}
        />
        <Checkbox checked={checked} onChange={onCheckboxChange}>
          Case-sensitive
        </Checkbox>
      </Space>
    </Modal>
  );
};

export default UpdateGlossaryModal;
