import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  handleTsfPurchaseWebhook,
  handleTsfSubscriptionWebhook,
} from "~/server/billing/webhooks/handleBillingWebhook.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    throw new Response();
  }

  console.log(`${shop} ${topic} webhooks: ${payload}`);

  switch (topic) {
    case "APP_UNINSTALLED":
      try {
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        break;
      } catch (error) {
        console.error("Error APP_UNINSTALLED:", error);
        return new Response(null, { status: 200 });
      }

    case "APP_PURCHASES_ONE_TIME_UPDATE":
      try {
        await handleTsfPurchaseWebhook({
          shop,
          accessToken: session?.accessToken,
          payload,
        });
        break;
      } catch (error) {
        console.error("Error processing purchase:", error);
        return new Response(null, { status: 200 });
      }

    case "APP_SUBSCRIPTIONS_UPDATE":
      try {
        await handleTsfSubscriptionWebhook({
          shop,
          accessToken: session?.accessToken,
          payload,
        });
        break;
      } catch (error) {
        console.error("Error APP_SUBSCRIPTIONS_UPDATE:", error);
        return new Response(null, { status: 200 });
      }

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
      break;

    case "SHOP_REDACT":
      try {
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        break;
      } catch (error) {
        console.error("Error SHOP_REDACT:", error);
        return new Response(null, { status: 200 });
      }

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
