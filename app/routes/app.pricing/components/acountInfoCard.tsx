import { Button, Card, Col, ConfigProvider, Row, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

interface AcountInfoCardProps {
  loading: boolean;
}

const AcountInfoCard: React.FC<AcountInfoCardProps> = ({ loading }) => {
  const { t } = useTranslation();

  const [componentData, setComponentData] = useState<{
    translation_balance: number;
    ip_balance: number;
    img_balance: number;
    other_rights: number;
  }>({
    translation_balance: 10000,
    ip_balance: 10000,
    img_balance: 10000,
    other_rights: 5,
  });

  return (
    // 添加 Modal 组件
    <ConfigProvider
      theme={{
        components: {
          Card: {
            /* 这里是你的组件 token */
            headerBg: "rgb(186,191,204)",
          },
        },
      }}
    >
      <Card
        title={t(
          "Current program benefits: Translation credits never expire · monthly translation credits can be accumulated · translation credit transfer is supported.",
        )}
        loading={loading}
      >
        <Row gutter={[16, 16]}>
          <Col
            // key={t("Free")}
            xs={24}
            sm={24}
            md={12}
            lg={6}
            style={{
              display: "flex",
              width: "100%",
              whiteSpace: "nowrap",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text>{t("Translation Balance")}</Text>
            <Title style={{ margin: 0 }}>
              {componentData.translation_balance}
            </Title>
            <Text>{t("words")}</Text>
          </Col>
          <Col
            // key={t("Free")}
            xs={24}
            sm={24}
            md={12}
            lg={6}
            style={{
              display: "flex",
              width: "100%",
              whiteSpace: "nowrap",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text>{t("IP Balance")}</Text>
            <Title style={{ margin: 0 }}>{componentData.ip_balance}</Title>
            <Text>{t("requests")}</Text>
          </Col>
          <Col
            // key={t("Free")}
            xs={24}
            sm={24}
            md={12}
            lg={6}
            style={{
              display: "none",
              width: "100%",
              whiteSpace: "nowrap",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text>{t("Image Balance")}</Text>
            <Title style={{ margin: 0 }}>{componentData.img_balance}</Title>
            <Text>{t("picture")}</Text>
          </Col>
          <Col
            // key={t("Free")}
            xs={24}
            sm={24}
            md={12}
            lg={6}
            style={{
              display: "none",
              width: "100%",
              whiteSpace: "nowrap",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text>{t("Other rights")}</Text>
            <Title style={{ margin: 0 }}>{componentData.other_rights}</Title>
            <Button>{t("picture")}</Button>
          </Col>
        </Row>
      </Card>
    </ConfigProvider>
  );
};

export default AcountInfoCard;
