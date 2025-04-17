import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Button, Card, Col, Row, Skeleton, Space, Table, Typography } from "antd";
import {
  Link,
  useNavigate,
} from "@remix-run/react";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import UserGuideCard from "./components/userGuideCard";
import ContactCard from "./components/contactCard";
import PreviewCard from "./components/previewCard";
import ScrollNotice from "~/components/ScrollNotice";
import { LoaderFunctionArgs } from "@remix-run/node";
import ProgressingCard from "~/components/progressingCard";

const { Title, Text } = Typography;

export interface WordsType {
  chars: number;
  totalChars: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return null;
}

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
  }, []);

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
        devStatus: t("Launched"),
      },
      {
        key: 2,
        need: t("devplanCard2.title"),
        votes: 35,
        devStatus: t("Launched"),
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
            <Card
              bordered={false}
            >
              <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                <Title level={4}>
                  {t("transLanguageCard1.title")}
                </Title>
                <Text >{t("transLanguageCard1.description")}</Text>
                {
                  loading ?
                    <Button type="primary" onClick={() => navigate("/app/translate", { state: { from: "/app", selectedLanguageCode: "" } })}>{t("transLanguageCard1.button")}</Button>
                    :
                    <Skeleton.Button active />
                }
              </Space>
            </Card>
            <ProgressingCard />
            <Row gutter={16}>
              <Col xs={24} sm={24} md={12}>
                <Card
                  bordered={false}
                  style={{
                    height: "100%",
                  }}
                  styles={{
                    body: {
                      height: "100%",
                    }
                  }}
                >
                  <div style={{ height: "100%", display: "flex", justifyContent: "space-between", flexDirection: "column" }}>
                    <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                      <Text strong>
                        {t("transLanguageCard2.title")}
                      </Text>
                      <Text >{t("transLanguageCard2.description")}</Text>
                    </Space>
                    {
                      loading ?
                        <Button type="primary" onClick={() => navigate("/app/language")} style={{ alignSelf: 'flex-start' }}>{t("transLanguageCard2.button")}</Button>
                        :
                        <Skeleton.Button active />
                    }
                  </div>
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
                    <div style={{ display: "flex", flexDirection: "row-reverse", gap: "10px", justifyContent: "flex-start" }}>
                      <img src="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/safeicon-min.png" alt="safe" style={{ width: "50px", height: "50px", borderRadius: "4px" }} />
                      <div style={{ marginRight: "auto" }}>
                        <div dangerouslySetInnerHTML={{ __html: t("transLanguageCard3.description1") }} />
                        <div dangerouslySetInnerHTML={{ __html: t("transLanguageCard3.description2") }} />
                        <div dangerouslySetInnerHTML={{ __html: t("transLanguageCard3.description3") }} />
                        <div dangerouslySetInnerHTML={{ __html: t("transLanguageCard3.description4") }} />
                        <div dangerouslySetInnerHTML={{ __html: t("transLanguageCard3.description5") }} />
                      </div>
                    </div>
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
            <Card
              bordered={false}
            >
              <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                <Title level={4}>
                  {t("transCurrencyCard1.title")}
                </Title>
                <Text >{t("transCurrencyCard1.description")}</Text>
                {
                  loading ?
                    <Button type="primary" onClick={() => navigate("/app/currency")}>{t("transCurrencyCard1.button")}</Button>
                    :
                    <Skeleton.Button active />
                }
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
                    {
                      loading ?
                        <Button type="default" onClick={() => window.open("https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-set-up-multi-currency-pricing-on-your-shopify-store%ef%bc%9f/", "_blank")}>{t("transCurrencyCard2.button")}</Button>
                        :
                        <Skeleton.Button active />
                    }
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
                    {
                      loading ?
                        <Button type="default" onClick={() => window.open("https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-app-from-shopify-theme-customization-to-apply-the-language-currency-exchange-switcher/", "_blank")}>{t("transCurrencyCard3.button")}</Button>
                        :
                        <Skeleton.Button active />
                    }
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
                  {
                    loading ?
                      <Button type="primary" onClick={handleContactSupport}>{t("planCard.button")}</Button>
                      :
                      <Skeleton.Button active />
                  }
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
              to="https://ciwi.bogdatech.com/help"
              target="_blank"
              style={{ margin: "0 5px" }}
            >
              {t("Ciwi Help Center")}
            </Link>
            {t("by")}
            <Link
              to={"https://ciwi.bogdatech.com/"}
              target="_blank"
              style={{ margin: "0 5px" }}
            >
              {t("Ciwi.ai")}
            </Link>
          </Text>
        </Space>
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
  }
};

export default Index;
