import React from "react";
import "./styles.css";
import { useTranslation } from "react-i18next";

interface TranslatedIconProps {
  status: number; // 状态 -1、0、1、2、3
  detail?: string;
}

const TranslatedIcon: React.FC<TranslatedIconProps> = ({ status, detail }) => {
  const { t } = useTranslation();
  const isError = status === -1;
  const isTranslated = status === 1;
  const isTranslating = status === 2;
  const isPartlyTranslated =
    status === 3 || status === 4 || status === 5 || status === 6 || status === 7;
  const toneClass = isError
    ? "error"
    : isTranslated
      ? "translated"
      : isTranslating
        ? "translating"
        : isPartlyTranslated
          ? "partly_translated"
          : "untranslated";
  const label = isError
    ? t("Network Error")
    : isTranslated
      ? t("Translated")
      : isTranslating
        ? t("Translating")
        : isPartlyTranslated
          ? t("Partly Translated")
          : t("Untranslated");

  const iconContent = (
    <div className={`icon-container ${toneClass}`}>
      <div className={`circle ${toneClass}`} />
      <span className="text">{label}</span>
      {detail ? <span className="detail">{detail}</span> : null}
    </div>
  );

  return iconContent;
};

export default TranslatedIcon;
