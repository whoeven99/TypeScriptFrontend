export const OPEN_CREDITS_PURCHASE_MODAL_EVENT =
  "ciwi:open-credits-purchase-modal";

export function openCreditsPurchaseModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CREDITS_PURCHASE_MODAL_EVENT));
}
