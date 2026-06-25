import { useEffect, useState } from "react";
import { Row, Col, Button, Card, Flex, Image, Typography } from "antd";
import { useFetcher, useLocation, useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";
import { useTranslation } from "react-i18next";
import languageLocaleData from "../../../../scripts/language-locale-data";
import { withEmbeddedSearch } from "~/utils/embeddedAction";
import AppSectionCard from "~/ui/components/AppSectionCard";

const TranslationPanel = () => {
  const { t } = useTranslation();
  const { reportClick } = useReport();
  const navigate = useNavigate();
  const location = useLocation();
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
      action: withEmbeddedSearch("/app/translate_report", location.search),
      method: "post",
    });
  }, [location.search]);

  useEffect(() => {
    if (LanguageFetcher.data) {
      if (LanguageFetcher.data?.success) {
        const raw = LanguageFetcher.data.response;
        const langs: Record<string, any> = { ...raw };
        delete langs["Published Languages"];
        const processed = Object.keys(langs)
          .map((langName) => {
            const match = Object.values(languageLocaleData).find(
              (item) => item.Name === langName,
            );
            if (!match) return null;
            return {
              value: langs[langName],
              flagUrl: match.countries[0],
              isoCode: match.isoCode,
            };
          })
          .filter(Boolean);
        setLanguages(processed.slice(0, 3)); // 只显示前3个
        localStorage.setItem(
          "localFlagsData",
          JSON.stringify(processed.slice(0, 3)),
        );
      } else {
        console.error("flag failed");
        // setLanguages(nationalFlags);
      }
    }
  }, [LanguageFetcher.data]);

  return (
    <AppSectionCard
      title={t("Translation tools")}
      description={t("Quick access to language setup, translation management, and glossary tools.")}
    >
      <Row gutter={[16, 16]}>
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
                      src={lang.flagUrl}
                      alt={lang}
                      width={32}
                      preview={false}
                      style={{
                        cursor: "pointer",
                        border: "1px solid var(--app-color-border)",
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
                    color: "var(--app-color-text-secondary)",
                    fontSize: "var(--app-font-size-caption)",
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
                style={{
                  color: "var(--app-color-text-secondary)",
                  fontSize: "var(--app-font-size-caption)",
                }}
                onClick={() => navigate("/app/manage_translation")}
              >
                {t("Theme")}
              </Button>
              <Button
                type="default"
                style={{
                  color: "var(--app-color-text-secondary)",
                  fontSize: "var(--app-font-size-caption)",
                }}
                onClick={() => navigate("/app/manage_translation")}
              >
                {t("Product")}
              </Button>
              <Button
                type="default"
                style={{
                  color: "var(--app-color-text-secondary)",
                  fontSize: "var(--app-font-size-caption)",
                }}
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
                style={{ fontSize: "var(--app-font-size-caption)" }}
              >
                {t("Glossary")}
              </Button>
              <Button
                type="default"
                onClick={() =>
                  window.open(
                    "https://apps.shopify.com/ciwi-ai-image-alt-translate",
                    "_blank",
                  )
                }
                style={{ fontSize: "var(--app-font-size-caption)" }}
              >
                {t("Image & Alt Text Translation")}
              </Button>
            </Flex>
          </Card>
        </Col>
      </Row>
    </AppSectionCard>
  );
};

export default TranslationPanel;
