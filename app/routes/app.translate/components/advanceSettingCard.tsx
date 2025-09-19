import { Icon, Page } from "@shopify/polaris";
import {
  Flex,
  Card,
  Checkbox,
  CheckboxChangeEvent,
  Divider,
  Space,
  Typography,
  Radio,
  Popconfirm,
  Button,
  Badge,
  Popover,
  Select,
  Switch,
} from "antd";
import { useTranslation } from "react-i18next";
import { LanguagesDataType } from "~/routes/app.language/route";
import { PlusIcon } from "@shopify/polaris-icons";
import defaultStyles from "../../styles/defaultStyles.module.css";
import { CaretDownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "@remix-run/react";
import { apiKeyConfiguration } from "../route";

const { Title, Text } = Typography;

interface ToneSettingCardProps {
  rotate: boolean;
  setRotate: (e: boolean) => void;
  glossaryOpen: boolean;
  loadingArray: string[];
  handleAdvanceSettingChange: (type: "glossary" | "brand") => void;
}

const AdvanceSettingCard = ({
  rotate,
  setRotate,
  glossaryOpen,
  loadingArray,
  handleAdvanceSettingChange,
}: ToneSettingCardProps) => {
  const { t } = useTranslation();

  return (
    <Card
      title={t("Advance Setting")}
      extra={
        <Button type="text" onClick={() => setRotate(!rotate)}>
          <CaretDownOutlined rotate={rotate ? 180 : 0} />
        </Button>
      }
      style={{
        width: "100%",
        marginBottom: "16px",
      }}
      styles={{
        body: {
          padding: rotate ? "24px" : "0",
        },
      }}
    >
      {rotate && (
        <Space
          direction="vertical"
          size="large"
          style={{ display: "flex", width: "100%" }}
        >
          <Flex gap={8} align="center" justify="space-between">
            <Text>{t("Glossary")}</Text>
            <Switch
              checked={glossaryOpen}
              loading={loadingArray.includes("glossary")}
              onClick={() => handleAdvanceSettingChange("glossary")}
            />
          </Flex>
        </Space>
      )}
    </Card>
  );
};

export default AdvanceSettingCard;
