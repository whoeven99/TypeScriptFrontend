import React, { useState, useEffect } from "react";
import "./styles.css";

interface TranslatedIconProps {
  status: number; // 状态 0、1、2 或 3
  value?: number;  // 可选的 value 属性，如果需要用于显示其他信息
}

const TranslatedIcon: React.FC<TranslatedIconProps> = ({ status, value }) => {
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isPartlyTranslated, setIsPartlyTranslated] = useState<boolean>(false);

  // 当状态为 1、2 或 3 时更新相应的状态
  useEffect(() => {
    setIsTranslated(status === 1);
    setIsTranslating(status === 2);
    setIsPartlyTranslated(status === 3);
  }, [status]);

  return (
    <div
      className={`icon-container ${isTranslated ? "translated" : isTranslating ? "translating" : isPartlyTranslated ? "partly_translated" : "untranslated"}`}
    >
      <div
        className={`circle ${isTranslated ? "translated" : isTranslating ? "translating" : isPartlyTranslated ? "partly_translated" : "untranslated"}`}
      />
      <span className="text">
        {isTranslated
          ? "Translated"
          : isTranslating
          ? "Translating"
          : isPartlyTranslated
          ? "Partly Translated"
          : "Untranslated"}
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
