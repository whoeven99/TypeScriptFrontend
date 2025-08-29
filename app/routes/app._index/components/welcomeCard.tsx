import { useFetcher, useNavigate } from "@remix-run/react";
import { Button, Card, ConfigProvider, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface WelcomeCardProps {
  switcherOpen: boolean;
  blockUrl: string;
  shop: string;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  switcherOpen,
  blockUrl,
  shop,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();

  const handleSetting = () => {
    if (!switcherOpen) {
      // TODO: Disable App
      window.open(blockUrl, "_blank");
      fetcher.submit(
        {
          log: `${shop} 前往开启switcher, 从主页面点击`,
        },
        {
          method: "POST",
          action: "/log",
        },
      );
    } else {
      // TODO: Setup App
      localStorage.setItem("switcherCard", "true");
      fetcher.submit(
        {
          log: `${shop} 前往配置switcher, 从主页面点击`,
        },
        {
          method: "POST",
          action: "/log",
        },
      );
      setTimeout(() => {
        navigate("/app/switcher");
      }, 500);
    }
  };

  return (
    <Card
      title={
        !switcherOpen
          ? t("The switcher is currently enabled.")
          : t("Enable language and currency switcher")
      }
      // extra={
      //   <Button
      //     icon={<RedoOutlined spin={loading} />}
      //     type="link"
      //     onClick={handleReload}
      //   />
      // }
    >
      <Flex justify="space-between" align="center">
        <Text>
          {!switcherOpen
            ? t(
                "Customers can switch languages and currencies when visiting the site. ",
              )
            : t(
                "The switcher is currently disabled. If you need IP-based automatic language and currency switching, please click “ Setup”. ",
              )}
        </Text>
        <Button
          onClick={() => {
            handleSetting();
          }}
        >
          {!switcherOpen ? t("Disable App") : t("Setup App")}
        </Button>
      </Flex>
    </Card>
  );
};

export default WelcomeCard;
