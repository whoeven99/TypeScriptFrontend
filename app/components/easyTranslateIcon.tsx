import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Popover } from "antd";
import "./styles.css";

interface EasyTranslateIconProps {
  status: number; // 状态 -1、0、1、2、3 或 4 (4表示翻译异常)
}

const EasyTranslateIcon: React.FC<EasyTranslateIconProps> = ({ status }) => {
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isPartlyTranslated, setIsPartlyTranslated] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isTranslateException, setIsTranslateException] =
    useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsError(status === -1);
    setIsTranslated(status === 1);
    setIsTranslating(status === 2);
    setIsPartlyTranslated(
      status === 3 || status === 5 || status === 6 || status === 7,
    );
    setIsTranslateException(status === 4);
  }, [status]);

  // 异常状态的提示内容
  const exceptionContent = (
    <p
      style={{
        maxWidth: "300px",
        margin: 0,
        color: "#ff4d4f",
        fontSize: "14px",
        lineHeight: "1.5",
      }}
    >
      {t(
        "Some content of the store does not comply with OpenAI's translation policy, please contact us for manual support.",
      )}
    </p>
  );

  const iconContent = (
    <div
      className={`solidCircle ${isError
        ? "error"
        : isTranslated
          ? "translated"
          : isTranslating
            ? "translating"
            : isPartlyTranslated
              ? "partly_translated"
              : isTranslateException
                ? "translate_exception"
                : "untranslated"
        }`}
    />
  );

  return isTranslateException ? (
    <Popover
      content={exceptionContent}
      title={t("Translation Exception")}
      placement="top"
      trigger="hover"
      styles={{
        root: { maxWidth: 350 },
        body: {
          padding: "12px",
          backgroundColor: "#fff1f0",
          border: "1px solid #ffccc7",
        },
      }}
    >
      {iconContent}
    </Popover>
  ) : (
    iconContent
  );
};

export default EasyTranslateIcon;
