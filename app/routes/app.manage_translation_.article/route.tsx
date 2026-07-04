import SeoContentResourcePage, {
  type SeoContentResourceConfig,
} from "~/components/manageTranslation/SeoContentResourcePage";
import { createSeoContentResourceAction } from "~/server/manageTranslation/seoContentResourceAction.server";
import { manageTranslationLanguageLoader } from "~/server/manageTranslation/manageTranslationRoute.server";

const config: SeoContentResourceConfig = {
  slug: "article",
  resourceType: "ARTICLE",
  itemValue: "article",
  pageTitle: "Articles",
  primaryFields: [
    { key: "title", label: "Title" },
    { key: "body_html", label: "Description" },
    { key: "summary_html", label: "Summary" },
  ],
};

export const loader = manageTranslationLanguageLoader;
export const action = createSeoContentResourceAction(config);

export default function ArticleManageTranslationRoute() {
  return <SeoContentResourcePage config={config} />;
}
