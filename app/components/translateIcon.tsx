import React, { useState, useEffect } from "react";
import "./styles.css";

interface TranslatedIconProps {
  status: number; // 状态 0、1 或 2
  value?: number;
}

const TranslatedIcon: React.FC<TranslatedIconProps> = ({ status, value }) => {
  const [isTranslated, setIsTranslated] = useState<boolean>();
  const [isTranslating, setIsTranslating] = useState<boolean>();

  // 当状态为 2 时启动进度模拟
  useEffect(() => {
    setIsTranslated(status === 1);
    setIsTranslating(status === 2);
  }, [status]);

  return (
    <div
      className={`icon-container ${isTranslated ? "translated" : isTranslating ? "translating" : "untranslated"}`}
    >
      <div
        className={`circle ${isTranslated ? "translated" : isTranslating ? "translating" : "untranslated"}`}
      />
      <span className="text">
        {isTranslated
          ? "Translated"
          : isTranslating
            ? "Translating"
            : "Untranslated"}
      </span>
    </div>
  );
};

export default TranslatedIcon;
