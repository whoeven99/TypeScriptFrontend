import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  AddCharsByShopName,
  CleanData,
  DeleteData,
  InsertOrUpdateOrder,
  RequestData,
  Uninstall,
} from "~/api/serve";

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
      try {
        await db.session.deleteMany({ where: { shop } });
        await Uninstall({ shop });
        break;
      } catch (error) {
        console.error("Error APP_UNINSTALLED:", error);
        throw new Error("Error APP_UNINSTALLED");
      }
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
              case "10K Credits":
                await AddCharsByShopName({ shop, amount: 10000 });
                break;
              case "20K Credits":
                await AddCharsByShopName({ shop, amount: 20000 });
                break;
              case "50K Credits":
                await AddCharsByShopName({ shop, amount: 50000 });
                break;
              case "100K Credits":
                await AddCharsByShopName({ shop, amount: 100000 });
                break;
              case "200K Credits":
                await AddCharsByShopName({ shop, amount: 200000 });
                break;
              case "300K Credits":
                await AddCharsByShopName({ shop, amount: 300000 });
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
      try {
        await RequestData({ shop });
        break;
      } catch (error) {
        console.error("Error CUSTOMERS_DATA_REQUEST:", error);
        throw new Error("Error CUSTOMERS_DATA_REQUEST");
      }
    case "CUSTOMERS_REDACT":
      try {
        await DeleteData({ shop });
        break;
      } catch (error) {
        console.error("Error CUSTOMERS_REDACT:", error);
        throw new Error("Error CUSTOMERS_REDACT");
      }
    case "SHOP_REDACT":
      try {
        await CleanData({ shop });
        break;
      } catch (error) {
        console.error("Error SHOP_REDACT:", error);
        throw new Error("Error SHOP_REDACT");
      }
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
