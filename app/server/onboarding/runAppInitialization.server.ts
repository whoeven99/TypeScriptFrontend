import {
  AddDefaultLanguagePack,
  AddUserFreeSubscription,
  InitializationDetection,
  InsertCharsByShopName,
  InsertTargets,
  UserInitialization,
} from "~/api/JavaServer";
import { onAppInstalled } from "~/server/appLifecycle/onAppLifecycle.server";
import { isTsfBillingShop } from "~/server/billing/isTsfBillingShop.server";
import { detectTsfInitialization } from "./detectTsfInitialization.server";
import { loadShopProfileFieldsFromShopify } from "./loadShopProfileFromShopify.server";
import {
  ensureDefaultLanguagePack,
  grantInstallTrialIfEligible,
  syncShopTargets,
  upsertShopProfile,
} from "./onboarding.server";
import { resolveAppInitPath } from "./resolveAppInitPath.server";

export type RunAppInitializationParams = {
  shop: string;
  accessToken?: string;
  sessionId?: string;
  source: string;
  targetLocales: string[];
};

async function runJavaAppInitialization(params: {
  shop: string;
  accessToken?: string;
  source: string;
  targetLocales: string[];
}): Promise<void> {
  if (params.accessToken) {
    await UserInitialization({
      shop: params.shop,
      accessToken: params.accessToken,
    });
  }

  const init = await InitializationDetection({ shop: params.shop });
  if (init?.success && params.accessToken) {
    if (!init.response?.insertCharsByShopName) {
      await InsertCharsByShopName({
        shop: params.shop,
        accessToken: params.accessToken,
      });
    }
    if (!init.response?.addUserSubscriptionPlan) {
      await AddUserFreeSubscription({ shop: params.shop });
    }
    if (!init.response?.addDefaultLanguagePack) {
      await AddDefaultLanguagePack({ shop: params.shop });
    }
  }

  if (params.accessToken && params.source && params.targetLocales.length > 0) {
    await InsertTargets({
      shop: params.shop,
      accessToken: params.accessToken,
      source: params.source,
      targets: params.targetLocales,
    });
  }
}

async function runTsfAppInitialization(
  params: RunAppInitializationParams,
): Promise<void> {
  const hadAccount = await isTsfBillingShop(params.shop);

  if (!hadAccount && params.sessionId) {
    await onAppInstalled({
      shop: params.shop,
      sessionId: params.sessionId,
      installedAt: new Date(),
    });
  }

  const init = await detectTsfInitialization(params.shop);

  if (!init.insertCharsByShopName) {
    await grantInstallTrialIfEligible(params.shop);
  }

  if (params.accessToken) {
    const profileFields = await loadShopProfileFieldsFromShopify({
      shop: params.shop,
      accessToken: params.accessToken,
    });
    if (profileFields) {
      await upsertShopProfile({
        shop: params.shop,
        ...profileFields,
      });
    }
  }

  if (!init.addDefaultLanguagePack) {
    await ensureDefaultLanguagePack(params.shop);
  }

  if (params.source) {
    await syncShopTargets({
      shop: params.shop,
      primaryLocale: params.source,
      targetLocales: params.targetLocales,
    });
  }
}

export async function runAppInitialization(
  params: RunAppInitializationParams,
): Promise<void> {
  const path = await resolveAppInitPath(params.shop);

  if (path === "tsf") {
    await runTsfAppInitialization(params);
    return;
  }

  await runJavaAppInitialization(params);
}

export async function runLanguageTargetsSync(params: {
  shop: string;
  accessToken: string;
  source: string;
  targets: string[];
}): Promise<void> {
  const path = await resolveAppInitPath(params.shop);

  if (path === "tsf") {
    await syncShopTargets({
      shop: params.shop,
      primaryLocale: params.source,
      targetLocales: params.targets,
    });
    return;
  }

  await InsertTargets({
    shop: params.shop,
    accessToken: params.accessToken,
    source: params.source,
    targets: params.targets,
  });
}
