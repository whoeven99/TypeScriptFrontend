import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Button, Card, Col, Modal, Row, Skeleton, Space, Table, Typography } from "antd";
import {
  Link,
  useFetcher,
  useNavigate,
} from "@remix-run/react";
import "./styles.css";
import { ShopLocalesType } from "../app.language/route";
import { useDispatch } from "react-redux";
import { setTableData } from "~/store/modules/languageTableData";
import { Suspense, useCallback, useEffect, useState } from "react";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import UserLanguageCard from "./components/userLanguageCard";
import { useTranslation } from "react-i18next";
import UserProfileCard from "./components/userProfileCard";
import PaymentModal from "~/components/paymentModal";
import PreviewModal from "~/components/previewModal";
import UserGuideCard from "~/routes/app._index/components/userGuideCard";
import ContactCard from "~/routes/app._index/components/contactCard";
import PreviewCard from "./components/previewCard";
import ScrollNotice from "~/components/ScrollNotice";

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

export interface WordsType {
  chars: number;
  totalChars: number;
}

export const loader = async () => {
  return null;
};

const Index = () => {
  // const [languageData, setLanguageData] = useState<LanguageDataType[]>([]);
  // const [languageSetting, setLanguageSetting] = useState<LanguageSettingType>();
  // const [user, setUser] = useState<UserType>();
  // const [loadingLanguage, setLoadingLanguage] = useState<boolean>(true);
  // const [limited, setLimited] = useState<boolean>(false);
  // const [paymentModalVisible, setPaymentModalVisible] =
  //   useState<boolean>(false);
  // const [previewModalVisible, setPreviewModalVisible] =
  //   useState<boolean>(false);
  // const [newUserModal, setNewUserModal] = useState<boolean>(false);
  // const [newUserModalLoading, setNewUserModalLoading] =
  //   useState<boolean>(false);
  // const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  // const loadingLanguageFetcher = useFetcher<any>();
  // const languageLocalInfoFetcher = useFetcher<any>();
  // const loadingUserFetcher = useFetcher<any>();
  // const initializationFetcher = useFetcher<any>();

  // useEffect(() => {
  //   const languageFormData = new FormData();
  //   languageFormData.append("languageData", JSON.stringify(true));
  //   loadingLanguageFetcher.submit(languageFormData, {
  //     method: "post",
  //     action: "/app",
  //   });
  //   // const userFormData = new FormData();
  //   // userFormData.append("userData", JSON.stringify(true));
  //   // loadingUserFetcher.submit(userFormData, {
  //   //   method: "post",
  //   //   action: "/app",
  //   // });
  //   shopify.loading(true);
  //   const installTime = localStorage.getItem('installTime')
  //   if (!installTime) {
  //     localStorage.setItem('installTime', new Date().toISOString());
  //   }
  // }, []);

  // useEffect(() => {
  //   if (loadingLanguageFetcher.data) {
  //     setLanguageData(loadingLanguageFetcher.data.data);
  //     setLanguageSetting(loadingLanguageFetcher.data.languageSetting);
  //     setLoadingLanguage(false);
  //     shopify.loading(false);
  //   }
  // }, [loadingLanguageFetcher.data]);


  // useEffect(() => {
  //   if (loadingUserFetcher.data) {
  //     setUser(loadingUserFetcher.data.data);
  //     if (!loadingUserFetcher.data.data?.plan) {
  //       // setNewUserModal(true);
  //     }
  //   }
  // }, [loadingUserFetcher.data]);

  // useEffect(() => {
  //   if (user && user.chars >= user.totalChars) {
  //     setLimited(true);
  //   }
  // }, [user]);

  // useEffect(() => {
  //   if (initializationFetcher.data && user) {
  //     if (initializationFetcher.data?.data) {
  //       setNewUserModal(false);
  //       setNewUserModalLoading(false);
  //       setUser({ ...user, totalChars: 50000 });
  //     }
  //   }
  // }, [initializationFetcher.data]);

  // useEffect(() => {
  //   if (languageData.length) {
  //     const data = languageData.map((lang) => ({
  //       key: lang.key,
  //       language: lang.name,
  //       localeName: lang.localeName,
  //       locale: lang.locale,
  //       primary: false,
  //       status: lang.status || 0,
  //       auto_update_translation: false,
  //       published: lang.published,
  //       loading: false,
  //     }));
  //     dispatch(setTableData(data)); // 只在组件首次渲染时触发
  //   }
  // }, [dispatch, languageData]);

  // const onClick = async () => {
  //   setNewUserModalLoading(true);
  //   const formData = new FormData();
  //   formData.append("initialization", JSON.stringify(true));
  //   initializationFetcher.submit(formData, {
  //     method: "post",
  //     action: "/app",
  //   });
  // };



  const columns = [
    {
      title: t("planCardTableList1.title"),
      dataIndex: "need",
      key: "need",
    },
    {
      title: t("planCardTableList2.title"),
      dataIndex: "votes",
      key: "votes",
    },
    {
      title: t("planCardTableList3.title"),
      dataIndex: "devStatus",
      key: "devStatus",
    },
  ];

  const data: {
    key: number;
    need: string;
    votes: number;
    devStatus: string;
  }[] = [
      {
        key: 1,
        need: t("devplanCard1.title"),
        votes: 100,
        devStatus: t("In development"),
      },
      {
        key: 2,
        need: t("devplanCard2.title"),
        votes: 35,
        devStatus: t("In development"),
      },
      {
        key: 3,
        need: t("devplanCard3.title"),
        votes: 35,
        devStatus: t("In development"),
      },
      {
        key: 4,
        need: t("devplanCard4.title"),
        votes: 25,
        devStatus: t("In development"),
      },
    ];

  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <Page>
        <TitleBar title={t("Dashboard")} />
        <ScrollNotice text={t("Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.")} />
        <Space direction="vertical" size="large" style={{ display: "flex" }}>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div style={{ paddingLeft: "8px" }}>
              <Title level={3}>
                {t("dashboard.title1")}
              </Title>
              <Text strong>
                {t("dashboard.description1")}
              </Text>
            </div>
            {/* {user ? (
            <UserProfileCard
              setPaymentModalVisible={setPaymentModalVisible}
              chars={user.chars}
              totalChars={user.totalChars}
            />
          ) : (
            <Skeleton active />
          )} */}
            <Card
              bordered={false}

            >
              <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                <Title level={4}>
                  {t("transLanguageCard1.title")}
                </Title>
                <Text >{t("transLanguageCard1.description")}</Text>
                <Button type="primary" onClick={() => navigate("/app/translate", { state: { from: "/app", selectedLanguageCode: "" } })}>{t("transLanguageCard1.button")}</Button>
              </Space>
            </Card>
            <Row gutter={16}>
              <Col xs={24} sm={24} md={12}>
                <Card
                  bordered={false}
                  style={{
                    height: "100%",
                  }}
                >
                  <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                    <Text strong>
                      {t("transLanguageCard2.title")}
                    </Text>
                    <Text >{t("transLanguageCard2.description")}</Text>
                    <Button type="primary" onClick={() => navigate("/app/manage_translation")}>{t("transLanguageCard2.button")}</Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={24} md={12}>
                <Card
                  bordered={false}
                  style={{
                    height: "100%",
                  }}
                >
                  <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                    <Text strong>
                      {t("transLanguageCard3.title")}
                    </Text>
                    <Text >{t("transLanguageCard3.description")}</Text>
                    <Button type="default" onClick={() => window.open("http://ciwi.bogdatech.com/meet-five-top-translation-experts-supporting-your-e-commerce-business/", "_blank")}>{t("transLanguageCard3.button")}</Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div style={{ paddingLeft: "8px" }}>
              <Title level={3}>
                {t("dashboard.title2")}
              </Title>
              <Text strong>
                {t("dashboard.description2")}
              </Text>
            </div>
            {/* {user ? (
            <UserProfileCard
              setPaymentModalVisible={setPaymentModalVisible}
              chars={user.chars}
              totalChars={user.totalChars}
            />
          ) : (
            <Skeleton active />
          )} */}
            <Card
              bordered={false}
            >
              <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                <Title level={4}>
                  {t("transCurrencyCard1.title")}
                </Title>
                <Text >{t("transCurrencyCard1.description")}</Text>
                <Button type="primary" onClick={() => navigate("/app/currency")}>{t("transCurrencyCard1.button")}</Button>
              </Space>
            </Card>
            <Row gutter={16}>
              <Col xs={24} sm={24} md={12}>
                <Card
                  bordered={false}
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  styles={{
                    body: {
                      display: "flex",
                      flexDirection: "column",
                      flex: 1
                    }
                  }}
                >
                  <Space direction="vertical" size="middle" style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flex: 1
                  }}>
                    <Text strong >
                      {t("transCurrencyCard2.title")}
                    </Text>
                    <Text >{t("transCurrencyCard2.description")}</Text>
                    {/* <div style={{ flex: 1 }} /> 添加弹性空间 */}
                    <Button type="default" onClick={() => window.open("http://ciwi.bogdatech.com/help/frequently-asked-question/how-to-set-up-multi-currency-pricing-on-your-shopify-store%ef%bc%9f/", "_blank")}>{t("transCurrencyCard2.button")}</Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={24} md={12}>
                <Card
                  bordered={false}
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Space direction="vertical" size="middle" style={{
                    display: "flex",
                    flex: 1
                  }}>
                    <Text strong>
                      {t("transCurrencyCard3.title")}
                    </Text>
                    <Text >{t("transCurrencyCard3.description")}</Text>
                    {/* <div style={{ flex: 1 }} /> 添加弹性空间 */}
                    <Button type="default" onClick={() => window.open("http://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-app-from-shopify-theme-customization-to-apply-the-language-currency-exchange-switcher/", "_blank")}>{t("transCurrencyCard3.button")}</Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div style={{ paddingLeft: "8px" }}>
              <Title level={3}>
                {t("dashboard.title3")}
              </Title>
              <Text strong>
                {t("dashboard.description3")}
              </Text>
            </div>
            {/* {user ? (
            <UserProfileCard
              setPaymentModalVisible={setPaymentModalVisible}
              chars={user.chars}
              totalChars={user.totalChars}
            />
          ) : (
            <Skeleton active />
          )} */}
            <Card
              bordered={false}
            >
              <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Title level={4}>
                    {t("planCard.title")}
                  </Title>
                  <Button type="primary" onClick={handleContactSupport}>{t("planCard.button")}</Button>
                </div>
                <Text >{t("planCard.description")}</Text>
                <Table
                  columns={columns}
                  dataSource={data}
                  pagination={false}
                />
              </Space>
            </Card>
            <Row gutter={16}>
              <Col xs={24} sm={24} md={12}>
                <ContactCard onClick={handleContactSupport} />
              </Col>
              <Col xs={24} sm={24} md={12}>
                <UserGuideCard />
              </Col>
            </Row>
            <PreviewCard />
          </Space>
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
        {/* <div style={{ paddingLeft: "8px" }}>
            <Title level={3}>
              {languageData.length}
              {t("available languages")}
            </Title>
            <div>
              <Text>{t("Your store's default language:")}</Text>
              {languageSetting && (
                <Text strong>
                  {languageSetting.primaryLanguage ? (
                    languageSetting.primaryLanguage
                  ) : (
                    <Skeleton active paragraph={{ rows: 0 }} />
                  )}
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
                        setPreviewModalVisible={setPreviewModalVisible}
                      // limited={limited}
                      />
                    )}
                  </Col>
                ))}
              </Row>
              <Text
                style={{
                  marginTop: "10px",
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
            </div>
          ) : (
            <NoLanguageSetCard />
          )}
        </Space>
        <PreviewModal
          visible={previewModalVisible}
          setVisible={setPreviewModalVisible}
        />
        {/* <Modal
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
            {t(
              "You have received 50,000 Credits, enabling you to translate into over 137 languages.",
            )}
          </Text>
        </Modal> */}
        {/* <PaymentModal
          visible={paymentModalVisible}
          setVisible={setPaymentModalVisible}
        /> */}
      </Page>
    </Suspense>
  );
};

export const handleContactSupport = () => {
  // 声明 tidioChatApi 类型
  interface Window {
    tidioChatApi?: {
      open: () => void;
    }
  }

  if ((window as Window)?.tidioChatApi) {
    (window as Window).tidioChatApi?.open();
  } else {
    console.warn('Tidio Chat API not loaded');
    // 备用方案：打开支持页面
    // window.open('https://apps.shopify.com/translator-by-ciwi/support', '_blank');
  }
};

export default Index;
