import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { loadAppBootstrapData } from "~/server/appBootstrap.server";

/** GET /api/app-bootstrap —— 订阅/配额等 Java 数据，客户端并行拉取，不阻塞 SSR。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    const bootstrap = await loadAppBootstrapData(session.shop);
    return json({ ok: true, bootstrap });
  } catch (err) {
    console.error("[app-bootstrap] load failed:", err);
    return json({ ok: false, error: "bootstrap failed" }, { status: 500 });
  }
};
