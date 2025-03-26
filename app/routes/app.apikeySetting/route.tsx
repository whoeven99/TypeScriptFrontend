import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import { Button, message, Skeleton, Space, Typography } from "antd";
import { json, Link, useFetcher, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  ArrowLeftIcon
} from '@shopify/polaris-icons';
import { ApiKeyEditCard, ApiKeyEditCardMethods } from './components/apikeyEditCard';
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { DeleteUserData, GetUserData, SaveGoogleKey } from "~/api/serve";
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
    const deleteUserAPIKey = JSON.parse(formData.get("deleteUserAPIKey") as string);
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
      case !!deleteUserAPIKey:
        try {
          const data = await DeleteUserData({
            shop,
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
  const [apiKey, setApiKey] = useState<string>("");
  const [count, setCount] = useState<string>("");

  const loadingfetcher = useFetcher<any>();
  const updateUserAPIKeyfetcher = useFetcher<any>();
  const deleteUserAPIKeyfetcher = useFetcher<any>();

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
        setApiKey(loadingfetcher.data.data.response.googleKey);
        setCount(loadingfetcher.data.data.response.amount);
      } else if (loadingfetcher.data.data.success === false && loadingfetcher.data.data.errorMsg === "用户不存在") {
        setUserData(null);
        setApiKey("");
        setCount("");
      }
    }
  }, [loadingfetcher.data]);

  useEffect(() => {
    if (updateUserAPIKeyfetcher.data) {
      // 根据当前加载的模型关闭编辑状态
      if (updateUserAPIKeyfetcher.data.data.success) {
        const currentModal = loadingModal;
        cardRefs[currentModal as keyof typeof cardRefs]?.current?.setEditMode(false);
        setApiKey(updateUserAPIKeyfetcher.data.data.response.secret);
        setCount(updateUserAPIKeyfetcher.data.data.response.amount);
        setLoadingModal("");
      } else {
        const currentModal = loadingModal;
        cardRefs[currentModal as keyof typeof cardRefs]?.current?.setApiKeyValue("");
        cardRefs[currentModal as keyof typeof cardRefs]?.current?.setCountValue("");
        setLoadingModal("");
        message.error("count is too large or apikey is incorrect");
      }
    }
  }, [updateUserAPIKeyfetcher.data]);

  useEffect(() => {
    if (deleteUserAPIKeyfetcher?.data) {
      if (deleteUserAPIKeyfetcher?.data?.data?.success) {
        console.log("deleteUserAPIKeyfetcher?.data?.data?.response: ", deleteUserAPIKeyfetcher?.data?.data?.response);
        setUserData(deleteUserAPIKeyfetcher?.data?.data?.response);
        setApiKey("");
        setCount("");
        message.success("delete user api key success");
      } else {
        message.error("delete user api key failed");
      }
    }
  }, [deleteUserAPIKeyfetcher.data]);

  const onSave = (values: { model: string; apiKey: string; count: string }) => {
    setLoadingModal(values.model);
    updateUserAPIKeyfetcher.submit({
      updateUserAPIKey: JSON.stringify(values),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    });
  };

  const onDelete = (modal: string) => {
    setLoadingModal(modal);
    deleteUserAPIKeyfetcher.submit({
      deleteUserAPIKey: JSON.stringify(true),
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
        <div>
          <Text style={{ marginLeft: "8px" }}>{t("How to translate with api key? Please refer to")}</Text><Link to="https://ciwi.bogdatech.com/help/uncategorized/how-to-use-your-own-key-for-translation/" target="_blank" rel="noreferrer">{t("the Private API Translation Model User Manual")}</Link>
        </div>
        {userData ?
          <div>
            <ApiKeyEditCard
              ref={cardRefs.google}
              title="Google Cloud Translation"
              model="google"
              apiKey={apiKey || ""}
              count={count || ""}
              minlength={30}
              onSave={onSave}
              onDelete={onDelete}
              loading={loadingModal === "google" && (updateUserAPIKeyfetcher.state === "submitting" || deleteUserAPIKeyfetcher.state === "submitting")}
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
          <Skeleton.Button active style={{ height: "176px" }} block />
        }
        <div style={{ marginLeft: "8px" }} >
          <Text >{t("When using this feature, we only consume the quota of the corresponding interface and will not charge any additional fees. To avoid exceeding the third-party API quota limits and incurring charges, please set the quota limits carefully.")}</Text>
        </div>
      </Space>
    </Page>
  );
};

export default Index;
