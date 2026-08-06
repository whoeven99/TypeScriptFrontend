import {
  resolveV4UserFacingMessageCode,
} from "~/shared/translateV4MessageTokens";

/**
 * Normalize merchant-visible pause/fail reasons to stable codes.
 * Internal ops strings → null; unknown Exception text → JOB_FAILED.
 */
export function sanitizeV4UserErrorMessage(
  message: string | null | undefined,
): string | null {
  return resolveV4UserFacingMessageCode(message, { unknownAs: "job_failed" });
}

/** 暂停类文案是否适合作为 PAUSED 的 errorMessage 落盘。 */
export function isUserFacingV4PauseReason(reason: string): boolean {
  return sanitizeV4UserErrorMessage(reason) !== null;
}
