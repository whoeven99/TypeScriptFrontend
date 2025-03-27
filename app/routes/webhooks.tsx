import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  AddCharsByShopName,
  CleanData,
  DeleteData,
  InsertOrUpdateOrder,
  RequestData,
  SendPurchaseSuccessEmail,
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
        if (session) {
          await db.session.deleteMany({ where: { shop } });
          await Uninstall({ shop });
        }
        break;
      } catch (error) {
        console.error("Error APP_UNINSTALLED:", error);
        return new Response(null, { status: 200 });
      }
    case "APP_PURCHASES_ONE_TIME_UPDATE":
      try {
        if (payload) {
          let credits = 0;
          let price = 0;
          switch (payload?.app_purchase_one_time.name) {
            case "100K Credits":
              credits = 100000;
              price = 1.99;
              break;
            case "200K Credits":
              credits = 200000;
              price = 3.99;
              break;
            case "500K Credits":
              credits = 500000;
              price = 9.99;
              break;
            case "1M Credits":
              credits = 1000000;
              price = 19.99;
              break;
            case "2M Credits":
              credits = 2000000;
              price = 39.99;
              break;
            case "3M Credits":
              credits = 3000000;
              price = 59.99;
              break;
            case "5M Credits":
              credits = 5000000;
              price = 99.99;
              break;
            case "10M Credits":
              credits = 10000000;
              price = 199.99;
              break;
          }
          new Response(null, { status: 200 });
          await Promise.all([
            InsertOrUpdateOrder({
              id: payload?.app_purchase_one_time.admin_graphql_api_id,
              status: payload?.app_purchase_one_time.status,
            }),

            payload?.app_purchase_one_time.status === "ACTIVE"
              ? Promise.all([
                AddCharsByShopName({ shop, amount: credits }),
                SendPurchaseSuccessEmail({
                  shop,
                  credit: credits,
                  price: price,
                }),
              ])
              : Promise.resolve(),
          ]);
        }
        break;
      } catch (error) {
        console.error("Error processing purchase:", error);
        return new Response(null, { status: 200 });
      }
    case "CUSTOMERS_DATA_REQUEST":
      try {
        new Response(null, { status: 200 });
        await RequestData({ shop });
        break;
      } catch (error) {
        console.error("Error CUSTOMERS_DATA_REQUEST:", error);
        return new Response(null, { status: 200 });
      }
    case "CUSTOMERS_REDACT":
      try {
        new Response(null, { status: 200 });
        await DeleteData({ shop });
        break;
      } catch (error) {
        console.error("Error CUSTOMERS_REDACT:", error);
        return new Response(null, { status: 200 });
      }
    case "SHOP_REDACT":
      try {
        new Response(null, { status: 200 });
        await CleanData({ shop });
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
