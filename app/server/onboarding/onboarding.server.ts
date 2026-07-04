import prisma from "~/db.server";
import { appendBillingLog } from "~/server/billing/billingLog.server";
import { ensureAccount } from "~/server/billing/account/ensureAccount.server";
import {
  BILLING_LOG_EVENT,
  INSTALL_TRIAL_TOKENS,
} from "~/server/billing/types.server";

export async function grantInstallTrialIfEligible(shop: string): Promise<boolean> {
  await ensureAccount(shop);

  const prior = await prisma.billingLog.findFirst({
    where: {
      shop,
      eventType: BILLING_LOG_EVENT.TRIAL_GRANTED,
    },
  });
  if (prior) return false;

  await prisma.account.update({
    where: { shop },
    data: {
      trialTokens: { increment: INSTALL_TRIAL_TOKENS },
    },
  });

  await appendBillingLog({
    shop,
    eventType: BILLING_LOG_EVENT.TRIAL_GRANTED,
    tokensDelta: INSTALL_TRIAL_TOKENS,
    metadata: { source: "install" },
  });

  return true;
}

export type UpsertShopProfileParams = {
  shop: string;
  accessToken?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  userTag?: string;
  defaultThemeId?: string | null;
  defaultThemeName?: string | null;
  defaultLanguage?: string | null;
};

export async function upsertShopProfile(
  params: UpsertShopProfileParams,
): Promise<void> {
  const shop = params.shop.trim();
  if (!shop) return;

  await prisma.shopProfile.upsert({
    where: { shop },
    create: {
      shop,
      email: params.email ?? null,
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
      userTag: params.userTag ?? null,
      defaultThemeId: params.defaultThemeId ?? null,
      defaultThemeName: params.defaultThemeName ?? null,
      defaultLanguage: params.defaultLanguage ?? null,
      accessToken: params.accessToken ?? null,
    },
    update: {
      ...(params.email !== undefined ? { email: params.email } : {}),
      ...(params.firstName !== undefined ? { firstName: params.firstName } : {}),
      ...(params.lastName !== undefined ? { lastName: params.lastName } : {}),
      ...(params.userTag !== undefined ? { userTag: params.userTag } : {}),
      ...(params.defaultThemeId !== undefined
        ? { defaultThemeId: params.defaultThemeId }
        : {}),
      ...(params.defaultThemeName !== undefined
        ? { defaultThemeName: params.defaultThemeName }
        : {}),
      ...(params.defaultLanguage !== undefined
        ? { defaultLanguage: params.defaultLanguage }
        : {}),
      ...(params.accessToken !== undefined
        ? { accessToken: params.accessToken }
        : {}),
    },
  });
}

export async function ensureDefaultLanguagePack(shop: string): Promise<void> {
  await prisma.shopLanguagePack.upsert({
    where: { shop },
    create: { shop, packKey: "general" },
    update: {},
  });
}

export async function syncShopTargets(params: {
  shop: string;
  primaryLocale: string;
  targetLocales: string[];
}): Promise<void> {
  const shop = params.shop.trim();
  if (!shop) return;

  const targets = [...new Set(params.targetLocales.filter(Boolean))];

  await prisma.shopTranslationSettings.upsert({
    where: { shop },
    create: {
      shop,
      primaryLocale: params.primaryLocale || "en",
      targets,
      autoTranslate: false,
      migratedToTsf: true,
      migratedAt: new Date(),
    },
    update: {
      primaryLocale: params.primaryLocale || "en",
      targets,
    },
  });

  for (const locale of targets) {
    await prisma.shopTargetLocale.upsert({
      where: {
        shop_locale: { shop, locale },
      },
      create: {
        shop,
        locale,
        autoTranslate: false,
        status: 1,
      },
      update: {},
    });
  }
}

export async function hasInstallTrialGranted(shop: string): Promise<boolean> {
  const row = await prisma.billingLog.findFirst({
    where: { shop, eventType: BILLING_LOG_EVENT.TRIAL_GRANTED },
    select: { id: true },
  });
  return row != null;
}
