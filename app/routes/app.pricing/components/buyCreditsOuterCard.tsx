import { Button, Card, Flex, Skeleton, Space, Tag, Typography } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { eNumPlanType } from "../route";

const { Title } = Typography;

interface BuyCreditsOuterCardProps {
  planType: string;
  isInTrial: boolean;
  handleOpenAddCreditsModal: () => void;
  setSelectedOption: (e: string) => void;
}

const BuyCreditsOuterCard: React.FC<BuyCreditsOuterCardProps> = ({
  planType,
  isInTrial,
  handleOpenAddCreditsModal,
  setSelectedOption,
}) => {
  const { t } = useTranslation();

  const optionPrices = useMemo(() => {
    if (!planType)
      return {
        priceForOption1: 3.99,
        priceForOption2: 7.99,
        priceForOption3: 11.99,
      };
    return {
      priceForOption1: eNumPlanType({
        planType,
        optionName: "500K",
        isInTrial,
      }).currentPrice,
      priceForOption2: eNumPlanType({
        planType,
        optionName: "1M",
        isInTrial,
      }).currentPrice,
      priceForOption3: eNumPlanType({
        planType,
        optionName: "2M",
        isInTrial,
      }).currentPrice,
    };
  }, [planType, isInTrial]);

  //打开付费表单并选择对应的选项
  const handleOpenAddCreditsModalAndSelectedOption = (option?: string) => {
    if (!planType) return;
    if (option) setSelectedOption(option);
    handleOpenAddCreditsModal();
  };

  return (
    <Card
      className="pricing-quick-buy-card"
      style={{ border: "none", boxShadow: "none" }}
      styles={{ body: { padding: 16 } }}
    >
      <Space direction="vertical" size={12} style={{ display: "flex" }}>
        <Flex justify="space-between" align="start" gap={16} wrap="wrap">
          <Flex gap={8} wrap="wrap" align="center">
            <Title level={4} style={{ margin: 0 }}>
              {t("Quick top-up")}
            </Title>
            <Flex gap={8} wrap="wrap" align="center">
              {planType ? (
                <Tag bordered={false} color="blue">
                  {t("Discount applied")}
                </Tag>
              ) : null}
            </Flex>
          </Flex>
          <Button type="primary" onClick={() => handleOpenAddCreditsModalAndSelectedOption()}>
            {t("Browse all credit packs")}
          </Button>
        </Flex>
        <Flex gap={8} wrap="wrap">
          {planType ? (
            <>
              <Button
                className="pricing-quick-buy-card__option"
                onClick={() =>
                  handleOpenAddCreditsModalAndSelectedOption("option-1")
                }
              >
                {`500,000 / $${optionPrices.priceForOption1}`}
              </Button>
              <Button
                className="pricing-quick-buy-card__option"
                onClick={() =>
                  handleOpenAddCreditsModalAndSelectedOption("option-2")
                }
              >
                {`1,000,000 / $${optionPrices.priceForOption2}`}
              </Button>
              <Button
                className="pricing-quick-buy-card__option"
                onClick={() =>
                  handleOpenAddCreditsModalAndSelectedOption("option-3")
                }
              >
                {`2,000,000 / $${optionPrices.priceForOption3}`}
              </Button>
            </>
          ) : (
            <>
              <Skeleton.Button />
              <Skeleton.Button />
              <Skeleton.Button />
            </>
          )}
        </Flex>
      </Space>
    </Card>
  );
};

export default BuyCreditsOuterCard;
