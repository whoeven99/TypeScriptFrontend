import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Card, Checkbox, Typography } from "antd";
import EasyTranslateIcon from "~/components/easyTranslateIcon";
import styles from "../styles.module.css";
import { useTranslation } from "react-i18next";
import { LanguagesDataType } from "~/routes/app.language/route";
import { forwardRef, LegacyRef } from "react";

const { Text } = Typography;

interface LanguageSelectorCardProps {
  selectedLanguageCode: string[];
  onChange: (e: string[]) => void;
  languageData: LanguagesDataType[];
  languageCardWarnText: string;
}

const LanguageSelectorCard = forwardRef<
  HTMLDivElement,
  LanguageSelectorCardProps
>(
  (
    { selectedLanguageCode, onChange, languageData, languageCardWarnText },
    ref,
  ) => {
    const { t } = useTranslation();

    return (
      <Card
        ref={ref}
        style={{
          width: "100%",
        }}
      >
        <Checkbox.Group
          value={selectedLanguageCode}
          onChange={onChange}
          style={{ width: "100%" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(289px, 1fr)",
              gap: "16px",
              width: "100%",
            }}
          >
            {languageData.map((lang: any) => (
              <Checkbox
                key={lang.locale}
                value={lang.locale}
                className={
                  styles.languageCheckbox +
                  " " +
                  (selectedLanguageCode.includes(lang.locale)
                    ? styles.languageCheckboxChecked
                    : "")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  <img
                    src={lang?.src?.[0] || ""}
                    alt={lang?.language}
                    style={{
                      width: "30px",
                      height: "auto",
                      justifyContent: "center",
                      border: "1px solid #888",
                      borderRadius: "2px",
                    }}
                  />
                  <span>{lang?.language}</span>
                  <EasyTranslateIcon status={lang?.status || 0} />
                </div>
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>
        <Text type="danger" style={{ display: "block", marginTop: "12px" }}>
          <ExclamationCircleOutlined
            style={{
              display: languageCardWarnText ? "inline-block" : "none",
              marginRight: "4px",
            }}
          />
          {t(languageCardWarnText)}
        </Text>
      </Card>
    );
  },
);

export default LanguageSelectorCard;
