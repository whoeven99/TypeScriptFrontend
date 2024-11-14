import React, { useState, useEffect } from "react";
import "./styles.css";

interface TranslatedIconProps {
  type: string;
  status: number; // 状态 0、1 或 2
}

const TranslatedIcon: React.FC<TranslatedIconProps> = ({ type, status }) => {
  const [progress, setProgress] = useState(0); // 用于存储进度百分比
  const [isTranslated, setIsTranslated] = useState<boolean>();
  const [isTranslating, setIsTranslating] = useState<boolean>();

  // 当状态为 2 时启动进度模拟
  useEffect(() => {
    setIsTranslated(status === 1);
    setIsTranslating(status === 2);
    let interval: NodeJS.Timeout | null = null;

    if (status === 2 && progress < 100) {
      interval = setInterval(() => {
        setProgress((prevProgress) => Math.min(prevProgress + 1, 100));
      }, 2000);
    } else if (status !== 2) {
      setProgress(0); // 状态切换时重置进度
    }

    return () => {
      if (interval) clearInterval(interval); // 清理定时器
    };
  }, [status, progress]);

  return (
    <div
      className={`icon-container ${isTranslated ? "translated" : isTranslating ? "translating" : "untranslated"}`}
    >
      {isTranslating ? (
        <div className="translating">{progress} %</div>
      ) : (
        <div
          className={`circle ${isTranslated ? "translated" :  "untranslated"}`}
        />
      )}
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
