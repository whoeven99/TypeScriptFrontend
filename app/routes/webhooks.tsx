import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  AddCharsByShopName,
  AddSubscriptionQuotaRecord,
  CleanData,
  DeleteData,
  InsertOrUpdateOrder,
  InsertTargets,
  RequestData,
  SendPurchaseSuccessEmail,
  SendSubscribeSuccessEmail,
  Uninstall,
  UpdateStatus,
  UpdateUserPlan,
} from "~/api/JavaServer";

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
        await Uninstall({ shop });
        await UpdateUserPlan({ shop, plan: 2 });
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
        if (payload) {
          let credits = 0;
          let price = 0;
          switch (payload?.app_purchase_one_time.name) {
            case "500K Credits":
              credits = 500000;
              price = 1.99;
              break;
            case "1M Credits":
              credits = 1000000;
              price = 3.99;
              break;
            case "2M Credits":
              credits = 2000000;
              price = 7.99;
              break;
            case "3M Credits":
              credits = 3000000;
              price = 11.99;
              break;
            case "5M Credits":
              credits = 5000000;
              price = 19.99;
              break;
            case "10M Credits":
              credits = 10000000;
              price = 39.99;
              break;
            case "20M Credits":
              credits = 20000000;
              price = 79.99;
              break;
            case "30M Credits":
              credits = 30000000;
              price = 119.99;
              break;
          }
          new Response(null, { status: 200 });
          InsertOrUpdateOrder({
            id: payload?.app_purchase_one_time.admin_graphql_api_id,
            status: payload?.app_purchase_one_time.status,
          });
          if (payload?.app_purchase_one_time.status === "ACTIVE") {
            const addChars = await AddCharsByShopName({ shop, amount: credits });
            console.log("addChars: ", addChars);
            if (addChars?.success) {
              UpdateStatus({ shop });
              SendPurchaseSuccessEmail({
                shop,
                credit: credits,
                price: price,
              });
            } else {
              console.warn("addChars error! ! ! ")
            }
          }
        }
        break;
      } catch (error) {
        console.error("Error processing purchase:", error);
        return new Response(null, { status: 200 });
      }
    // case "LOCALES_CREATE":
    //   try {
    //     if (payload) {
    //       new Response(null, { status: 200 });
    //       console.log("payload: ", payload);

    //       // await InsertTargets({ shop, accessToken: accessToken as string, source: "webhook", targets: ["customers"] });
    //     }
    //     break;
    //   } catch (error) {
    //     console.error("Error LOCALES_CREATE:", error);
    //     return new Response(null, { status: 200 });
    //   }
    case "APP_SUBSCRIPTIONS_UPDATE":
      try {
        new Response(null, { status: 200 });
        let credits = 0;
        let price = 0;
        let plan = 0;
        switch (payload?.app_subscription.name) {
          case "Starter":
            credits = 0;
            price = 1.99;
            plan = 3;
            break;
          case "Basic":
            credits = 1500000;
            price = 7.99;
            plan = 4;
            break;
          case "Pro":
            credits = 3000000;
            price = 19.99;
            plan = 5;
            break;
          case "Premium":
            credits = 8000000;
            price = 39.99;
            plan = 6;
            break;
        }
        InsertOrUpdateOrder({
          id: payload?.app_subscription.admin_graphql_api_id,
          status: payload?.app_subscription.status,
        });
        if (payload?.app_subscription.status === "ACTIVE") {
          const addChars = await AddCharsByShopName({ shop, amount: credits });
          if (addChars?.success) {
            AddSubscriptionQuotaRecord({ subscriptionId: payload?.app_subscription.admin_graphql_api_id });
            UpdateUserPlan({ shop, plan });
            UpdateStatus({ shop });
            SendSubscribeSuccessEmail({
              id: payload?.app_subscription.admin_graphql_api_id,
              shopName: shop,
            });
          }
        }
      } catch (error) {
        console.error("Error APP_SUBSCRIPTIONS_UPDATE:", error);
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
