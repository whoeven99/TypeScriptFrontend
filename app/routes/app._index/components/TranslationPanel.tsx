import React, { useEffect, useState } from "react";
import { Row, Col, Button, Card, Flex, Grid, Image, Skeleton } from "antd";
import { useFetcher, useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";
import { useTranslation } from "react-i18next";
import languageLocaleData from "../../../../scripts/language-locale-data";
interface LanguageButtonProps {
  label: string;
  width?: number;
}

// const LanguageButton: React.FC<LanguageButtonProps> = ({
//   label,
//   width = 54,
// }) => {
//   const navigate = useNavigate();
//   return (
//     <Button
//       type="default"
//       title={label} // hover 显示完整
//       style={{
//         width,
//         overflow: "hidden",
//         textOverflow: "ellipsis",
//         whiteSpace: "nowrap",
//       }}
//       onClick={() => navigate("/app/language")}
//     >
//       {label}
//     </Button>
//   );
// };

const TranslationPanel = () => {
  const { t } = useTranslation();
  const { reportClick } = useReport();
  const { useBreakpoint } = Grid;
  const navigate = useNavigate();
  const LanguageFetcher = useFetcher<any>();
  const screens = useBreakpoint();
  const gridWidth = screens.lg ? 54 : screens.md ? 80 : 120;
  const [languages, setLanguages] = useState<any>([]);
  const [nationalFlags, setNationalFlags] = useState<string[]>([]);
  useEffect(() => {
    const formData = new FormData();
    formData.append("LanguageFetcher", JSON.stringify({}));
    LanguageFetcher.submit(formData, {
      action: "/app/translate_report",
      method: "post",
    });
  }, []);

  useEffect(() => {
    if (LanguageFetcher.data) {
      console.log("LanguageFetcher.data", LanguageFetcher.data);

      const raw = LanguageFetcher.data.response;
      const langs: Record<string, any> = { ...raw };
      delete langs["Published Languages"];
      console.log("langs", langs);

      for (const langName in langs) {
        const match = Object.values(languageLocaleData).find(
          (item) => item.Name === langName,
        );

        if (match) {
          langs[langName] = {
            value: langs[langName],
            flagUrl: match.countries[0], // 用第一个国家作为 flagUrl
          };
        } else {
          langs[langName] = { value: langs[langName], flagUrl: null };
        }
      }
      setLanguages(Object.values(langs).slice(0, 3)); // 只显示前3个
      console.log("langs with flagUrl", langs);
    }
  }, [LanguageFetcher.data]);

  return (
    <Row gutter={[10, 10]} style={{ marginTop: "20px" }}>
      {/* Add Language & Auto Translate */}
      <Col sm={24} md={12} lg={8}>
        <Card
          title={t("Add Language & Auto Translate")}
          style={{ width: "100%" }}
          styles={{
            header: {
              borderBottom: "none",
            },
            body:{
              paddingTop:0,
              paddingBottom:"12px"
            }
          }}
        >
          <Flex justify="space-between" align="center" gap="8px">
            <Flex flex={1} justify="start" align="center" gap="8px">
              {languages.length > 0 ? (
                languages.map((lang: any, idx: number) => (
                  // <LanguageButton key={idx} label={lang} width={gridWidth} />
                  <Image
                    key={idx}
                    src={lang.flagUrl || "/default-flag.png"}
                    alt={lang}
                    width={32}
                    preview={false}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      navigate("/app/language");
                    }}
                  />
                ))
              ) : (
                <Skeleton.Input
                  style={{ width: gridWidth, height: 40 }}
                  active
                />
              )}
            </Flex>

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
          </Flex>
          <Button
            type="default"
            style={{ marginTop: "8px" }}
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
      <Col sm={24} md={12} lg={8}>
        <Card
          title={t("Manage Translation & Edit")}
          style={{ width: "100%" }}
          styles={{
            header: {
              borderBottom: "none",
            },
            body:{
              paddingTop:0,
              paddingBottom:"12px"
            }
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
      <Col sm={24} md={12} lg={8}>
        <Card
          style={{ height: "100%", width: "100%" }}
          title={t("More Translation Tools")}
          styles={{
            header: {
              borderBottom: "none",
            },
            body:{
              paddingTop:0,
              paddingBottom:"12px"
            }
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
              {t("Image & All Text Translation")}
            </Button>
          </Flex>
        </Card>
      </Col>
    </Row>
  );
};

export default TranslationPanel;
