import { Space } from "antd";
import Button from "~/ui/components/AppButton";
import { useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import AppSectionCard from "~/ui/components/AppSectionCard";

const NoLanguageSetCard = () => {
  const navigate = useNavigate(); // 用来处理路由跳转
  const { t } = useTranslation();

  return (
    <AppSectionCard
      title={t("No languages to translate.")}
      description={t(
        "Your store currently has no languages requiring translation. Please add a target language first.",
      )}
      style={{
        textAlign: "center",
        width: "100%",
      }}
    >
      <Space direction="vertical" size="large">
        <Button
          type="primary"
          onClick={() => {
            navigate("/app/language");
          }}
        >
          {t("Add Language")}
        </Button>
      </Space>
    </AppSectionCard>
  );
};

export default NoLanguageSetCard;
