import { Button, Card, Flex, Skeleton } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { eNumPlanType } from "../route";

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
    // 添加 Modal 组件
    <Card>
      <Flex justify="space-between">
        <Flex gap={8}>
          {planType ? (
            <>
              <Button
                style={{ color: "#007F61" }}
                onClick={() =>
                  handleOpenAddCreditsModalAndSelectedOption("option-1")
                }
              >
                500,000/ ${optionPrices.priceForOption1}
              </Button>
              <Button
                style={{ color: "#007F61" }}
                onClick={() =>
                  handleOpenAddCreditsModalAndSelectedOption("option-2")
                }
              >
                1,000,000/ ${optionPrices.priceForOption2}
              </Button>
              <Button
                style={{ color: "#007F61" }}
                onClick={() =>
                  handleOpenAddCreditsModalAndSelectedOption("option-3")
                }
              >
                2,000,000/ ${optionPrices.priceForOption3}
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
        <Button onClick={() => handleOpenAddCreditsModalAndSelectedOption()}>
          {t("Buy Credit")}
        </Button>
      </Flex>
    </Card>
  );
};

export default BuyCreditsOuterCard;
