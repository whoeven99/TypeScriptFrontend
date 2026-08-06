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
  color: "var(--p-color-text-secondary)",
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
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: "20px",
          color: "var(--p-color-text)",
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
          width: "100%",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              minHeight: 24,
            }}
          >
            <Text style={sectionLabelStyle}>{sourceLabel}</Text>
          </div>
          <ManageTableInput record={record} isHtml={isHtml} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              minHeight: 24,
            }}
          >
            <Text style={sectionLabelStyle}>{translatedLabel}</Text>
            {action ? (
              <div style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}>
                {action}
              </div>
            ) : null}
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
