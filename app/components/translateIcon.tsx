import React, { useState, useEffect } from "react";
import "./styles.css";
import { useTranslation } from "react-i18next";

interface TranslatedIconProps {
  status: number; // 状态 -1、0、1、2 或 3
  value?: number;  // 可选的 value 属性
}

const TranslatedIcon: React.FC<TranslatedIconProps> = ({ status, value }) => {
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isPartlyTranslated, setIsPartlyTranslated] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsError(status === -1);
    setIsTranslated(status === 1);
    setIsTranslating(status === 2);
    setIsPartlyTranslated(status === 3);
  }, [status]);

  return (
    <div
      className={`icon-container ${
        isError 
          ? "error" 
          : isTranslated 
            ? "translated" 
            : isTranslating 
              ? "translating" 
              : isPartlyTranslated 
                ? "partly_translated" 
                : "untranslated"
      }`}
    >
      <div
        className={`circle ${
          isError 
            ? "error" 
            : isTranslated 
              ? "translated" 
              : isTranslating 
                ? "translating" 
                : isPartlyTranslated 
                  ? "partly_translated" 
                  : "untranslated"
        }`}
      />
      <span className="text">
        {isError
          ? t("Network Error")
          : isTranslated
            ? t("Translated")
            : isTranslating
              ? t("Translating")
              : isPartlyTranslated
                ? t("Partly Translated")
                : t("Untranslated")}
      </span>
      {value !== undefined && (
        <div className="value-display">
          Value: {value}
        </div>
      )}
    </div>
  );
};

export default TranslatedIcon;