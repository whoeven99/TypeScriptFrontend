import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  handleTsfPurchaseWebhook,
  handleTsfSubscriptionWebhook,
} from "~/server/billing/webhooks/handleBillingWebhook.server";
import { sendFeishuTextMessage } from "~/server/feishu/sendFeishuTextMessage.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    throw new Response();
  }

  console.log(`${shop} ${topic} webhooks: ${payload}`);

  switch (topic) {
    case "APP_UNINSTALLED": {
      // 无论如何必须返回 200，删除失败只记日志不阻断响应
      try {
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
      } catch (e) {
        console.error("APP_UNINSTALLED: session delete failed", e);
      }
      try {
        await db.account.updateMany({
          where: { shop },
          data: { deletedAt: new Date() },
        });
      } catch (e) {
        console.error("APP_UNINSTALLED: account soft-delete failed", e);
      }
      // 飞书通知（非阻断）
      void sendFeishuTextMessage(`🛑 店铺卸载：${shop}`);
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

    case "SHOP_REDACT": {
      // 无论如何必须返回 200，删除失败只记日志不阻断响应
      try {
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
      } catch (e) {
        console.error("SHOP_REDACT: session delete failed", e);
      }
      try {
        await db.account.updateMany({
          where: { shop },
          data: { deletedAt: new Date() },
        });
      } catch (e) {
        console.error("SHOP_REDACT: account soft-delete failed", e);
      }
      return new Response(null, { status: 200 });
    }

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
