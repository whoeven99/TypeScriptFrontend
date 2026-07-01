import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { withEmbeddedSearch } from "~/utils/embeddedAction";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  throw redirect(
    withEmbeddedSearch("/app/translate-v4", new URL(request.url).search),
  );
};

export default function Index() {
  return null;
}
