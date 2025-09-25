import React, { useEffect, useState } from "react";
import { Row, Col, Button, Card, Flex, Grid, Image } from "antd";
import { useFetcher, useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";
import { useTranslation } from "react-i18next";
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
  const LanguageFetcher = useFetcher();
  const screens = useBreakpoint();
  const gridWidth = screens.lg ? 54 : screens.md ? 80 : 120;
  const [languages, setLanguages] = useState<string[]>(["PR", "DE", "FR"]);

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
      // 假设后端返回 ["English", "Deutsch", "Norsk (Nynorsk)"]
      //   if (LanguageFetcher.data?.success && Array.isArray(LanguageFetcher.data.response)) {
      //     setLanguages(LanguageFetcher.data.response);
      //   }
    }
  }, [LanguageFetcher.data]);

  return (
    <Row gutter={[10, 10]} style={{ marginTop: "20px" }}>
      {/* Add Language & Auto Translate */}
      <Col sm={24} md={12} lg={8}>
        <Card
          title={t("Add Language & Auto Translate")}
          headStyle={{ borderBottom: "none" }}
          style={{ width: "100%" }}
        >
          <Flex justify="space-between" align="center" gap="8px">
            {languages.map((lang, idx) => (
              // <LanguageButton key={idx} label={lang} width={gridWidth} />
              <Image
                key={idx}
                src={`https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/flag_webp/${lang}.webp`}
                alt={lang}
                width={40}
                preview={false}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  navigate("/app/language");
                }}
              />
            ))}
            <Button
              type="default"
              style={{ color: "#999", fontSize: "12px" }}
              onClick={() => navigate("/app/language")}
            >
              {t("And More")}
            </Button>
          </Flex>
          <Button
            type="default"
            style={{ marginTop: "16px", fontWeight: 500 }}
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
          headStyle={{ borderBottom: "none" }}
          title={t("Manage Translation & Edit")}
          style={{ width: "100%" }}
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
            style={{ marginTop: "16px", fontWeight: 500 }}
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
          headStyle={{ borderBottom: "none" }}
          style={{ height: "100%", width: "100%" }}
          title={t("More Translation Tools")}
        >
          <Flex justify="space-between" wrap="wrap" gap="8px">
            <Button
              type="default"
              onClick={() => {
                navigate("/app/glossary"),
                  reportClick("dashboard_translate_tool_glossary");
              }}
              style={{ color: "#999", fontSize: "12px" }}
            >
              {t("Glossary")}
            </Button>
            <Button
              type="default"
              onClick={() => navigate("/app/manage_translation")}
              style={{ color: "#999", fontSize: "12px" }}
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
