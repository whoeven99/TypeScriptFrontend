import {
  configureTranslationCore,
  type TranslationCoreRedis,
} from "@ciwi/translation-core/runtime";
import { getRedis } from "./redisV4.js";
import {
  hasTsfDbCredentials,
  loadGlossaryRowsFromTsf,
} from "./tsfDb.js";

configureTranslationCore({
  getRedis: () => getRedis() as unknown as TranslationCoreRedis,
  loadGlossaryRows: async (shopName: string, target: string) => {
    if (!hasTsfDbCredentials()) return [];
    return loadGlossaryRowsFromTsf(shopName, target);
  },
});
