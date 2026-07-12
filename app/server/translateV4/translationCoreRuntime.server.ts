import {
  configureTranslationCore,
  type TranslationCoreRedis,
} from "@ciwi/translation-core/runtime";
import prisma from "~/db.server";
import { getTranslateV4RedisClient } from "./redis.server";

configureTranslationCore({
  getRedis: () =>
    getTranslateV4RedisClient() as unknown as TranslationCoreRedis,
  loadGlossaryRows: async (shopName, target) => {
    const rows = await prisma.glossary.findMany({
      where: {
        shop: shopName,
        status: 1,
        OR: [
          { rangeCode: target },
          { rangeCode: "ALL" },
          { rangeCode: null },
        ],
      },
      select: {
        sourceText: true,
        targetText: true,
        rangeCode: true,
        caseSensitive: true,
      },
    });
    return rows;
  },
});
