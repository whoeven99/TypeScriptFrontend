import { Col, Row, Space, Table, Typography } from "antd";
import { useTranslation } from "react-i18next";
import PlanCard from "./components/planCard";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";

const { Text } = Typography;

export const loader = async () => {
  return null;
};

const Index = () => {
  const { t } = useTranslation();

  const pricingData = [
    {
      title: t("Free"),
      price: 0,
      descriptions: [
        t("Translation function: allows adding more than 200 languages"),
        t("Support Google machine translation"),
        t("No need to wait for translation"),
        t("Support email communication"),
      ],
      selected: true,
      recommended: "",
    },
    {
      title: t("Basic"),
      price: 9.9,
      descriptions: [
        t("500,000 credits (for AI translation)"),
        t(
          "Translation function: In addition to Google, support OpenAI and DeepL translation",
        ),
        t("Manually edit 20 languages"),
        t(
          "Currency conversion: Automatic conversion, support currencies of 168 countries",
        ),
        t("Support language and currency converter"),
        t("Vocabulary: Maximum increase of 5 items"),
        t(
          "Third-party app translation: Support using Google Translate third-party app",
        ),
        t("Free trial: 3 days"),
        t("Support email and livechat communication (3h response)"),
      ],
      selected: false,
      recommended: "rgb(48,48,48)",
    },
    {
      title: t("Pro"),
      price: 19.9,
      descriptions: [
        t("1,000,000 credits (for AI translation)"),
        t(
          "Translation function: In addition to Google, support OpenAI and DeepL translation",
        ),
        t("Manually edit 20 languages"),
        t(
          "Currency conversion: automatic conversion, supports currencies of 168 countries",
        ),
        t("Support language and currency converter"),
        t("Vocabulary: up to 20 items"),
        t(
          "Third-party app translation: support using Google Translate third-party app",
        ),
        t("Free trial: 3 days"),
        t("Support email and livechat communication (1h response)"),
        t(
          "SEO optimization: optimize handle, title and meta information, alt information",
        ),
      ],
      selected: false,
      recommended: "",
    },
  ];

  const data = [
    {
      key: "0",
      category: "USAGE",
      Free: "",
      Basic: "",
      Pro: "",
    },
    {
      key: "1",
      category: "translation tools",
      Free: "Google",
      Basic: "Google\nOpenAI\nDeepL",
      Pro: "Google\nOpenAI\nDeepL",
    },
    {
      key: "2",
      category: "Translation word quota",
      Free: "Unlimited",
      Basic: "Unlimited(Google)\n500,000 Credits/time(OpenAI & DeepL)",
      Pro: "Unlimited(Google)\n1,000,000 Credits/time(OpenAI & DeepL)",
    },
    {
      key: "3",
      category: "Translated Languages",
      Free: "200+",
      Basic: "200+",
      Pro: "200+",
    },
    {
      key: "4",
      category: "Currency",
      Free: "168",
      Basic: "168",
      Pro: "168",
    },
    {
      key: "5",
      category: "Additional words purchase",
      Free: "-",
      Basic: "√",
      Pro: "√",
    },
    {
      key: "6",
      category: "TRANSLATION",
      Free: "",
      Basic: "",
      Pro: "",
    },
    {
      key: "7",
      category: "Edit translation",
      Free: "-",
      Basic: "20",
      Pro: "20",
    },
    {
      key: "8",
      category: "Shopify apps translation",
      Free: "-",
      Basic: "√",
      Pro: "√",
    },
    {
      key: "9",
      category: "Switcher",
      Free: "√",
      Basic: "√",
      Pro: "√",
    },
    {
      key: "10",
      category: "Multilingual SEO",
      Free: "-",
      Basic: "-",
      Pro: "√",
    },
    {
      key: "11",
      category: "Glossary",
      Free: "-",
      Basic: "5",
      Pro: "20",
    },
    {
      key: "12",
      category: "CURRENCY",
      Free: "",
      Basic: "",
      Pro: "",
    },
    {
      key: "13",
      category: "Currency rounding",
      Free: "-",
      Basic: "√",
      Pro: "√",
    },
    {
      key: "14",
      category: "Custom currency rates",
      Free: "-",
      Basic: "√",
      Pro: "√",
    },
    {
      key: "15",
      category: "SUPPORT & SERVICES",
      Free: "",
      Basic: "",
      Pro: "",
    },
    {
      key: "16",
      category: "Email & live chat",
      Free: "Email",
      Basic: "Email & live chat (3h response)",
      Pro: "Email & live chat (1h response)",
    },
    {
      key: "17",
      category: "Manual verification",
      Free: "-",
      Basic: "√",
      Pro: "√",
    },
  ];

  const columns = [
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: "25%",
      render: (_: any, record: any) => {
        return <Text strong>{record.category}</Text>;
      },
    },
    {
      title: "Free",
      dataIndex: "Free",
      key: "Free",
      width: "25%",
    },
    {
      title: "Basic",
      dataIndex: "Basic",
      key: "Basic",
      width: "25%",
    },
    {
      title: "Pro",
      dataIndex: "Pro",
      key: "Pro",
      width: "25%",
    },
  ];

  const setRowClassName = (record: any) => {
    // 示例：根据行号或条件返回不同的类名
    if (
      record.category === "TRANSLATION" ||
      record.category === "USAGE" ||
      record.category === "SUPPORT & SERVICES" ||
      record.category === "CURRENCY"
    ) {
      return "translation-row"; // 给 TRANSLATION 分类行加特殊背景色
    }
    return "";
  };

  return (
    <Page>
      <TitleBar title={t("Pricing")} />
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <div>
          <Row gutter={[16, 16]}>
            {pricingData.map((plan: any, index: number) => (
              <Col span={8} key={index}>
                <PlanCard
                  title={plan.title}
                  price={plan.price}
                  descriptions={plan.descriptions}
                  selected={plan.selected}
                  recommended={plan.recommended}
                />
              </Col>
            ))}
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          rowClassName={setRowClassName} // 动态设置行类名
        />
      </Space>
      <style>
        {`
          .translation-row {
            background-color: rgb(250,250,250);
          }
        `}
      </style>
    </Page>
  );
};

export default Index;
