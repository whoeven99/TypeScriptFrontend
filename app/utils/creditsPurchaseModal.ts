export const OPEN_CREDITS_PURCHASE_MODAL_EVENT =
  "ciwi:open-credits-purchase-modal";

export type TranslateV4TaskCreditsPurchaseContext = {
  kind: "translate_v4_task";
  taskId: string;
  source: string;
  target: string;
  estimatedRemainingCredits: number | null;
  currentRemainingCredits: number | null;
  shortfallCredits: number | null;
};

export type CreateTaskCreditsPurchaseContext = {
  kind: "create_task";
  targetsCount: number;
  modulesCount: number;
  estimatedCredits: number | null;
  currentRemainingCredits: number | null;
  shortfallCredits: number | null;
};

export type CreditsPurchaseModalContext =
  | TranslateV4TaskCreditsPurchaseContext
  | CreateTaskCreditsPurchaseContext;

export function openCreditsPurchaseModal(
  context?: CreditsPurchaseModalContext | null,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CreditsPurchaseModalContext | null>(
      OPEN_CREDITS_PURCHASE_MODAL_EVENT,
      {
        detail: context ?? null,
      },
    ),
  );
}
