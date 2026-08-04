const BILLING_RETURN_PARAM = "ciwiBillingReturn";
const BILLING_RETURN_KIND_PARAM = "ciwiBillingKind";
const BILLING_RETURN_PREV_TOTAL_PARAM = "ciwiBillingPrevTotal";

type BillingReturnKind = "credits" | "plan";

export function sanitizeBillingReturnPath(
  input: string | null | undefined,
  fallback = "/app/pricing",
) {
  if (!input) return fallback;

  try {
    const url = new URL(input, "https://ciwi.local");
    if (!url.pathname.startsWith("/app/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function stripBillingReturnParams(path: string) {
  const url = new URL(sanitizeBillingReturnPath(path), "https://ciwi.local");
  url.searchParams.delete(BILLING_RETURN_PARAM);
  url.searchParams.delete(BILLING_RETURN_KIND_PARAM);
  url.searchParams.delete(BILLING_RETURN_PREV_TOTAL_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildBillingReturnPath(
  path: string,
  options?: {
    kind?: BillingReturnKind;
    previousTotalChars?: number;
  },
) {
  const url = new URL(
    stripBillingReturnParams(path),
    "https://ciwi.local",
  );
  url.searchParams.set(BILLING_RETURN_PARAM, "1");
  url.searchParams.set(BILLING_RETURN_KIND_PARAM, options?.kind ?? "credits");
  if (typeof options?.previousTotalChars === "number") {
    url.searchParams.set(
      BILLING_RETURN_PREV_TOTAL_PARAM,
      String(options.previousTotalChars),
    );
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseBillingReturn(search: string) {
  const params = new URLSearchParams(search);
  if (params.get(BILLING_RETURN_PARAM) !== "1") {
    return null;
  }

  const kind = params.get(BILLING_RETURN_KIND_PARAM);
  const previousTotalRaw = params.get(BILLING_RETURN_PREV_TOTAL_PARAM);
  const previousTotalChars =
    previousTotalRaw != null && previousTotalRaw !== ""
      ? Number(previousTotalRaw)
      : undefined;

  return {
    kind: kind === "plan" ? "plan" : "credits",
    previousTotalChars:
      typeof previousTotalChars === "number" &&
      Number.isFinite(previousTotalChars)
        ? previousTotalChars
        : undefined,
  } as const;
}
