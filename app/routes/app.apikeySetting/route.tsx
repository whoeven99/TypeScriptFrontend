import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import { Button, Card, Input, message, Skeleton, Space, Typography } from "antd";
import { json, Link, useFetcher, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  ArrowLeftIcon
} from '@shopify/polaris-icons';
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { DeleteUserData, GetUserData, SaveGoogleKey } from "~/api/serve";
import { useEffect, useState, useRef } from "react";
import styles from './styles.module.css';
import { ExclamationCircleOutlined } from '@ant-design/icons';

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
        }
      case !!updateUserAPIKey:
        try {
          const { apiKey, count } = updateUserAPIKey;
          const data = await SaveGoogleKey({
            shop,
            apiKey,
            count,
          });
          return json({ data: data });
        } catch (error) {
          console.error("Error apiKeySetting action:", error);
        }
      case !!deleteUserAPIKey:
        try {
          const data = await DeleteUserData({
            shop,
          });
          return json({ data: data });
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
  const [userData, setUserData] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [count, setCount] = useState<string>("0");
  const [isEdit, setIsEdit] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [countError, setCountError] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<"warning" | "error" | "">("");
  const [countStatus, setCountStatus] = useState<"warning" | "error" | "">("");
  const [apiKeyErrorMsg, setApiKeyErrorMsg] = useState<string>(" The API key format is incorrect");

  const loadingfetcher = useFetcher<any>();
  const updateUserAPIKeyfetcher = useFetcher<any>();
  const deleteUserAPIKeyfetcher = useFetcher<any>();

  const { t } = useTranslation();
  const navigate = useNavigate();

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
        setUserData({
          ...userData,
          googleKey: updateUserAPIKeyfetcher.data.data.response.secret,
          amount: updateUserAPIKeyfetcher.data.data.response.amount,
        });
        setApiKey(updateUserAPIKeyfetcher.data.data.response.secret);
        setCount(updateUserAPIKeyfetcher.data.data.response.amount);
        setIsEdit(false);
      } else {
        setApiKeyError(true);
        setApiKeyStatus("error");
        setApiKeyErrorMsg(t("The API key is not valid"));
      }
    }
  }, [updateUserAPIKeyfetcher.data]);

  useEffect(() => {
    if (deleteUserAPIKeyfetcher?.data) {
      if (deleteUserAPIKeyfetcher?.data?.data?.success) {
        setUserData(deleteUserAPIKeyfetcher?.data?.data?.response);
        setApiKey("");
        setCount("");
        setUserData({
          ...userData,
          googleKey: "",
          amount: 0,
        });
        shopify.toast.show(t("Delete successfully"));
      } else {
        shopify.toast.show(t("Delete failed"));
      }
    }
  }, [deleteUserAPIKeyfetcher.data]);

  const handleSave = (values: { apiKey: string; count: string }) => {
    if (apiKey.length < 30) {
      setApiKeyError(true);
      setApiKeyStatus("error");
      setApiKeyErrorMsg(t("The API key format is incorrect"));
      return;
    }
    setApiKeyStatus("");
    setApiKeyError(false);

    const countNum = Number(count);
    if (isNaN(countNum) || countNum <= 0 || countNum > 2147483647) {
      setCountError(true);
      setCountStatus("error");
      return;
    }

    setCountStatus("");
    setCountError(false);

    updateUserAPIKeyfetcher.submit({
      updateUserAPIKey: JSON.stringify(values),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    });
  };

  const handleCancel = () => {
    setIsEdit(false);
    setApiKeyStatus("");
    setCountStatus("");
    setApiKeyError(false);
    setCountError(false);
    setApiKey(userData.googleKey);
    setCount(userData.amount);
  };

  const handleDelete = () => {
    deleteUserAPIKeyfetcher.submit({
      deleteUserAPIKey: JSON.stringify(true),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    });
  };

  const handleEdit = () => {
    setIsEdit(true);
    setApiKey('');
    setCount('');
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setCount(value);
      if (Number(value) > 2147483647) {
        setCount("2147483647");
      }
    }
  };

  return (
    <Page>
      <TitleBar title={t("Translate Settings")} >
        <button variant="breadcrumb" onClick={() => navigate("/app/translate")}>{t("Translate Store")}</button>
        <button variant="breadcrumb">{t("Translate Settings")}</button>
      </TitleBar>
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
          <Card className={styles.card}>
            <div className={styles.header}>
              <Title level={5}>Google Cloud Translation</Title>
              {isEdit ?
                <Space>
                  <Button type="default" onClick={handleCancel} loading={loadingfetcher.state === "submitting"}>
                    {t("Cancel")}
                  </Button>
                  <Button type="primary" onClick={() => handleSave({ apiKey: apiKey, count: count })} loading={updateUserAPIKeyfetcher.state === "submitting"}>
                    {t("Save")}
                  </Button>
                </Space>
                :
                <Space>
                  <Button disabled={!apiKey} onClick={handleDelete} loading={deleteUserAPIKeyfetcher.state === "submitting"}>
                    {t("Delete")}
                  </Button>
                  <Button onClick={handleEdit}>
                    {t("Edit")}
                  </Button>
                </Space>
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text strong style={{
                  whiteSpace: 'nowrap',
                  width: '50px'  // 固定宽度，根据实际文本长度调整
                }}>
                  {t("API Key")}
                </Text>
                <Input
                  placeholder={t("Please enter API Key")}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ flex: 1 }}  // 输入框占据剩余空间
                  disabled={!isEdit || loadingfetcher.state === "submitting"}
                  status={apiKeyStatus}
                />
              </div>
              {/* 错误提示放在下方，并且与输入框左对齐 */}
              <div style={{
                marginLeft: '60px',  // 80px(标签宽度) + 8px(间距)
                visibility: isEdit && apiKeyError ? 'visible' : 'hidden',
                marginBottom: '4px'
              }}>
                <Text type="danger">
                  <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                  {apiKeyErrorMsg}
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text strong style={{
                  whiteSpace: 'nowrap',
                  width: '50px'  // 固定宽度，根据实际文本长度调整
                }}>
                  {t("Quota")}
                </Text>
                <Input
                  placeholder={t("Please enter Quota")}
                  value={count}
                  onChange={handleCountChange}
                  style={{ flex: 1 }}  // 输入框占据剩余空间
                  disabled={!isEdit || loadingfetcher.state === "submitting"}
                  status={countStatus}
                />
              </div>
              {/* 错误提示放在下方，并且与输入框左对齐 */}
              <div style={{
                marginLeft: '60px',  // 80px(标签宽度) + 8px(间距)
                visibility: isEdit && countError ? 'visible' : 'hidden',
              }}>
                <Text type="danger">
                  <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                  {t('Quota must be a positive number')}
                </Text>
              </div>
            </div>
            {/* <Space size={[0, 8]} wrap>
              {tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space> */}
          </Card>
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
