import { useTranslation } from "react-i18next";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { jobDisplayPercent } from "~/routes/app.translate-v4/jobStageUtils";
import {
  ProgressRing,
  StatusTag,
} from "~/routes/app.translate-v4/components/V4JobCardParts";
import { v4Colors } from "~/routes/app.translate-v4/v4Styles";

type Props = {
  summary: TranslationJobProgressSummary;
};

/**
 * 试译进度：翻译完成后停在 TRANSLATE_DONE，不会自动写回 Shopify。
 * 因此这里不展示「初始化 / 翻译 / 写回」三阶段，只显示统一的「翻译中」。
 */
export function TrialProgressCard({ summary }: Props) {
  const { t } = useTranslation();
  const percent = jobDisplayPercent(summary);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <ProgressRing percent={percent} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <StatusTag
              status="TRANSLATING"
              label={t("trial.status.TRANSLATING")}
            />
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: "18px",
              color: v4Colors.textMuted,
            }}
          >
            {t("trial.progressHint")}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              lineHeight: "18px",
              color: v4Colors.textMuted,
            }}
          >
            {t("trial.progressEta")}
          </div>
        </div>
      </div>
    </div>
  );
}
