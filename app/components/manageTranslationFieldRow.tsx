import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Typography } from "antd";
import ManageTableInput from "./manageTableInput";

const { Text } = Typography;

interface ManageTranslationFieldRowProps {
  record: any;
  isHtml?: boolean;
  isSuccess?: boolean;
  translatedValues?: {
    [key: string]: string;
  };
  setTranslatedValues?: Dispatch<
    SetStateAction<{
      [key: string]: string;
    }>
  >;
  handleInputChange?: (record: any, value: string) => void;
  isRtl?: boolean;
  action?: ReactNode;
  stacked?: boolean;
  sourceLabel: string;
  translatedLabel: string;
}

const sectionLabelStyle = {
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "18px",
};

export default function ManageTranslationFieldRow({
  record,
  isHtml = false,
  isSuccess = false,
  translatedValues,
  setTranslatedValues,
  handleInputChange,
  isRtl = false,
  action,
  stacked = false,
  sourceLabel,
  translatedLabel,
}: ManageTranslationFieldRowProps) {
  if (!record) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "12px 0",
      }}
    >
      <Text
        type="secondary"
        style={{
          fontSize: 12,
          fontWeight: 600,
          lineHeight: "18px",
        }}
      >
        {record?.resource}
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: stacked
            ? "minmax(0, 1fr)"
            : "repeat(2, minmax(0, 1fr))",
          gap: "12px 16px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
          }}
        >
          <Text type="secondary" style={sectionLabelStyle}>
            {sourceLabel}
          </Text>
          <ManageTableInput record={record} isHtml={isHtml} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text type="secondary" style={sectionLabelStyle}>
              {translatedLabel}
            </Text>
            {action}
          </div>
          <ManageTableInput
            record={record}
            isHtml={isHtml}
            isSuccess={isSuccess}
            translatedValues={translatedValues}
            setTranslatedValues={setTranslatedValues}
            handleInputChange={handleInputChange}
            isRtl={isRtl}
          />
        </div>
      </div>
    </div>
  );
}
