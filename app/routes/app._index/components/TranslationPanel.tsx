import React, { useEffect, useState } from "react";
import { Row, Col, Button, Card, Flex } from "antd";
import { useFetcher, useNavigate } from "@remix-run/react";

interface LanguageButtonProps {
  label: string;
  width?: number;
}

const LanguageButton: React.FC<LanguageButtonProps> = ({
  label,
  width = 54,
}) => {
  const navigate = useNavigate();
  return (
    <Button
      type="default"
      title={label} // hover 显示完整
      style={{
        width,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      onClick={() => navigate("/app/language")}
    >
      {label}
    </Button>
  );
};

const TranslationPanel = () => {
  const navigate = useNavigate();
  const languagesFetcher = useFetcher();
  const [languages, setLanguages] = useState<string[]>([
    "English",
    "Deutsch",
    "Norsk (Nynorsk)",
    "Français",
    "Español",
  ]);

  useEffect(() => {
    const formData = new FormData();
    formData.append("languagesFetcher", JSON.stringify({}));
    languagesFetcher.submit(formData, {
      action: "/app",
      method: "post",
    });
  }, []);

  useEffect(() => {
    if (languagesFetcher.data) {
      console.log("languagesFetcher.data", languagesFetcher.data);
      // 假设后端返回 ["English", "Deutsch", "Norsk (Nynorsk)"]
      //   if (languagesFetcher.data?.success && Array.isArray(languagesFetcher.data.response)) {
      //     setLanguages(languagesFetcher.data.response);
      //   }
    }
  }, [languagesFetcher.data]);

  return (
    <Row gutter={[10, 10]} style={{ marginTop: "20px" }}>
      {/* Add Language & Auto Translate */}
      <Col span={8}>
        <Card title="Add Language & Auto Translate" style={{ height: "100%" }}>
          <Flex justify="space-between" align="center" wrap gap="8px">
            {languages.map((lang, idx) => (
              <LanguageButton key={idx} label={lang} />
            ))}
            <Button type="default">And More</Button>
          </Flex>
          <Button type="default" style={{ marginTop: "16px" }}>
            Add
          </Button>
        </Card>
      </Col>

      {/* Manage Translation & Edit */}
      <Col span={8}>
        <Card style={{ height: "100%" }} title="Manage Translation & Edit">
          <Flex justify="center" gap="8px">
            <Button type="default">Theme</Button>
            <Button type="default">Product</Button>
            <Button type="default">And More</Button>
          </Flex>
          <Button type="default" style={{ marginTop: "16px" }}>
            Manage
          </Button>
        </Card>
      </Col>

      {/* More Translation Tools */}
      <Col span={8}>
        <Card style={{ height: "100%" }} title="More Translation Tools">
          <Flex justify="space-between" wrap="wrap" gap="8px">
            <Button type="default" onClick={() => navigate("/app/glossary")}>
              Glossary
            </Button>
            <Button
              type="default"
              onClick={() => navigate("/app/manage_translation")}
            >
              Image & All Text Translation
            </Button>
          </Flex>
        </Card>
      </Col>
    </Row>
  );
};

export default TranslationPanel;
