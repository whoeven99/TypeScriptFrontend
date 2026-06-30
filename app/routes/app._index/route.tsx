import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { withEmbeddedSearch } from "~/utils/embeddedAction";

/** 首页统一进入 v4 智能翻译。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  throw redirect(withEmbeddedSearch("/app/translate-v4", new URL(request.url).search));
};

export default function Index() {
  return null;
}
