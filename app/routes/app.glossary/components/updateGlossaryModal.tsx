import { useEffect, useState } from "react";
import {
  Modal,
  Input,
  Table,
  Space,
  message,
  Button,
  Typography,
  Select,
  Checkbox,
  CheckboxProps,
  InputProps,
  SelectProps,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { FetcherWithComponents, useFetcher } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { ShopLocalesType } from "~/routes/app.language/route";
import { GLossaryDataType } from "../route";

const { Text } = Typography;

interface GlossaryModalProps {
  id: number;
  title: string;
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  shopLocales: ShopLocalesType[];
}

// interface UpdateGlossaryType {
//   key: number;
//   isoCode: string;
//   src: string[] | null;
//   name: string;
//   state: string;
// }

const UpdateGlossaryModal: React.FC<GlossaryModalProps> = ({
  id,
  title,
  isVisible,
  setIsModalOpen,
  shopLocales,
}) => {
  console.log(id);

  const [sourceText, setSourceText] = useState<string>("");
  const [targetText, setTargetText] = useState<string>("");
  const [rangeCode, setRangeCode] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const [confirmButtonDisable, setConfirmButtonDisable] = useState<boolean>();
  const updateFetcher = useFetcher<any>();
  const data = useSelector((state: any) =>
    state.glossaryTableData.rows.find((row: GLossaryDataType) => row.id === id),
  );

  useEffect(() => {
    if (updateFetcher.data) console.log(updateFetcher.data);
  }, [updateFetcher.data]);

  useEffect(() => {
    if (isVisible && data) {
      setSourceText(data.sourceText);
      setTargetText(data.sourceText);
      setRangeCode(data.target);
      setChecked(data.type);
      console.log(rangeCode);
    }
  }, [isVisible]);

  const handleConfirm = (id: number) => {
    const formData = new FormData();
    formData.append(
      "updateInfo",
      JSON.stringify({
        id: id,
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
  };

  const handleCloseModal = () => {
    setSourceText("");
    setTargetText("");
    setRangeCode("");
    setChecked(false);
    setIsModalOpen(false);
  };

  const onSourceTextChange: InputProps["onChange"] = (e) => {
    // console.log('checked = ', e.target.checked);
    setSourceText(e.target.value);
  };

  const onTargetTextChange: InputProps["onChange"] = (e) => {
    // console.log('checked = ', e.target.checked);
    setTargetText(e.target.value);
  };

  const onRangeCodeChange: SelectProps["onChange"] = (e) => {
    setRangeCode(e);
  };

  const onCheckboxChange: CheckboxProps["onChange"] = (e) => {
    // console.log('checked = ', e.target.checked);
    setChecked(e.target.checked);
  };

  const options = shopLocales.map((shopLocale: ShopLocalesType) => ({
    value: shopLocale.locale,
    label: shopLocale.name,
  }));

  return (
    <Modal
      title={title}
      // width={1000}
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
          />
        </div>
        <Text strong>Language</Text>
        <Select
          options={options}
          style={{ width: "100px" }}
          onChange={onRangeCodeChange}
          value={rangeCode}
        />
        <Checkbox checked={checked} onChange={onCheckboxChange}>
          {checked ? "Case-sensitive" : "Case-insensitive"}
        </Checkbox>
      </Space>
    </Modal>
  );
};

export default UpdateGlossaryModal;
