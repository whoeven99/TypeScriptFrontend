import SeoContentResourcePage, {
  type SeoContentResourceConfig,
} from "~/components/manageTranslation/SeoContentResourcePage";
import { createSeoContentResourceAction } from "~/server/manageTranslation/seoContentResourceAction.server";
import { manageTranslationLanguageLoader } from "~/server/manageTranslation/manageTranslationRoute.server";

const config: SeoContentResourceConfig = {
  slug: "email",
  resourceType: "EMAIL_TEMPLATE",
  itemValue: "email",
  pageTitle: "Email",
  primaryFields: [
    { key: "title", label: "Title" },
    { key: "body_html", label: "Description" },
  ],
  seoFields: [],
};

export const loader = manageTranslationLanguageLoader;
export const action = createSeoContentResourceAction(config);

export default function EmailManageTranslationRoute() {
  return <SeoContentResourcePage config={config} />;
}
