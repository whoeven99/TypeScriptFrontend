import { RedoOutlined } from "@ant-design/icons";
import { useNavigate } from "@remix-run/react";
import { Button, Card, ConfigProvider, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface WelcomeCardProps {
  switcherOpen: boolean;
  blockUrl: string;
  loading: boolean;
  // handleReload: () => void;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  switcherOpen,
  blockUrl,
  loading,
  // handleReload,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
            if (!switcherOpen) {
              // TODO: Disable App
              window.open(blockUrl, "_blank");
            } else {
              // TODO: Setup App
              localStorage.setItem("switcherCard", "true");
              setTimeout(() => {
                navigate("/app/switcher");
              }, 500);
            }
          }}
        >
          {!switcherOpen ? t("Disable App") : t("Setup App")}
        </Button>
      </Flex>
    </Card>
  );
};

export default WelcomeCard;
