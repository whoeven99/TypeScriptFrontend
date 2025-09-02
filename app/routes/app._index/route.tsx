import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Button,
  Card,
  Col,
  Row,
  Skeleton,
  Space,
  Table,
  Typography,
} from "antd";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UserGuideCard from "./components/userGuideCard";
import ContactCard from "./components/contactCard";
import PreviewCard from "./components/previewCard";
import ScrollNotice from "~/components/ScrollNotice";
import { LoaderFunctionArgs } from "@remix-run/node";
import ProgressingCard from "~/components/progressingCard";
import { authenticate } from "~/shopify.server";
import WelcomeCard from "./components/welcomeCard";

const { Title, Text } = Typography;

export interface WordsType {
  chars: number;
  totalChars: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const language =request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const languageCode = language.split("-")[0];
  var isChinese = languageCode === "zh" || languageCode === "zh-CN";

  return {
    isChinese: isChinese,
    ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
    ciwiSwitcherBlocksId: process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
    server: process.env.SERVER_URL,
    shop: shop,
  };
};

const handleContactSupport = () => {
  interface Window {
    tidioChatApi?: {
      open: () => void;
    };
  }

  if ((window as Window)?.tidioChatApi) {
    (window as Window).tidioChatApi?.open();
  } else {
    console.warn("Tidio Chat API not loaded");
  }
};

const SectionHeader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div style={{ paddingLeft: "8px" }}>
      <Title level={3}>{title}</Title>
      <Text strong>{description}</Text>
    </div>
  );
};

const LanguageCardLeft = ({ isLoading }: { isLoading: boolean }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card style={{ height: "100%" }} styles={{ body: { height: "100%" } }}>
      <div style={{
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        flexDirection: "column",
      }}>
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <Text strong>{t("transLanguageCard2.title")}</Text>
          <Text>{t("transLanguageCard2.description")}</Text>
        </Space>
        {isLoading ? (
          <Skeleton.Button active />
        ) : (
          <Button
            onClick={() => navigate("/app/language")}
            style={{ marginLeft: "auto", alignSelf: "flex-start" }}
          >
            {t("transLanguageCard2.button")}
          </Button>
        )}
      </div>
    </Card>
  );
};

const LanguageCardRight = () => {
  const { t } = useTranslation();

  return (
    <Card style={{ height: "100%" }}>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <Text strong>{t("transLanguageCard3.title")}</Text>
        <div style={{
          display: "flex",
          flexDirection: "row-reverse",
          gap: "10px",
          justifyContent: "flex-start",
        }}>
          <img
            src="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/safeicon-min.png"
            alt="safe"
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "4px",
            }}
          />
          <div style={{ marginRight: "auto" }}>
            {[1, 2, 3, 4, 5].map((num) => (
              <div
                key={num}
                dangerouslySetInnerHTML={{
                  __html: t(`transLanguageCard3.description${num}`),
                }}
              />
            ))}
          </div>
        </div>
      </Space>
    </Card>
  );
};

const CurrencyCard = ({ isLoading, url }: { isLoading: boolean, url: string }) => {
  const { t } = useTranslation();

  return (
    <Card
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Space
        direction="vertical"
        size="middle"
        style={{
          display: "flex",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        <Text strong>{t("transCurrencyCard2.title")}</Text>
        <Text>{t("transCurrencyCard2.description")}</Text>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {isLoading ? (
            <Skeleton.Button active />
          ) : (
            <Button
              onClick={() =>
                window.open(
                  url,
                  "_blank",
                )
              }
            >
              {t("transCurrencyCard2.button")}
            </Button>
          )}
        </div>
      </Space>
    </Card>
  );
};

// 内部组件：PlanCard
const PlanCard = ({ isLoading }: { isLoading: boolean }) => {
  const { t } = useTranslation();

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

  const data = [
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
    <Card>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <Title level={4}>{t("planCard.title")}</Title>
          {isLoading ? (
            <Skeleton.Button active />
          ) : (
            <Button onClick={handleContactSupport}>
              {t("planCard.button")}
            </Button>
          )}
        </div>
        <Text>{t("planCard.description")}</Text>
        <Table columns={columns} dataSource={data} pagination={false} />
      </Space>
    </Card>
  );
};

// 内部组件：FooterLinks
const FooterLinks = () => {
  const { t } = useTranslation();

  return (
    <Text style={{ display: "flex", justifyContent: "center" }}>
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
  );
};

// 主组件
const Index = () => {
  const { isChinese, server, shop, ciwiSwitcherBlocksId, ciwiSwitcherId } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(true);
  const [switcherLoading, setSwitcherLoading] = useState(true);
  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/ciwi_I18n_Switcher`,
    [shop, ciwiSwitcherBlocksId],
  );

  const themeFetcher = useFetcher<any>();

  useEffect(() => {
    setIsLoading(false);
    themeFetcher.submit(
      {
        theme: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app/currency",
      },
    );
  }, []);

  useEffect(() => {
    if (themeFetcher.data) {
      const switcherData =
        themeFetcher.data.data?.nodes?.[0]?.files?.nodes?.[0]?.body?.content;
      if (switcherData) {
        const jsonString = switcherData.replace(/\/\*[\s\S]*?\*\//g, "").trim();
        try {
          const blocks = JSON.parse(jsonString)?.current?.blocks;
          if (blocks) {
            const switcherJson: any = Object.values(blocks).find(
              (block: any) => block.type === ciwiSwitcherBlocksId,
            );
            if (switcherJson) {
              if (!switcherJson.disabled) {
                setSwitcherOpen(false);
                localStorage.setItem("switcherEnableCardOpen", "false");
              } else {
                setSwitcherOpen(true);
                localStorage.setItem("switcherEnableCardOpen", "true");
              }
            }
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      }
      setSwitcherLoading(false);
    }
  }, [themeFetcher.data]);

  return (
    <Page>
      <TitleBar title={t("Dashboard")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space
        direction="vertical"
        size="large"
        style={{ 
          display: "flex",
          overflowX: "hidden",
        }}
      >
        <WelcomeCard
          switcherOpen={switcherOpen}
          blockUrl={blockUrl}
          loading={switcherLoading}
        />
        
        {/* 语言部分 */}
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <SectionHeader
            title={t("dashboard.title1")}
            description={t("dashboard.description1")}
          />
          
          <Card>
            <Space direction="vertical" size="middle" style={{ display: "flex" }}>
              <Title level={4}>{t("transLanguageCard1.title")}</Title>
              <Text>{t("transLanguageCard1.description")}</Text>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {isLoading ? (
                  <Skeleton.Button active />
                ) : (
                  <Button
                    type="primary"
                    onClick={() =>navigate("/app/translate", {
                        state: { from: "/app", selectedLanguageCode: "" },
                      })
                    }
                  >
                    {t("transLanguageCard1.button")}
                  </Button>
                )}
              </div>
            </Space>
          </Card>
          
          <ProgressingCard shop={shop} server={server || ""} />
          
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <LanguageCardLeft isLoading={isLoading} />
            </Col>
            <Col xs={24} sm={24} md={12}>
              <LanguageCardRight />
            </Col>
          </Row>
        </Space>
        
        {/* 货币部分 */}
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <SectionHeader
            title={t("dashboard.title2")}
            description={t("dashboard.description2")}
          />
          
          <Card>
            <Space direction="vertical" size="middle" style={{ display: "flex" }}>
              <Title level={4}>{t("transCurrencyCard1.title")}</Title>
              <Text>{t("transCurrencyCard1.description")}</Text>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {isLoading ? (
                  <Skeleton.Button active />
                ) : (
                  <Button
                    type="primary"
                    onClick={() => navigate("/app/currency")}
                  >
                    {t("transCurrencyCard1.button")}
                  </Button>
                )}
              </div>
            </Space>
          </Card>
          
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <CurrencyCard isLoading={isLoading} url = "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-set-up-multi-currency-pricing-on-your-shopify-store%ef%bc%9f/"/>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <CurrencyCard isLoading={isLoading} url = "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-app-from-shopify-theme-customization-to-apply-the-language-currency-exchange-switcher/" />
            </Col>
          </Row>
        </Space>
        
        {/* 用户支持 */}
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <SectionHeader
            title={t("dashboard.title3")}
            description={t("dashboard.description3")}
          />
          
          <PlanCard isLoading={isLoading} />
          
          {/* 联系 + 用户指南 */}
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <ContactCard
                isChinese={isChinese}
                onClick={handleContactSupport}
              />
            </Col>
            <Col xs={24} sm={24} md={12}>
              <UserGuideCard />
            </Col>
          </Row>
          
          {/* 这是啥？ */}
          <PreviewCard />
        </Space>
        
        <FooterLinks />
      </Space>
    </Page>
  );
};

export default Index;