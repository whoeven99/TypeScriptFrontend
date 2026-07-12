import {
  configureTranslationCore,
  type TranslationCoreRedis,
} from "../../../packages/translation-core/dist/runtime.js";
import { getRedis } from "./redisV4.js";
import {
  hasTsfDbCredentials,
  loadGlossaryRowsFromTsf,
} from "./tsfDb.js";

configureTranslationCore({
  getRedis: () => getRedis() as unknown as TranslationCoreRedis,
  loadGlossaryRows: async (shopName, target) => {
    if (!hasTsfDbCredentials()) return [];
    return loadGlossaryRowsFromTsf(shopName, target);
  },
});
