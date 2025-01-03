import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Col, Modal, Row, Skeleton, Space, Typography, Button } from "antd";
import { Link, useFetcher } from "@remix-run/react";
import "./styles.css";
import { ShopLocalesType } from "../app.language/route";
import { useDispatch } from "react-redux";
import { setTableData } from "~/store/modules/languageTableData";
import { Suspense, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import PaymentModal from "~/components/paymentModal";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import UserProfileCard from "./components/userProfileCard";
import UserLanguageCard from "./components/userLanguageCard";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

interface LanguageDataType {
  key: number;
  src: string[];
  name: string;
  locale: string;
  localeName: string;
  status: number;
  published: boolean;
}

interface LanguageSettingType {
  primaryLanguage: string;
  primaryLanguageCode: string;
  shopLanguagesWithoutPrimary: ShopLocalesType[];
  shopLanguageCodesWithoutPrimary: string[];
}

interface UserType {
  chars: number;
  totalChars: number;
}

export interface WordsType {
  chars: number;
  totalChars: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const Index = () => {
  const [languageData, setLanguageData] = useState<LanguageDataType[]>([]);
  const [languageSetting, setLanguageSetting] = useState<LanguageSettingType>();
  const [user, setUser] = useState<UserType>();
  const [loadingLanguage, setLoadingLanguage] = useState<boolean>(true);
  const [limited, setLimited] = useState<boolean>(false);
  const [paymentModalVisible, setPaymentModalVisible] =
    useState<boolean>(false);
  const [newUserModal, setNewUserModal] = useState<boolean>(false);
  const [newUserModalLoading, setNewUserModalLoading] =
    useState<boolean>(false);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const loadingLanguageFetcher = useFetcher<any>();
  const loadingUserFetcher = useFetcher<any>();
  const initializationFetcher = useFetcher<any>();

  useEffect(() => {
    const languageFormData = new FormData();
    languageFormData.append("languageData", JSON.stringify(true));
    loadingLanguageFetcher.submit(languageFormData, {
      method: "post",
      action: "/app",
    });
    const userFormData = new FormData();
    userFormData.append("userData", JSON.stringify(true));
    loadingUserFetcher.submit(userFormData, {
      method: "post",
      action: "/app",
    });
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingLanguageFetcher.data) {
      setLanguageData(loadingLanguageFetcher.data.data);
      setLanguageSetting(loadingLanguageFetcher.data.languageSetting);
      setLoadingLanguage(false);
      shopify.loading(false);
    }
  }, [loadingLanguageFetcher.data]);

  useEffect(() => {
    if (loadingUserFetcher.data) {
      setUser(loadingUserFetcher.data.data);
      if (!loadingUserFetcher.data.data?.plan) {
        setNewUserModal(true);
      }
    }
  }, [loadingUserFetcher.data]);

  useEffect(() => {
    if (user && user.chars >= user.totalChars) {
      setLimited(true);
    }
  }, [user]);

  useEffect(() => {
    if (initializationFetcher.data && user) {
      if (initializationFetcher.data?.data) {
        setNewUserModal(false);
        setNewUserModalLoading(false);
        setUser({ ...user, totalChars: 50000 });
      }
    }
  }, [initializationFetcher.data]);

  useEffect(() => {
    if (languageData.length) {
      const data = languageData.map((lang) => ({
        key: lang.key,
        language: lang.name,
        localeName: lang.localeName,
        locale: lang.locale,
        primary: false,
        status: lang.status || 0,
        auto_update_translation: false,
        published: lang.published,
        loading: false,
      }));
      dispatch(setTableData(data)); // 只在组件首次渲染时触
    }
  }, [dispatch, languageData]);

  const onClick = async () => {
    setNewUserModalLoading(true);
    const formData = new FormData();
    formData.append("initialization", JSON.stringify(true));
    initializationFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  };

  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <Page>
        <TitleBar title={t("Dashboard")} />
        <BlockStack gap="500">
          <div>
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <div style={{ paddingLeft: "8px" }}>
                <Title level={3}>
                  {t("Faster, higher-quality localization translation tool")}
                </Title>
              </div>
              {user ? (
                <UserProfileCard
                  setPaymentModalVisible={setPaymentModalVisible}
                  chars={user.chars}
                  totalChars={user.totalChars}
                />
              ) : (
                <Skeleton active />
              )}
              <div style={{ paddingLeft: "8px" }}>
                <Title level={3}>
                  {languageData.length}
                  {t("available languages")}
                </Title>
                <div>
                  <Text>{t("Your store’s default language:")}</Text>
                  {languageSetting && (
                    <Text strong>
                      {languageSetting.primaryLanguage
                        ? languageSetting.primaryLanguage
                        : t("No primary language set")}
                    </Text>
                  )}
                </div>
              </div>
              {loadingLanguage ? (
                <Skeleton active />
              ) : languageData.length != 0 ? (
                <div>
                  <Row gutter={[16, 16]}>
                    {languageData.map((language: any, index: number) => (
                      <Col span={8} key={index}>
                        {languageSetting && (
                          <UserLanguageCard
                            flagUrl={language.src.slice(0, 4)}
                            primaryLanguageCode={
                              languageSetting.primaryLanguageCode
                            }
                            languageLocaleName={language.localeName}
                            languageName={language.name}
                            languageCode={language.locale}
                            limited={limited}
                          />
                        )}
                      </Col>
                    ))}
                  </Row>
                </div>
              ) : (
                <NoLanguageSetCard />
              )}
              <Text
                style={{
                  display: "flex", // 使用 flexbox 来布局
                  justifyContent: "center", // 水平居中
                }}
              >
                {t("Learn more in")}
                <Link
                  to="http://ciwi.bogdatech.com/help"
                  target="_blank"
                  style={{ margin: "0 5px" }}
                >
                  {t("Ciwi Help Center")}
                </Link>
                {t("by")}
                <Link
                  to={"http://ciwi.bogdatech.com/"}
                  target="_blank"
                  style={{ margin: "0 5px" }}
                >
                  {t("Ciwi.ai")}
                </Link>
              </Text>
            </Space>
            <Modal
              open={newUserModal}
              footer={
                <Button
                  type="primary"
                  onClick={onClick}
                  loading={newUserModalLoading}
                  disabled={newUserModalLoading}
                >
                  {t("OK")}
                </Button>
              }
              closable={false} // 禁用关闭按钮
              maskClosable={false} // 禁用点击遮罩关闭
              keyboard={false} // 禁用按 Esc 键关闭
            >
              <Title level={4}>{t("Congratulations!")}</Title>
              <Text>
                {t("You have received 50,000 Credits, enabling you to translate into over 137 languages.")}
              </Text>
            </Modal>
            <PaymentModal
              visible={paymentModalVisible}
              setVisible={setPaymentModalVisible}
            />
          </div>
        </BlockStack>
      </Page>
    </Suspense>
  );
};

export default Index;
