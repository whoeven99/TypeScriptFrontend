import { Icon, Page } from "@shopify/polaris";
import {
  Flex,
  Card,
  Checkbox,
  CheckboxChangeEvent,
  Divider,
  Space,
  Typography,
  Radio,
  Popconfirm,
  Button,
  Badge,
  Popover,
  Select,
} from "antd";
import { useTranslation } from "react-i18next";
import { LanguagesDataType } from "~/routes/app.language/route";
import { PlusIcon } from "@shopify/polaris-icons";
import defaultStyles from "../../styles/defaultStyles.module.css";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "@remix-run/react";
import { apiKeyConfiguration } from "../route";

const { Title, Text } = Typography;

interface ToneSettingCardProps {
  toneSettingCardShow: boolean;
  translateSettings2: string[];
  setTranslateSettings2: (e: string[]) => void;
  translateSettings4: {
    option1: string;
    option2: string;
    option3: string;
    option4: string;
    option5: string;
  };
  setTranslateSettings4: (e: {
    option1: string;
    option2: string;
    option3: string;
    option4: string;
    option5: string;
  }) => void;
}

const ToneSettingCard = ({
  toneSettingCardShow,
  translateSettings2,
  setTranslateSettings2,
  translateSettings4,
  setTranslateSettings4,
}: ToneSettingCardProps) => {
  if (!toneSettingCardShow) return;

  const { t } = useTranslation();

  const translateSettings2Options = [
    {
      label: t("General"),
      value: "1",
    },
    {
      label: t("Fashion & Apparel"),
      value: "2",
    },
    {
      label: t("Electronics & Technology"),
      value: "3",
    },
    {
      label: t("Home Goods & Daily Essentials"),
      value: "4",
    },
    {
      label: t("Pet Supplies"),
      value: "5",
    },
    {
      label: t("Beauty & Personal Care"),
      value: "6",
    },
    {
      label: t("Furniture & Gardening"),
      value: "7",
    },
    {
      label: t("Hardware & Tools"),
      value: "8",
    },
    {
      label: t("Baby & Toddler Products"),
      value: "9",
    },
    {
      label: t("Toys & Games"),
      value: "10",
    },
    {
      label: t("Luggage & Accessories"),
      value: "11",
    },
    {
      label: t("Health & Nutrition"),
      value: "12",
    },
    {
      label: t("Outdoor & Sports"),
      value: "13",
    },
    {
      label: t("Crafts & Small Goods"),
      value: "14",
    },
    {
      label: t("Home Appliances"),
      value: "15",
    },
    {
      label: t("Automotive Parts"),
      value: "16",
    },
  ];

  return (
    <Card
      style={{
        width: "100%",
        minHeight: "222px",
        marginBottom: "16px",
      }}
    >
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <div>
            <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
              {t("translateSettings4.title")}
            </Title>
            <Text type="secondary">{t("translateSettings4.description")}</Text>
          </div>
          <Space direction="vertical" style={{ width: "100%" }}>
            <div>
              <Text>{t("translateSettings4.title1")}</Text>
              <Select
                defaultActiveFirstOption={true}
                options={[
                  {
                    label: "",
                    value: "",
                  },
                  {
                    label: t("Formal"),
                    value: "Formal",
                  },
                  {
                    label: t("Neutral"),
                    value: "Neutral",
                  },
                  {
                    label: t("Casual"),
                    value: "Casual",
                  },
                  {
                    label: t("Youthful"),
                    value: "Youthful",
                  },
                  {
                    label: t("Luxury"),
                    value: "Luxury",
                  },
                ]}
                style={{
                  width: "100%",
                }}
                onSelect={(e) =>
                  setTranslateSettings4({
                    ...translateSettings4,
                    option1: e,
                  })
                }
              />
            </div>
            <div>
              <Text>{t("translateSettings4.title2")}</Text>
              <Select
                defaultActiveFirstOption={true}
                options={[
                  {
                    label: "",
                    value: "",
                  },
                  {
                    label: t("Apple – Minimal & premium (Tech/design)"),
                    value: "Apple – Minimal & premium (Tech/design)",
                  },
                  {
                    label: t("Samsung – Innovative & versatile (Electronics)"),
                    value: "Samsung – Innovative & versatile (Electronics)",
                  },
                  {
                    label: t("Nike – Bold & empowering (Sportswear)"),
                    value: "Nike – Bold & empowering (Sportswear)",
                  },
                  {
                    label: t("Adidas – Dynamic & inclusive (Activewear)"),
                    value: "Adidas – Dynamic & inclusive (Activewear)",
                  },
                  {
                    label: t(
                      "Patagonia – Ethical & adventurous (Outdoor gear)",
                    ),
                    value: "Patagonia – Ethical & adventurous (Outdoor gear)",
                  },
                  {
                    label: t("Zara – Modern & chic (Womenswear)"),
                    value: "Zara – Modern & chic (Womenswear)",
                  },
                  {
                    label: t("H&M – Trendy & casual (Fast fashion)"),
                    value: "H&M – Trendy & casual (Fast fashion)",
                  },
                  {
                    label: t("Dior – Feminine & luxurious (High fashion)"),
                    value: "Dior – Feminine & luxurious (High fashion)",
                  },
                  {
                    label: t("Uniqlo – Simple & comfortable (Everyday basics)"),
                    value: "Uniqlo – Simple & comfortable (Everyday basics)",
                  },
                  {
                    label: t("Ralph Lauren – Timeless & masculine (Menswear)"),
                    value: "Ralph Lauren – Timeless & masculine (Menswear)",
                  },
                  {
                    label: t("Uniqlo – Clean & functional (Essentials)"),
                    value: "Uniqlo – Clean & functional (Essentials)",
                  },
                  {
                    label: t(
                      "Tommy Hilfiger – Classic & youthful (Men's fashion)",
                    ),
                    value:
                      "Tommy Hilfiger – Classic & youthful (Men's fashion)",
                  },
                  {
                    label: t("Tiffany – Elegant & romantic (Jewelry)"),
                    value: "Tiffany – Elegant & romantic (Jewelry)",
                  },
                  {
                    label: t("Cartier – Luxurious & timeless (Fine jewelry)"),
                    value: "Cartier – Luxurious & timeless (Fine jewelry)",
                  },
                  {
                    label: t(
                      "Swarovski – Sparkling & accessible (Fashion jewelry)",
                    ),
                    value:
                      "Swarovski – Sparkling & accessible (Fashion jewelry)",
                  },
                  {
                    label: t("L'Oréal – Confident & universal (Beauty)"),
                    value: "L'Oréal – Confident & universal (Beauty)",
                  },
                  {
                    label: t("Estée Lauder – Elegant & premium (Skincare)"),
                    value: "Estée Lauder – Elegant & premium (Skincare)",
                  },
                  {
                    label: t("Fenty Beauty – Bold & inclusive (Cosmetics)"),
                    value: "Fenty Beauty – Bold & inclusive (Cosmetics)",
                  },
                  {
                    label: t("Pampers – Caring & reassuring (Baby care)"),
                    value: "Pampers – Caring & reassuring (Baby care)",
                  },
                  {
                    label: t("Mustela – Gentle & safe (Baby skincare)"),
                    value: "Mustela – Gentle & safe (Baby skincare)",
                  },
                  {
                    label: t("IKEA – Practical & family-friendly (Home)"),
                    value: "IKEA – Practical & family-friendly (Home)",
                  },
                  {
                    label: t("Dyson – Innovative & sleek (Appliances)"),
                    value: "Dyson – Innovative & sleek (Appliances)",
                  },
                  {
                    label: t("Philips – Smart & reliable (Home tech)"),
                    value: "Philips – Smart & reliable (Home tech)",
                  },
                  {
                    label: t("Royal Canin – Scientific & premium (Pet food)"),
                    value: "Royal Canin – Scientific & premium (Pet food)",
                  },
                  {
                    label: t("Pedigree – Friendly & caring (Pet care)"),
                    value: "Pedigree – Friendly & caring (Pet care)",
                  },
                  {
                    label: t("Unilever – Mass-market & trusted (FMCG)"),
                    value: "Unilever – Mass-market & trusted (FMCG)",
                  },
                  {
                    label: t("P&G – Reliable & practical (Household)"),
                    value: "P&G – Reliable & practical (Household)",
                  },
                  {
                    label: t(
                      "Starbucks – Warm & lifestyle-driven (Coffee & culture)",
                    ),
                    value:
                      "Starbucks – Warm & lifestyle-driven (Coffee & culture)",
                  },
                  {
                    label: t("Red Bull – Energetic & bold (Energy drinks)"),
                    value: "Red Bull – Energetic & bold (Energy drinks)",
                  },
                  {
                    label: t(
                      "Nestlé – Family-oriented & global (Food & beverage)",
                    ),
                    value:
                      "Nestlé – Family-oriented & global (Food & beverage)",
                  },
                  {
                    label: t(
                      "Centrum – Scientific & trustworthy (Supplements)",
                    ),
                    value: "Centrum – Scientific & trustworthy (Supplements)",
                  },
                ]}
                style={{
                  width: "100%",
                }}
                onSelect={(e) =>
                  setTranslateSettings4({
                    ...translateSettings4,
                    option2: e,
                  })
                }
              />
            </div>
            <div>
              <Text>{t("translateSettings4.title3")}</Text>
              <Select
                defaultActiveFirstOption={true}
                options={[
                  {
                    label: "",
                    value: "",
                  },
                  {
                    label: t("Informational – Just the facts"),
                    value: "Informational – Just the facts",
                  },
                  {
                    label: t("Soft CTA – Gentle encouragement"),
                    value: "Soft CTA – Gentle encouragement",
                  },
                  {
                    label: t("Strong CTA – Clear call to buy"),
                    value: "Strong CTA – Clear call to buy",
                  },
                ]}
                style={{
                  width: "100%",
                }}
                onSelect={(e) =>
                  setTranslateSettings4({
                    ...translateSettings4,
                    option3: e,
                  })
                }
              />
            </div>
            <div>
              <Text>{t("translateSettings4.title4")}</Text>
              <Select
                defaultActiveFirstOption={true}
                options={[
                  {
                    label: "",
                    value: "",
                  },
                  {
                    label: t("SEO-friendly"),
                    value: "SEO-friendly",
                  },
                  {
                    label: t("Minimalist"),
                    value: "Minimalist",
                  },
                  {
                    label: t("Storytelling"),
                    value: "Storytelling",
                  },
                  {
                    label: t("Feature-first"),
                    value: "Feature-first",
                  },
                  {
                    label: t("Call-to-action"),
                    value: "Call-to-action",
                  },
                ]}
                style={{
                  width: "100%",
                }}
                onSelect={(e) =>
                  setTranslateSettings4({
                    ...translateSettings4,
                    option4: e,
                  })
                }
              />
            </div>
          </Space>
        </Space>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
            {t("translateSettings2.title")}
          </Title>
          <Checkbox.Group
            value={translateSettings2}
            options={translateSettings2Options}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              width: "100%",
            }}
            onChange={(e) => setTranslateSettings2(e)}
          />
        </Space>
      </Space>
    </Card>
  );
};

export default ToneSettingCard;
