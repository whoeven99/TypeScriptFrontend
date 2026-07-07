import type { TFunction } from "i18next";
import {
  isV4CancelledMessage,
  isV4ManualPauseMessage,
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
  const trimmed = errorMessage?.trim();
  if (!trimmed) {
    return {
      message: null,
      kind: null,
      action: null,
    };
  }

  const normalized = trimmed.toLowerCase();
  let kind: V4JobNoticeKind = "generic";

  if (isV4QuotaInsufficientMessage(normalized)) {
    kind = "quota_insufficient";
  } else if (isV4ManualPauseMessage(trimmed)) {
    kind = "manual_pause";
  } else if (isV4CancelledMessage(trimmed)) {
    kind = "cancelled";
  }

  return {
    message: translateV4Message(trimmed, t),
    kind,
    action: kind === "quota_insufficient" ? "buy_credits" : null,
  };
}

function isV4QuotaInsufficientMessage(normalizedMessage: string): boolean {
  return (
    normalizedMessage.includes("额度不足") ||
    normalizedMessage.includes("积分不足") ||
    normalizedMessage.includes("额度已用完") ||
    normalizedMessage.includes("translation credits have been used up") ||
    normalizedMessage.includes("translation word credits have been exhausted") ||
    normalizedMessage.includes("not enough translation credits") ||
    normalizedMessage.includes("out of translation credits")
  );
}
