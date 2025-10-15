import { TitleBar } from "@shopify/app-bridge-react";
import {
  Icon,
  Page,
  InlineGrid,
  Modal,
  TextField,
  Box,
  Text as PolarisText,
  Link as PolarisLink,
  Select,
  FormLayout,
  InlineStack,
} from "@shopify/polaris";
import {
  Button,
  Card,
  Input,
  message,
  Skeleton,
  Space,
  Typography,
} from "antd";
import {
  json,
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  GetUserData,
  SavePrivateKey,
  TranslationInterface,
} from "~/api/JavaServer";
import { useEffect, useState, useRef } from "react";
import styles from "./styles.module.css";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import ApiCard from "./components/ApiCard";
import { globalStore } from "~/globalStore";

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

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);

  const { shop, accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const updateUserAPIKey = JSON.parse(
      formData.get("updateUserAPIKey") as string,
    );
    const testUserAPIKey = JSON.parse(formData.get("testUserAPIKey") as string);
    switch (true) {
      case !!loading:
        try {
          // 获取所有 API 的配置
          const { opportunity, apiName } = loading;
          if (opportunity === "init") {
            const apiNames = [0, 1]; // 对应 google, openai, deepl, deepseek
            const result = await Promise.all(
              apiNames.map((apiName) =>
                GetUserData({
                  shop,
                  apiName,
                }),
              ),
            );
            return json({ data: result });
          } else if (opportunity === "testTranslate") {
            const result = await GetUserData({
              shop,
              apiName,
            });
            return json({ data: [result] });
          }
        } catch (error) {
          console.error("Error apiKeySetting loading:", error);
          return json({ data: [], error: "Failed to load data" });
        }
      case !!updateUserAPIKey:
        try {
          const {
            apiKey,
            count,
            modelVersion,
            keywords,
            apiName,
            apiStatus,
            isSelected,
          } = updateUserAPIKey;

          const countNum = Number(count);
          if (isNaN(countNum) || countNum < 0) {
            return json(
              { success: false, error: "Invalid quota value" },
              { status: 400 },
            );
          }
          const data = await SavePrivateKey({
            shop,
            apiKey,
            count,
            modelVersion,
            keywords,
            apiName,
            apiStatus,
            isSelected,
          });
          return json({ data });
        } catch (error) {
          console.error("Error apiKeySetting action:", error);
        }
      case !!testUserAPIKey:
        try {
          const { content, apiName, targetCode, prompt } = testUserAPIKey;

          const data = await TranslationInterface({
            shop,
            apiName,
            sourceText: content,
            targetCode,
            prompt,
          });
          return json({ data });
        } catch (error) {
          console.error("Error apiKeySetting action:", error);
        }
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action apiKeySetting:", error);
  }
};

const Index = () => {
  const [apiKeyError, setApiKeyError] = useState(false);
  const [countError, setCountError] = useState(false);
  const [keywordsError, setkeywordsError] = useState(false);
  const [apiKeyErrorMsg, setApiKeyErrorMsg] = useState<string>(
    " The API key format is incorrect",
  );
  const [tempApiKey, setTempApiKey] = useState<string>(""); // 模态框临时 API 密钥
  const [tempLimit, setTempLimit] = useState<string>(""); // 模态框临时额度
  const [tempKeyWords, setTempKeyWords] = useState<string>(""); // 模态框临时额度
  const loadingfetcher = useFetcher<any>();
  const updateUserAPIKeyfetcher = useFetcher<any>();
  const testApiKeyfetcher = useFetcher<any>();
  const deleteUserAPIKeyfetcher = useFetcher<any>();
  type ServiceId = "google" | "openai";
  // 测试模态框依赖的数据
  const [active, setActive] = useState(false);
  const [content, setContent] = useState("");
  const [translation, setTranslation] = useState("");
  const [apiChoice, setApiChoice] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const handleTestModalClose = () => setActive(false);

  const { t } = useTranslation();

  const fetcher = useFetcher<any>();

  interface ServiceConfig {
    apiKey: string;
    limit: string;
    keywords: string;
    modelVersion?: string;
    apiStatus: boolean;
    usedToken: number;
  }
  const apiConfigs: { id: ServiceId; title: string }[] = [
    {
      id: "google",
      title: "Google Translate",
    },
    {
      id: "openai",
      title: "Open AI/ChatGPT",
    },
    // {
    //   id: 'deepl',
    //   title: 'DeepL Translate（不支持HTML翻译）',
    // },
    // {
    //   id: 'deepseek',
    //   title: 'DeepSeek Translate',
    // },
  ];
  const initialConfigs: Record<ServiceId, ServiceConfig> = {
    google: {
      apiKey: "",
      limit: t("openai.ne"),
      keywords: "",
      apiStatus: false,
      usedToken: 0,
    },
    openai: {
      apiKey: "",
      limit: t("openai.ne"),
      keywords:
        "Translate the following content into {language} .Only output the final correct translation",
      modelVersion: "gpt-4o",
      apiStatus: false,
      usedToken: 0,
    },
    // deepl: {
    //   apiKey: '',
    //   limit: '未生效',
    //   keywords: '',
    //   apiStatus: false,
    //   usedToken: 0,
    // },
    // deepseek: {
    //   apiKey: '',
    //   limit: '未生效',
    //   keywords: 'Translate the following content into {language} .Only output the final correct translation',
    //   apiStatus: false,
    //   usedToken: 0,
    // }
  };
  const chatGptVersions = [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4.1", value: "gpt-4.1" },
  ];
  const googleTranslatorLanguage = [
    { label: "English", value: "en" },
    { label: "简体中文", value: "zh-CN" },
    { label: "Español", value: "es" }, // Spanish
    { label: "Français", value: "fr" }, // French
    { label: "Deutsch", value: "de" }, // German
    { label: "Italiano", value: "it" }, // Italian
    { label: "繁體中文", value: "zh-TW" }, // Traditional Chinese
    { label: "Português", value: "pt-PT" }, // Portuguese
  ];
  const apiNames = {
    google: { apiName: 0 },
    openai: { apiName: 1 },
    deepl: { apiName: 2 },
    deepseek: { apiName: 3 },
  };
  const navigate = useNavigate();
  const [apis, setApis] = useState(apiConfigs);
  const [userApiConfigs, setUserApiConfigs] =
    useState<Record<ServiceId, ServiceConfig>>(initialConfigs);
  const [activeModal, setActiveModal] = useState<ServiceId>("google"); //当前操作的模型
  const [modalOpen, setModalOpen] = useState(false);
  const [tempModelVersion, setTempModelVersion] = useState<string>("");
  const [tempTargetLanguage, setTempTargetLanguage] = useState<string>("en");

  const handleConfigure = (id: ServiceId) => {
    if (isLoading) {
      shopify.toast.show(t("openai.di"), { duration: 3000 });
      return;
    }
    // 打开配置模态框
    setActiveModal(id);
    setModalOpen(true);
    setTempLimit(
      userApiConfigs[id].limit === t("openai.ne")
        ? ""
        : userApiConfigs[id].limit,
    );
    setTempModelVersion(userApiConfigs[id].modelVersion || "gpt-4o");
    id === "openai"
      ? setTempKeyWords(
          userApiConfigs[id].keywords ||
            "Translate the following content into {language} .Only output the final correct translation",
        )
      : setTempKeyWords("");
    if (userApiConfigs[id].apiStatus) {
      setTempApiKey("******************************");
    }
  };
  const handleClose = () => {
    setModalOpen(false);
    setApiKeyError(false);
    setCountError(false);
    setTempApiKey("");
    setkeywordsError(false);
  };
  const handleTestApi = (id: ServiceId) => {
    if (isLoading) {
      shopify.toast.show(t("openai.di"), { duration: 3000 });
      return;
    }
    setTranslation("");
    setActiveModal(id);
    setActive(true);
    setContent("");
    id === "openai"
      ? setTempKeyWords(
          userApiConfigs[id].keywords ||
            "Translate the following content into {language} .Only output the final correct translation",
        )
      : setTempKeyWords("");
  };
  const handleTranslate = () => {
    // 测试api翻译接口逻辑
    if (!content) {
      shopify.toast.show(t("openai.et"));
      return;
    }
    testApiKeyfetcher.submit(
      {
        testUserAPIKey: JSON.stringify({
          content,
          apiName: apiNames[activeModal].apiName,
          targetCode: tempTargetLanguage,
          prompt: tempKeyWords,
        }),
      },
      {
        method: "POST",
        action: "/app/apikeySetting",
      },
    );
  };
  // 弹窗确认函数
  const handleConfirm = () => {
    const countNum = Number(tempLimit);
    if (isNaN(countNum) || countNum <= 0 || countNum > 2147483647) {
      setCountError(true);
      return;
    }
    setCountError(false);
    if (activeModal === "openai" && !tempKeyWords) {
      setkeywordsError(true);
      return;
    }
    setkeywordsError(false);
    updateUserAPIKeyfetcher.submit(
      {
        updateUserAPIKey: JSON.stringify({
          apiName: apiNames[activeModal].apiName,
          apiStatus: true,
          isSelected: false,
          apiKey:
            tempApiKey.includes("****") || tempApiKey === ""
              ? null
              : tempApiKey,
          count: tempLimit,
          keywords: tempKeyWords,
          ...(activeModal === "openai" && { modelVersion: tempModelVersion }),
        }),
      },
      {
        method: "POST",
        action: "/app/apikeySetting",
      },
    );
  };
  useEffect(() => {
    loadingfetcher.submit(
      {
        loading: JSON.stringify({
          opportunity: "init",
        }),
      },
      {
        method: "POST",
        action: "/app/apikeySetting",
      },
    );
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在私有key页面`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  }, []);

  useEffect(() => {
    if (loadingfetcher.state === "idle" && loadingfetcher.data) {
      setIsLoading(false);
      if (loadingfetcher.data.error) {
        console.error("Loading fetcher error:", loadingfetcher.data.error);
        shopify.toast.show(t("openai.di"), { duration: 3000 });
        return;
      }
      if (loadingfetcher.data.data && Array.isArray(loadingfetcher.data.data)) {
        // const apiNameToId : Record<number, ServiceId> = { 0: 'google', 1: 'openai', 2: 'deepl', 3: 'deepseek' };
        const apiNameToId: Record<number, ServiceId> = {
          0: "google",
          1: "openai",
        };
        // 更新 userApiConfigs
        setUserApiConfigs((prevConfigs) => {
          const newConfigs = { ...prevConfigs };
          const responses = Array.isArray(loadingfetcher.data.data)
            ? loadingfetcher.data.data
            : [loadingfetcher.data.data];
          responses.forEach((response: any) => {
            if (response?.success) {
              const serviceId = apiNameToId[response.response.apiName];
              if (serviceId) {
                newConfigs[serviceId] = {
                  ...prevConfigs[serviceId],
                  limit: response.response.tokenLimit
                    ? String(response.response.tokenLimit)
                    : t("openai.ne"),
                  keywords:
                    response.response.promptWord ||
                    prevConfigs[serviceId].keywords,
                  ...(serviceId === "openai" && {
                    modelVersion:
                      response.response.apiModel ||
                      prevConfigs[serviceId].modelVersion,
                  }),
                  usedToken: response.response.usedToken || 0,
                  apiStatus: response.response.apiStatus || false,
                };
              }
            }
          });
          return newConfigs;
        });
      }
    } else if (
      loadingfetcher.state === "loading" ||
      loadingfetcher.state === "submitting"
    ) {
      setIsLoading(true);
    }
  }, [loadingfetcher.data, loadingfetcher.state]);

  useEffect(() => {
    if (updateUserAPIKeyfetcher.data) {
      // 根据当前加载的模型关闭编辑状态
      if (updateUserAPIKeyfetcher.data.data.success) {
        setUserApiConfigs((prevConfigs) => ({
          ...prevConfigs,
          [activeModal]: {
            ...prevConfigs[activeModal],
            limit:
              updateUserAPIKeyfetcher.data.data.response.tokenLimit ||
              prevConfigs[activeModal].limit,
            apiKey:
              updateUserAPIKeyfetcher.data.data.response.apiKey ||
              prevConfigs[activeModal].apiKey,
            ...(activeModal === "openai" && {
              modelVersion:
                updateUserAPIKeyfetcher.data.data.response.apiModel || "gpt-4o",
            }),
            keywords:
              updateUserAPIKeyfetcher.data.data.response.promptWord ||
              prevConfigs[activeModal].keywords,
            usedToken:
              updateUserAPIKeyfetcher.data.data.response.usedToken ||
              prevConfigs[activeModal].usedToken,
            apiStatus:
              updateUserAPIKeyfetcher.data.data.response.apiStatus ||
              prevConfigs[activeModal].apiStatus,
          },
        }));
        handleClose();
        shopify.toast.show(t("openai.cs"));
      } else {
        setUserApiConfigs((prevConfigs) => ({
          ...prevConfigs,
          [activeModal]: {
            ...prevConfigs[activeModal],
            apiKey: "",
            limit: t("openai.ne"),
            keywords: "",
          },
        }));
        setApiKeyError(true);
        setApiKeyErrorMsg(t("The API key is not valid"));
      }
    }
  }, [updateUserAPIKeyfetcher.data]);

  useEffect(() => {
    if (testApiKeyfetcher.data) {
      if (testApiKeyfetcher.data.data.success) {
        setTranslation(testApiKeyfetcher.data.data.response);
        shopify.toast.show(t("openai.tcm"));
        // 翻译成功后，重新请求用户数据以刷新 usedToken
        loadingfetcher.submit(
          {
            loading: JSON.stringify({
              opportunity: "testTranslate",
              apiName: apiNames[activeModal].apiName,
            }),
          },
          {
            method: "POST",
            action: "/app/apikeySetting",
          },
        );
      } else {
        shopify.toast.show(t("openai.tf"));
      }
    }
  }, [testApiKeyfetcher.data]);

  // useEffect(() => {
  //   if (deleteUserAPIKeyfetcher?.data) {
  //     if (deleteUserAPIKeyfetcher?.data?.data?.success) {
  //       setUserData(deleteUserAPIKeyfetcher?.data?.data?.response);
  //       setUserData({
  //         ...userData,
  //         googleKey: "",
  //         amount: 0,
  //       });
  //       shopify.toast.show(t("Delete successfully"));
  //     } else {
  //       shopify.toast.show(t("Delete failed"));
  //     }
  //   }
  // }, [deleteUserAPIKeyfetcher.data]);

  // const handleDelete = () => {
  //   deleteUserAPIKeyfetcher.submit({
  //     deleteUserAPIKey: JSON.stringify(true),
  //   }, {
  //     method: "POST",
  //     action: "/app/apikeySetting",
  //   });
  // };

  return (
    <Page>
      <TitleBar title={t("Translate Settings")}>
        <button variant="breadcrumb" onClick={() => navigate("/app/translate")}>
          {t("Translate Store")}
        </button>
        <button variant="breadcrumb">{t("Translate Settings")}</button>
      </TitleBar>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
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
              variant="outlined"
              onClick={() => navigate("/app/translate")}
              style={{ padding: "4px" }}
            >
              <Icon source={ArrowLeftIcon} tone="base" />
            </Button>
            <Title style={{ fontSize: "1.25rem", margin: "0" }}>
              {t("Translate Settings")}
            </Title>
          </div>
        </div>
        {/* <div>
          <Text style={{ marginLeft: "8px" }}>{t("How to translate with api key? Please refer to")}</Text><Link to="https://ciwi.bogdatech.com/help/uncategorized/how-to-use-your-own-key-for-translation/" target="_blank" rel="noreferrer">{t("the Private API Translation Model User Manual")}</Link>
        </div> */}

        {/* <Skeleton.Button active style={{ height: "176px" }} block /> */}

        {/* <div style={{ marginLeft: "8px" }} >
          <Text >{t("When using this feature, we only consume the quota of the corresponding interface and will not charge any additional fees. To avoid exceeding the third-party API quota limits and incurring charges, please set the quota limits carefully.")}</Text>
        </div> */}
        <InlineGrid gap="800" columns={{ xs: 1, sm: 2, md: 2, lg: 2 }}>
          {apis.map((api) => (
            <ApiCard
              key={api.id}
              title={api.title}
              isLoading={isLoading}
              modelVersion={
                userApiConfigs[api.id].modelVersion?.replace("gpt", "GPT") || ""
              }
              apiStatus={userApiConfigs[api.id].apiStatus}
              limit={
                userApiConfigs[api.id].limit !== t("openai.ne")
                  ? `${userApiConfigs[api.id].usedToken}/${userApiConfigs[api.id].limit}`
                  : t("openai.ne")
              }
              onConfigure={() => handleConfigure(api.id)}
              onTestApi={() => handleTestApi(api.id)}
            />
          ))}
        </InlineGrid>
        {/* 弹出层 */}
        <Modal
          open={modalOpen}
          onClose={handleClose}
          title={t("openai.ca")}
          primaryAction={{
            content: t("openai.confirm"),
            onAction: handleConfirm,
            loading: updateUserAPIKeyfetcher.state === "submitting",
          }}
        >
          <Modal.Section>
            {activeModal === "openai" && (
              <Box paddingBlockEnd="600">
                <Select
                  label={t("openai.cv")}
                  options={chatGptVersions}
                  onChange={(val) => setTempModelVersion(val)}
                  value={tempModelVersion}
                />
              </Box>
            )}
            <TextField
              label="API Key"
              value={tempApiKey}
              placeholder={t("openai.pe")}
              onChange={(val) => setTempApiKey(val)}
              autoComplete="off"
            />
            <div
              style={{
                visibility: apiKeyError ? "visible" : "hidden",
                marginBottom: "4px",
              }}
            >
              <Text type="danger">
                <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                {apiKeyErrorMsg}
              </Text>
            </div>
            <Box>
              <TextField
                label={
                  activeModal === "google" ? t("openai.ls") : t("openai.lsgpt")
                }
                type="number"
                placeholder={t("openai.ps")}
                value={tempLimit}
                onChange={(val) => setTempLimit(val)}
                autoComplete="off"
              />
              <div style={{ marginTop: "10px", fontWeight: 500 }}>
                {t("openai.tips")}
              </div>
            </Box>
            <div
              style={{
                visibility: countError ? "visible" : "hidden",
              }}
            >
              <Text type="danger">
                <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                {t("Quota must be a positive number")}
              </Text>
            </div>

            {activeModal === "openai" && (
              <TextField
                label={t("openai.pw")}
                value={tempKeyWords}
                onChange={setTempKeyWords}
                multiline={4}
                autoComplete="off"
              />
            )}
            <div
              style={{
                visibility: keywordsError ? "visible" : "hidden",
                marginBottom: "4px",
              }}
            >
              <Text type="danger">
                <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                <span>{t("openai.fi")}</span>
              </Text>
            </div>
          </Modal.Section>
        </Modal>
        <Modal
          open={active}
          onClose={handleTestModalClose}
          title={t("openai.ta")}
          primaryAction={{
            content: t("openai.Translate"),
            onAction: handleTranslate,
            loading: testApiKeyfetcher.state === "submitting",
          }}
          secondaryActions={[
            {
              content: t("openai.Cancel"),
              onAction: handleTestModalClose,
            },
          ]}
        >
          <Modal.Section>
            <InlineStack align="center" blockAlign="center">
              <FormLayout>
                <Box width="500px">
                  {activeModal === "google" && (
                    <Box paddingBlockEnd="300">
                      <Select
                        label={t("openai.stl")}
                        options={googleTranslatorLanguage}
                        onChange={(val) => setTempTargetLanguage(val)}
                        value={tempTargetLanguage}
                      />
                    </Box>
                  )}
                  {activeModal === "openai" && (
                    <TextField
                      label={t("openai.pw")}
                      value={tempKeyWords}
                      onChange={setTempKeyWords}
                      autoComplete="off"
                      placeholder={t("openai.ip")}
                      multiline={4} // 4 行高度
                    />
                  )}
                  <div style={{ height: "20px" }}></div>
                  <TextField
                    label={t("openai.tc")}
                    value={content}
                    onChange={setContent}
                    autoComplete="off"
                    placeholder={t("openai.pec")}
                    multiline={4} // 4 行高度
                  />
                  <div style={{ height: "20px" }}></div>
                  <label>{t("openai.tr")}</label>
                  <textarea
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    autoComplete="off"
                    // placeholder={t('openai.trw')}
                    style={{
                      width: "100%",
                      height: "100px",
                      resize: "none",
                      padding: "10px",
                      userSelect: "none",
                      top: 0,
                      backgroundColor: "rgba(253, 253, 253, 1)",
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                      borderRadius: "10px",
                      border: "1px solid rgba(138, 138, 138, 1)",
                      color: "rgba(48, 48, 48, 1)",
                    }} // 禁用选中
                    readOnly // 只读
                    onFocus={(e) => e.target.blur()}
                  />
                </Box>
              </FormLayout>
            </InlineStack>
          </Modal.Section>
        </Modal>
      </Space>
    </Page>
  );
};

export default Index;
