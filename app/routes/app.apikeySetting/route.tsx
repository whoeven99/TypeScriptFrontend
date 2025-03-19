import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import { Button, Space, Typography } from "antd";
import { json, useFetcher, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  ArrowLeftIcon
} from '@shopify/polaris-icons';
import { ApiKeyEditCard } from "./components/apikeyEditCard";
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs } from "@remix-run/node";
import { SaveGoogleKey } from "~/api/serve";
import { useEffect, useState } from "react";
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const sessionService = await SessionService.init(request);
  let shopSession = sessionService.getShopSession();
  if (!shopSession) {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    shopSession = {
      shop: shop,
      accessToken: accessToken as string,
    };
    sessionService.setShopSession(shopSession);
  }
  const { shop, accessToken } = shopSession;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const updateUserAPIKey = JSON.parse(formData.get("updateUserAPIKey") as string);
    switch (true) {
      // case !!loading:
      //   try {
      //     const data = await GetGlossaryByShopName({
      //       shop,
      //       accessToken,
      //     });
      //     console.log("GetGlossaryByShopName: ", data);

      //     return json({ data: data });
      //   } catch (error) {
      //     console.error("Error glossary loading:", error);
      //     throw new Response("Error glossary loading", { status: 500 });
      //   }
      case !!updateUserAPIKey:
        try {
          const { modal, apiKey, count } = updateUserAPIKey;
          const data = await SaveGoogleKey({
            shop,
            modal,
            apiKey,
            count,
          });
          return json({ data: data });
        } catch (error) {
          console.error("Error glossary loading:", error);
          throw new Response("Error glossary loading", { status: 500 });
        }
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action glossary:", error);
    throw new Response("Error action glossary", { status: 500 });
  }
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loadingModal, setLoadingModal] = useState<string>("");

  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data) {
      console.log("fetcher.data: ", fetcher.data);
    }
  }, [fetcher.data]);

  const onSave = (values: { modal: string; apiKey: string; count: string }) => {
    setLoadingModal(values.modal);
    fetcher.submit({
      updateUserAPIKey: JSON.stringify(values),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    });
  }

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
        <ApiKeyEditCard title={t("Google Gemini")} modal={"google"} apiKey={""} count={""} minlength={10} onSave={onSave} loading={loadingModal === "google" && fetcher.state === "submitting"} />
      </Space>
    </Page>
  );
};

export default Index;
