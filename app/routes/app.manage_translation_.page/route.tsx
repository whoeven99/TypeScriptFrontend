import SeoContentResourcePage, {
  type SeoContentResourceConfig,
} from "~/components/manageTranslation/SeoContentResourcePage";
import { createSeoContentResourceAction } from "~/server/manageTranslation/seoContentResourceAction.server";
import { manageTranslationLanguageLoader } from "~/server/manageTranslation/manageTranslationRoute.server";

const config: SeoContentResourceConfig = {
  slug: "page",
  resourceType: "PAGE",
  itemValue: "page",
  pageTitle: "Pages",
};

export const loader = manageTranslationLanguageLoader;
export const action = createSeoContentResourceAction(config);

export default function PageManageTranslationRoute() {
  return <SeoContentResourcePage config={config} />;
}
