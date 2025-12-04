import { Button, Card, Col, ConfigProvider, Row, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "../style.css";

const { Title, Text } = Typography;

interface AcountInfoCardProps {
  loading: boolean;
  translation_balance: number;
  ip_balance: number;
}

const AcountInfoCard: React.FC<AcountInfoCardProps> = ({
  loading,
  translation_balance,
  ip_balance,
}) => {
  const { t } = useTranslation();

  const componentData = useMemo(
    () => ({
      translation_balance: translation_balance,
      ip_balance: ip_balance,
      img_balance: 10000,
      other_rights: 5,
    }),
    [translation_balance, ip_balance],
  );

  return (
    // 添加 Modal 组件
    <ConfigProvider
      theme={{
        components: {
          Card: {
            /* 这里是你的组件 token */
            headerBg: "#007F61",
          },
        },
      }}
    >
      <Card
        title={
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div className="marquee-wrapper">
              <div className="marquee-content">
                <span className="marquee-text">
                  {t(
                    "Plan benefits: Translation credits never expire · monthly translation credits can be accumulated · translation credit transfer is supported.",
                  )}
                </span>
                <span className="marquee-text">
                  {t(
                    "Plan benefits: Translation credits never expire · monthly translation credits can be accumulated · translation credit transfer is supported.",
                  )}
                </span>
              </div>

              {/* 第二份内容，用于无缝拼接 */}
              <div className="marquee-content">
                <span className="marquee-text">
                  {t(
                    "Plan benefits: Translation credits never expire · monthly translation credits can be accumulated · translation credit transfer is supported.",
                  )}
                </span>
                <span className="marquee-text">
                  {t(
                    "Plan benefits: Translation credits never expire · monthly translation credits can be accumulated · translation credit transfer is supported.",
                  )}
                </span>
              </div>
            </div>
          </div>
        }
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
            <Text>{t("Translation quota")}</Text>
            <Title style={{ margin: 0, fontSize: 20 }}>
              {componentData.translation_balance?.toLocaleString()}
            </Title>
            <Text>{t("Credits")}</Text>
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
            <Text>{t("IP geo quota")}</Text>
            <Title style={{ margin: 0, fontSize: 20 }}>
              {componentData.ip_balance?.toLocaleString()}
            </Title>
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
            <Title style={{ margin: 0, fontSize: 20 }}>
              {componentData.img_balance}
            </Title>
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
