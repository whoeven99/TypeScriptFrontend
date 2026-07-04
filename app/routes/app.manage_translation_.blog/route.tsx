import SeoContentResourcePage, {
  type SeoContentResourceConfig,
} from "~/components/manageTranslation/SeoContentResourcePage";
import { createSeoContentResourceAction } from "~/server/manageTranslation/seoContentResourceAction.server";
import { manageTranslationLanguageLoader } from "~/server/manageTranslation/manageTranslationRoute.server";

const config: SeoContentResourceConfig = {
  slug: "blog",
  resourceType: "BLOG",
  itemValue: "blog",
  pageTitle: "Blog titles",
  primaryFields: [{ key: "title", label: "Title" }],
  seoFields: [{ key: "handle", label: "URL handle" }],
};

export const loader = manageTranslationLanguageLoader;
export const action = createSeoContentResourceAction(config);

export default function BlogManageTranslationRoute() {
  return <SeoContentResourcePage config={config} />;
}
