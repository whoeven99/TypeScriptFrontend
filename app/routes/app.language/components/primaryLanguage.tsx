import { Typography } from "antd";
import { useEffect, useState } from "react";
import { ShopLocalesType } from "~/routes/app.language/route";

const { Text } = Typography;

const PrimaryLanguage: React.FC<{ shopLanguages: ShopLocalesType[] }> = ({
  shopLanguages,
}) => {
  const [primaryLanguage, setPrimaryLanguage] =
    useState<ShopLocalesType | null>(null);

  useEffect(() => {
    if (shopLanguages) {
      // 查找主语言
      const foundPrimaryLanguage = shopLanguages.find((lang) => lang.primary);
      setPrimaryLanguage(foundPrimaryLanguage || null);
    }
  }, [shopLanguages]);

  return (
    <div>
      <Text>Your store’s default language:</Text>
      <Text strong>
        {" "}
        {primaryLanguage ? primaryLanguage.name : "No primary language set"}
      </Text>
    </div>
  );
};

export default PrimaryLanguage;
