import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { GetPendingOrders, InsertOrUpdateOrder } from "~/api/serve";
import { queryOrders } from "~/api/admin";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin } = await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    // The SHOP_REDACT webhook will be fired up to 48 hours after a shop uninstalls the app.
    // Because of this, no admin context is available.
    throw new Response();
  }

  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }

      break;
    case "APP_PURCHASES_ONE_TIME_UPDATE":
      const ids: string[] = await GetPendingOrders({ shop });
      console.log("ids: ", ids);
      for (const id of ids) {
        console.log("Processing order id: ", id);
        try {
          const data = await queryOrders({ request, id });
          console.log("data: ", data);

          if (data) {
            await InsertOrUpdateOrder({
              id: id,
              status: data?.status,
            });
            console.log(`Order ${id} processed successfully.`);
          } else {
            console.log(`No data found for order id: ${id}`);
          }
        } catch (error) {
          console.error(`Error processing order ${id}:`, error);
          // 选择继续处理下一个订单或提前中止
        }
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
