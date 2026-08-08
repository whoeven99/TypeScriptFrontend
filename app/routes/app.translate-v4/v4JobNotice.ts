import type { TFunction } from "i18next";
import {
  isV4CancelledMessage,
  isV4ManualPauseMessage,
  isV4QuotaInsufficientMessage,
  resolveV4UserFacingMessageCode,
  v4UserFacingMessageI18nKey,
  V4_MESSAGE_CANCELLED,
  V4_MESSAGE_JOB_FAILED,
  V4_MESSAGE_MANUAL_PAUSE,
  V4_MESSAGE_QUOTA_INSUFFICIENT,
  V4_MESSAGE_QUOTA_INSUFFICIENT_PARTIAL,
  V4_MESSAGE_QUOTA_SERVICE_ERROR,
} from "~/shared/translateV4MessageTokens";
import { translateV4Message } from "./v4I18n";

export type V4JobNoticeKind =
  | "quota_insufficient"
  | "manual_pause"
  | "cancelled"
  | "generic";

export type V4JobNoticeAction = "buy_credits";

export type V4JobNotice = {
  message: string | null;
  kind: V4JobNoticeKind | null;
  action: V4JobNoticeAction | null;
};

export function getV4JobNotice(
  errorMessage: string | null | undefined,
  t: TFunction,
): V4JobNotice {
  const code = resolveV4UserFacingMessageCode(errorMessage);
  if (!code) {
    return {
      message: null,
      kind: null,
      action: null,
    };
  }

  let kind: V4JobNoticeKind = "generic";
  if (
    code === V4_MESSAGE_QUOTA_INSUFFICIENT ||
    code === V4_MESSAGE_QUOTA_INSUFFICIENT_PARTIAL ||
    isV4QuotaInsufficientMessage(code)
  ) {
    kind = "quota_insufficient";
  } else if (
    code === V4_MESSAGE_MANUAL_PAUSE ||
    isV4ManualPauseMessage(code)
  ) {
    kind = "manual_pause";
  } else if (code === V4_MESSAGE_CANCELLED || isV4CancelledMessage(code)) {
    kind = "cancelled";
  } else if (code === V4_MESSAGE_QUOTA_SERVICE_ERROR || code === V4_MESSAGE_JOB_FAILED) {
    kind = "generic";
  }

  return {
    message: translateV4Message(code, t),
    kind,
    action: kind === "quota_insufficient" ? "buy_credits" : null,
  };
}
