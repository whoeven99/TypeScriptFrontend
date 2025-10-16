import { useEffect, useState } from "react";
import { Row, Col, Button, Card, Flex, Image, Typography } from "antd";
import { useFetcher, useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";
import { useTranslation } from "react-i18next";
import languageLocaleData from "../../../../scripts/language-locale-data";

const TranslationPanel = () => {
  const { t } = useTranslation();
  const { Text, Title } = Typography;
  const { reportClick } = useReport();
  const navigate = useNavigate();
  const LanguageFetcher = useFetcher<any>();
  const [languages, setLanguages] = useState<any>([]);
  const [nationalFlags, setNationalFlags] = useState<string[]>([]);
  useEffect(() => {
    const localFlags = localStorage.getItem("localFlagsData");
    if (localFlags) {
      setNationalFlags(JSON.parse(localFlags));
    }

    const formData = new FormData();
    formData.append("LanguageFetcher", JSON.stringify({}));
    LanguageFetcher.submit(formData, {
      action: "/app/translate_report",
      method: "post",
    });
  }, []);

  useEffect(() => {
    if (LanguageFetcher.data) {
      if (LanguageFetcher.data?.success) {
        const raw = LanguageFetcher.data.response;
        const langs: Record<string, any> = { ...raw };
        delete langs["Published Languages"];
        for (const langName in langs) {
          const match = Object.values(languageLocaleData).find(
            (item) => item.Name === langName,
          );

          if (match) {
            langs[langName] = {
              value: langs[langName],
              flagUrl: match.countries[0], // 用第一个国家作为 flagUrl
              isoCode: match.isoCode,
            };
          }
        }
        setLanguages(Object.values(langs).slice(0, 3)); // 只显示前3个
        localStorage.setItem(
          "localFlagsData",
          JSON.stringify(Object.values(langs).slice(0, 3)),
        );
      } else {
        console.error("flag failed");
        // setLanguages(nationalFlags);
      }
    }
  }, [LanguageFetcher.data]);

  return (
    <Card
      style={{ width: "100%", padding: "0px" }}
      styles={{
        body: {
          padding: "12px 24px",
        },
      }}
    >
      <Flex justify="space-between" style={{ marginBottom: "10px" }}>
        <Title
          level={4}
          style={{ display: "flex", alignItems: "center", fontWeight: 600 }}
        >
          {t("Translation tools")}
        </Title>
      </Flex>
      <Row gutter={[10, 10]} style={{ marginTop: "20px" }}>
        {/* Add Language & Auto Translate */}
        <Col sm={24} md={12} lg={8} xs={24}>
          <Card
            title={t("Add Language & Auto Translate")}
            style={{ width: "100%", height: "100%" }}
            styles={{
              header: {
                borderBottom: "none",
                fontSize: "14px",
              },
              body: {
                paddingTop: 0,
                paddingBottom: "12px",
              },
            }}
          >
            <Flex justify="space-between" align="center" gap="8px">
              <Flex flex={1} justify="start" align="center" gap="8px">
                {(languages.length > 0 ? languages : nationalFlags).map(
                  (lang: any, idx: number) => (
                    <Image
                      key={idx}
                      src={lang.flagUrl || "/default-flag.png"}
                      alt={lang}
                      width={32}
                      preview={false}
                      style={{
                        cursor: "pointer",
                        border: "1px solid #333",
                      }}
                      onClick={() => {
                        navigate("/app/language");
                      }}
                    />
                  ),
                )}
              </Flex>
              {languages.length > 0 ? (
                <Button
                  type="default"
                  style={{
                    color: "#999",
                    fontSize: "12px",
                  }}
                  onClick={() => navigate("/app/language")}
                >
                  {t("And More")}
                </Button>
              ) : (
                <div style={{ height: 30 }}></div>
              )}
            </Flex>
            <Button
              type="default"
              style={{ marginTop: "8px", bottom: 0 }}
              onClick={() => {
                reportClick("dashboard_add_language");
                navigate("/app/language");
              }}
            >
              {t("Add")}
            </Button>
          </Card>
        </Col>

        {/* Manage Translation & Edit */}
        <Col sm={24} md={12} lg={8} xs={24}>
          <Card
            title={t("Manage Translation & Edit")}
            style={{ width: "100%" }}
            styles={{
              header: {
                borderBottom: "none",
                fontSize: "14px",
              },
              body: {
                paddingTop: 0,
                paddingBottom: "12px",
              },
            }}
          >
            <Flex justify="space-between" gap="8px">
              <Button
                type="default"
                style={{ color: "#999", fontSize: "12px" }}
                onClick={() => navigate("/app/manage_translation")}
              >
                {t("Theme")}
              </Button>
              <Button
                type="default"
                style={{ color: "#999", fontSize: "12px" }}
                onClick={() => navigate("/app/manage_translation")}
              >
                {t("Product")}
              </Button>
              <Button
                type="default"
                style={{ color: "#999", fontSize: "12px" }}
                onClick={() => navigate("/app/manage_translation")}
              >
                {t("And More")}
              </Button>
            </Flex>
            <Button
              type="default"
              style={{ marginTop: "8px" }}
              onClick={() => {
                reportClick("dashboard_mange_translate");
                navigate("/app/manage_translation");
              }}
            >
              {t("Manage")}
            </Button>
          </Card>
        </Col>

        {/* More Translation Tools */}
        <Col sm={24} md={12} lg={8} xs={24}>
          <Card
            style={{ height: "100%", width: "100%" }}
            title={t("More Translation Tools")}
            styles={{
              header: {
                borderBottom: "none",
                fontSize: "14px",
              },
              body: {
                paddingTop: 0,
                paddingBottom: "12px",
              },
            }}
          >
            <Flex justify="space-between" wrap="wrap" gap="8px">
              <Button
                type="default"
                onClick={() => {
                  navigate("/app/glossary"),
                    reportClick("dashboard_translate_tool_glossary");
                }}
                style={{ fontSize: "12px" }}
              >
                {t("Glossary")}
              </Button>
              <Button
                type="default"
                onClick={() => navigate("/app/manage_translation")}
                style={{ fontSize: "12px" }}
              >
                {t("Image & Alt Text Translation")}
              </Button>
            </Flex>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default TranslationPanel;
