import { Button, Flex, Space, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { CaretDownOutlined } from "@ant-design/icons";
import AppSectionCard from "~/ui/components/AppSectionCard";

const { Text } = Typography;

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
    <AppSectionCard
      title={t("Advance Setting")}
      description={t("Enable glossary support and other optional helpers when they are available for this store.")}
      extra={
        <Button type="text" onClick={() => setRotate(!rotate)}>
          <CaretDownOutlined rotate={rotate ? 180 : 0} />
        </Button>
      }
      style={{
        width: "100%",
        marginBottom: "16px",
      }}
      bodyPadding={rotate ? "16px" : "0"}
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
    </AppSectionCard>
  );
};

export default AdvanceSettingCard;
