import SeoContentResourcePage, {
  type SeoContentResourceConfig,
} from "~/components/manageTranslation/SeoContentResourcePage";
import { createSeoContentResourceAction } from "~/server/manageTranslation/seoContentResourceAction.server";
import { manageTranslationLanguageLoader } from "~/server/manageTranslation/manageTranslationRoute.server";

const config: SeoContentResourceConfig = {
  slug: "collection",
  resourceType: "COLLECTION",
  itemValue: "collection",
  pageTitle: "Collections",
};

export const loader = manageTranslationLanguageLoader;
export const action = createSeoContentResourceAction(config);

export default function CollectionManageTranslationRoute() {
  return <SeoContentResourcePage config={config} />;
}
