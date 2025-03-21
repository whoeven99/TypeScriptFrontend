import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import { Button, message, Skeleton, Space, Typography } from "antd";
import { json, useFetcher, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  ArrowLeftIcon
} from '@shopify/polaris-icons';
import { ApiKeyEditCard, ApiKeyEditCardMethods } from './components/apikeyEditCard';
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { GetUserData, SaveGoogleKey } from "~/api/serve";
import { useEffect, useState, useRef } from "react";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
      case !!loading:
        try {
          const data = await GetUserData({
            shop,
          });
          console.log("GetUserData: ", data);
          return json({ data: data });
        } catch (error) {
          console.error("Error apiKeySetting loading:", error);
          throw new Response("Error apiKeySetting loading", { status: 500 });
        }
      case !!updateUserAPIKey:
        try {
          const { model, apiKey, count } = updateUserAPIKey;
          const data = await SaveGoogleKey({
            shop,
            model,
            apiKey,
            count,
          });
          return json({ data: data });
        } catch (error) {
          console.error("Error apiKeySetting action:", error);
          throw new Response("Error apiKeySetting action", { status: 500 });
        }
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action apiKeySetting:", error);
    throw new Response("Error action apiKeySetting", { status: 500 });
  }
};

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loadingModal, setLoadingModal] = useState<string>("");
  const [userData, setUserData] = useState<any>(null);

  const loadingfetcher = useFetcher<any>();
  const updateUserAPIKeyfetcher = useFetcher<any>();

  const cardRefs = {
    google: useRef<ApiKeyEditCardMethods>(null),
    // ... 其他模型
  };

  useEffect(() => {
    loadingfetcher.submit({
      loading: JSON.stringify(true),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    });
  }, []);

  useEffect(() => {
    if (loadingfetcher.data) {
      console.log("loadingfetcher.data: ", loadingfetcher.data);
      if (loadingfetcher.data.data.success) {
        setUserData(loadingfetcher.data.data.response);
      }
    }
  }, [loadingfetcher.data]);

  useEffect(() => {
    if (updateUserAPIKeyfetcher.data) {
      // 根据当前加载的模型关闭编辑状态
      if (updateUserAPIKeyfetcher.data.data.success) {
        const currentModal = loadingModal;
        cardRefs[currentModal as keyof typeof cardRefs]?.current?.setEditMode(false);
        setLoadingModal("");
      }else{
        const currentModal = loadingModal;
        cardRefs[currentModal as keyof typeof cardRefs]?.current?.setApiKeyValue("");
        cardRefs[currentModal as keyof typeof cardRefs]?.current?.setCountValue("");
        setLoadingModal("");
        message.error("count is too large or apikey is incorrect");
      }
    }
  }, [updateUserAPIKeyfetcher.data]);

  const onSave = (values: { model: string; apiKey: string; count: string }) => {
    setLoadingModal(values.model);
    updateUserAPIKeyfetcher.submit({
      updateUserAPIKey: JSON.stringify(values),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    });
  };

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
        {/* <Text style={{ marginLeft: "8px" }}>{t("How to obtain the corresponding API Key? Please refer to the Private API Translation Model User Manual.")}</Text> */}
        {userData ?
          <div>
            <ApiKeyEditCard
              ref={cardRefs.google}
              title="Google Cloud Translation"
              model="google"
              apiKey={userData?.googleKey}
              count={userData?.amount}
              minlength={30}
              onSave={onSave}
              loading={loadingModal === "google" && updateUserAPIKeyfetcher.state === "submitting"}
            />
            {/* <ApiKeyEditCard
              ref={cardRefs.openai}
              title="OpenAI"
              model="openai"
              apiKey={userData?.openaiKey}
              count={userData?.openaiAmount}
              minlength={30}
              onSave={onSave}
              loading={loadingModal === "openai" && updateUserAPIKeyfetcher.state === "submitting"}
            /> */}
          </div>
          :
          <Skeleton.Button active style={{ height: "176px" }} block/>
        }
      </Space>
    </Page>
  );
};

export default Index;
