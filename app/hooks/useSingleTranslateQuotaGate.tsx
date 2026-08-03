import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { CreateTaskQuotaGateModal } from "~/routes/app.translate-v4/components/CreateTaskQuotaGateModal";
import {
  isSingleTranslateQuotaError,
  resolveSingleTranslateErrorMessage,
  resolveSingleTranslateQuotaGateMode,
} from "~/lib/singleTranslateQuotaFeedback";
import { TRANSLATE_V4_ERROR_KEYS } from "~/utils/translateV4Errors";

export function useSingleTranslateQuotaGate() {
  const { t } = useTranslation();
  const isNew = useSelector(
    (state: { userConfig?: { isNew?: boolean | null } }) =>
      state.userConfig?.isNew ?? null,
  );
  const [quotaGateMode, setQuotaGateMode] = useState<
    "trial" | "pricing" | null
  >(null);

  const handleSingleTranslateFailure = useCallback(
    (errorMsg?: string | null) => {
      if (errorMsg && isSingleTranslateQuotaError(errorMsg)) {
        const mode = resolveSingleTranslateQuotaGateMode(errorMsg, isNew);
        if (mode) {
          setQuotaGateMode(mode);
          return;
        }
      }

      const message = resolveSingleTranslateErrorMessage(
        t,
        errorMsg,
        TRANSLATE_V4_ERROR_KEYS.SINGLE_TRANSLATE_FAILED,
      );
      shopify.toast.show(message);
    },
    [isNew, t],
  );

  const quotaGateModal =
    quotaGateMode !== null ? (
      <CreateTaskQuotaGateModal
        open
        mode={quotaGateMode}
        onClose={() => setQuotaGateMode(null)}
      />
    ) : null;

  return {
    handleSingleTranslateFailure,
    quotaGateModal,
    resolveSingleTranslateErrorMessage: (errorMsg?: string | null) =>
      resolveSingleTranslateErrorMessage(
        t,
        errorMsg,
        TRANSLATE_V4_ERROR_KEYS.SINGLE_TRANSLATE_FAILED,
      ),
    openQuotaGateForError: (errorMsg?: string | null) => {
      if (!errorMsg || !isSingleTranslateQuotaError(errorMsg)) return;
      const mode = resolveSingleTranslateQuotaGateMode(errorMsg, isNew);
      if (mode) setQuotaGateMode(mode);
    },
  };
}
