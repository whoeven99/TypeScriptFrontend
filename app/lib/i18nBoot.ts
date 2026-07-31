/** SSR → client handoff so hydrate does not wait on /locales/*.json. */

import type { Resource } from "i18next";

export const CIWI_I18N_BOOT_KEY = "__CIWI_I18N__";

export type CiwiI18nBoot = {
  lng: string;
  resources: Resource;
};

declare global {
  interface Window {
    __CIWI_I18N__?: CiwiI18nBoot;
  }
}

/** Escape JSON for a safe inline `<script>` assignment. */
export function serializeI18nBoot(boot: CiwiI18nBoot): string {
  return JSON.stringify(boot).replace(/</g, "\\u003c");
}

export function i18nBootInlineScript(boot: CiwiI18nBoot): string {
  return `<script>window.${CIWI_I18N_BOOT_KEY}=${serializeI18nBoot(boot)};</script>`;
}

export function readI18nBoot(): CiwiI18nBoot | null {
  if (typeof window === "undefined") return null;
  const boot = window.__CIWI_I18N__;
  if (!boot?.lng || !boot.resources || typeof boot.resources !== "object") {
    return null;
  }
  return boot;
}
