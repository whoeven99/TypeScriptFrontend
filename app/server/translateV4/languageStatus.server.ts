import { listV4Jobs } from "./cosmos.server";
import { sameTranslationLocale } from "./locale";
import {
  ACTIVE_V4_STATUSES,
  type TranslationV4Job,
  type TranslationV4Status,
} from "./types";
import { listTargetLocales } from "./targetLocale.server";

/**
 * 语言页 status 与 Java GetLanguageList 对齐：
 * 0 未翻译 · 1 已翻译 · 2 翻译中 · 3 部分翻译(可继续) · 4 翻译异常
 */
export function mapV4JobsToLanguageStatus(
  target: string,
  jobs: TranslationV4Job[],
): number {
  const forTarget = jobs
    .filter((j) => sameTranslationLocale(j.target, target))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  if (!forTarget.length) return 0;

  if (forTarget.some((j) => ACTIVE_V4_STATUSES.includes(j.status))) {
    return 2;
  }

  const latest = forTarget[0];
  return mapTerminalV4Status(latest.status);
}

function mapTerminalV4Status(status: TranslationV4Status): number {
  switch (status) {
    case "COMPLETED":
      return 1;
    case "PAUSED":
      return 3;
    case "FAILED":
      return 4;
    case "CANCELLED":
      return 0;
    default:
      return 0;
  }
}

/** 语言页列表：autoTranslate 来自 Prisma，status 以 v4 Cosmos 任务为准。 */
export async function listLanguageStatusFromV4(shop: string) {
  const prismaRows = await listTargetLocales(shop);
  const jobs = await listV4Jobs(shop, 100);

  const localeSet = new Set<string>();
  for (const row of prismaRows) localeSet.add(row.locale);
  for (const job of jobs) localeSet.add(job.target);

  return [...localeSet].map((locale) => {
    const prismaRow = prismaRows.find((r) =>
      sameTranslationLocale(r.locale, locale),
    );
    return {
      target: locale,
      autoTranslate: prismaRow?.autoTranslate ?? false,
      status: mapV4JobsToLanguageStatus(locale, jobs),
    };
  });
}
