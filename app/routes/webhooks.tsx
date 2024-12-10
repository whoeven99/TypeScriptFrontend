import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { AddCharsByShopName, InsertOrUpdateOrder } from "~/api/serve";
import { queryOrders } from "~/api/admin";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

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
      try {
        if (payload) {
          await InsertOrUpdateOrder({
            id: payload?.app_purchase_one_time.admin_graphql_api_id,
            status: payload?.app_purchase_one_time.status,
          });
          console.log(
            `Order ${payload.app_purchase_one_time} processed successfully.`,
          );
          if (payload?.app_purchase_one_time.status === "ACTIVE") {
            console.log("name: ", payload?.app_purchase_one_time.name);
            switch (payload?.app_purchase_one_time.name) {
              case "200K Credits":
                await AddCharsByShopName({ shop, amount: 200000 });
                break;
              case "500K Credits":
                await AddCharsByShopName({ shop, amount: 500000 });
                break;
              case "1M Credits":
                await AddCharsByShopName({ shop, amount: 1000000 });
                break;
              case "2M Credits":
                await AddCharsByShopName({ shop, amount: 2000000 });
                break;
              case "3M Credits":
                await AddCharsByShopName({ shop, amount: 3000000 });
                break;
              case "4M Credits":
                await AddCharsByShopName({ shop, amount: 4000000 });
                break;
            }
          }
        } else {
          console.log(`No data found for order id`);
        }
      } catch (error) {
        console.error(
          `Error processing order ${payload.app_purchase_one_time}:`,
          error,
        );
        // 选择继续处理下一个订单或提前中止
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
      break;
    case "CUSTOMERS_REDACT":
      break;
    case "SHOP_REDACT":
      break;
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
