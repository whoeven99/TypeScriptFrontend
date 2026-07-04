import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { loadAppBootstrapData } from "~/server/appBootstrap.server";

/** GET /api/app-bootstrap —— 订阅/配额；TSF 新用户读 Turso，老用户读 Java。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const server = process.env.SERVER_URL || "";

  try {
    const bootstrap = await loadAppBootstrapData({
      shop: session.shop,
      server,
    });
    return json({ ok: true, bootstrap });
  } catch (err) {
    console.error("[app-bootstrap] load failed:", err);
    return json({ ok: false, error: "bootstrap failed" }, { status: 500 });
  }
};
