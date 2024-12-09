import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Col, Modal, Row, Skeleton, Space, Typography, Button } from "antd";
import { useFetcher } from "@remix-run/react";
import "./styles.css";
import { ShopLocalesType } from "../app.language/route";
import { useDispatch } from "react-redux";
import { setTableData } from "~/store/modules/languageTableData";
import { lazy, Suspense, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import PaymentModal from "~/components/paymentModal";
import NoLanguageSetCard from "~/components/noLanguageSetCard";

const UserProfileCard = lazy(() => import("./components/userProfileCard"));
const UserLanguageCard = lazy(() => import("./components/userLanguageCard"));

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

interface UserType {
  chars: number;
  totalChars: number;
  primaryLanguage: string;
  primaryLanguageCode: string;
  shopLanguagesWithoutPrimary: ShopLocalesType[];
  shopLanguageCodesWithoutPrimary: string[];
}

interface FetchType {
  languageData: LanguageDataType[];
  user: UserType;
  plan: boolean;
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
  const [paymentModalVisible, setPaymentModalVisible] =
    useState<boolean>(false);

  const [user, setUser] = useState<UserType>();
  const [loading, setLoading] = useState<boolean>(true);
  const [newUserModal, setNewUserModal] = useState<boolean>(false);
  const [newUserModalLoading, setNewUserModalLoading] =
    useState<boolean>(false);
  const dispatch = useDispatch();
  const loadingFetcher = useFetcher<FetchType>();
  const initializationFetcher = useFetcher<any>();

  useEffect(() => {
    const formData = new FormData();
    formData.append("index", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      setLanguageData(loadingFetcher.data.languageData);
      setUser(loadingFetcher.data.user);
      shopify.loading(false);
      setLoading(false);
      if (!loadingFetcher.data.plan) {
        setNewUserModal(true);
      }
    }
  }, [loadingFetcher.data]);

  useEffect(() => {
    if (initializationFetcher.data && user) {
      if (initializationFetcher.data?.data) {
        setNewUserModal(false);
        setNewUserModalLoading(false);
        setUser({ ...user, totalChars: 20000 });
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
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        {loading ? (
          <div>loading...</div>
        ) : (
          <div>
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <div style={{ paddingLeft: "8px" }}>
                <Title level={3}>
                  Faster, higher-quality localization translation tool
                </Title>
              </div>
              <Suspense fallback={<Skeleton active />}>
                {user && (
                  <UserProfileCard
                    setPaymentModalVisible={setPaymentModalVisible}
                    chars={user.chars}
                    totalChars={user.totalChars}
                  />
                )}
              </Suspense>
              <div style={{ paddingLeft: "8px" }}>
                <Title level={3}>
                  {languageData.length} alternative languages
                </Title>
                <div>
                  <Text>Your store’s default language: </Text>
                  {user && (
                    <Text strong>
                      {user.primaryLanguage
                        ? user.primaryLanguage
                        : "No primary language set"}
                    </Text>
                  )}
                </div>
              </div>
              {languageData.length ? (
                <div>
                  <Row gutter={[16, 16]}>
                    {languageData.map((language: any, index: number) => (
                      <Col span={8} key={index}>
                        <Suspense fallback={<Skeleton active />}>
                          {user && (
                            <UserLanguageCard
                              flagUrl={language.src.slice(0, 4)}
                              primaryLanguageCode={user.primaryLanguageCode}
                              languageName={language.name}
                              languageCode={language.locale}
                            />
                          )}
                        </Suspense>
                      </Col>
                    ))}
                  </Row>
                </div>
              ) : (
                <NoLanguageSetCard />
              )}
            </Space>
            <Modal
              open={newUserModal}
              footer={
                <Button
                  onClick={onClick}
                  loading={newUserModalLoading}
                  disabled={newUserModalLoading}
                >
                  OK
                </Button>
              }
              closable={false} // 禁用关闭按钮
              maskClosable={false} // 禁用点击遮罩关闭
              keyboard={false} // 禁用按 Esc 键关闭
            >
              <Title level={4}>Congratulations!</Title>
              <Text>
                You have received 20,000 characters, enabling you to translate
                into over 137 languages.
              </Text>
            </Modal>
            <PaymentModal
              visible={paymentModalVisible}
              setVisible={setPaymentModalVisible}
            />
          </div>
        )}
      </BlockStack>
    </Page>
  );
};

export default Index;
