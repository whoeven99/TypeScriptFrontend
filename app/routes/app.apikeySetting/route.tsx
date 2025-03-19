import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import { Button, Space, Typography } from "antd";
import { useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  ArrowLeftIcon
} from '@shopify/polaris-icons';
import { ApiKeyEditCard } from "./components/apikeyEditCard";
const { Title, Text } = Typography;

export interface GLossaryDataType {
  key: number;
  sourceText: string;
  targetText: string;
  language: string;
  rangeCode: string;
  type: number;
  status: number;
  loading: boolean;
}

export const loader = async () => {
  return null;
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title={t("Translate Settings")} />
      <ScrollNotice text={t("Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.")} />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              type="text"
              variant="breadcrumb"
              onClick={() => navigate("/app/translate")}
              style={{ padding: "4px" }}
            >
              <Icon
                source={ArrowLeftIcon}
                tone="base"
              />
            </Button>
            <Title style={{ fontSize: "1.25rem", margin: "0" }}>
              {t("Translate Settings")}
            </Title>
          </div>
        </div>
        <Text style={{ marginLeft: "8px" }}>{t("How to obtain the corresponding API Key? Please refer to the Private API Translation Model User Manual.")}</Text>
        <ApiKeyEditCard title={t("Google Gemini")} apiKey={""} count={""} />
      </Space>
    </Page>
  );
};

export default Index;
