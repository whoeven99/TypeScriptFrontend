import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  AddCharsByShopName,
  AddCharsByShopNameAfterSubscribe,
  AddSubscriptionQuotaRecord,
  CleanData,
  DeleteData,
  GetUserSubscriptionPlan,
  InsertOrUpdateOrder,
  IsInFreePlanTime,
  RequestData,
  SendPurchaseSuccessEmail,
  SendSubscribeSuccessEmail,
  Uninstall,
  UpdateStatus,
  UpdateUserPlan,
  WebhookDefaultLanguage,
  WebhookDefaultTheme,
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

  console.log(`${shop} ${topic} webhooks: ${payload}`);

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
          new Response(null, { status: 200 });
          let credits = 0;
          let price = 0;
          const plan = await GetUserSubscriptionPlan({
            shop,
            server: process.env.SERVER_URL as string,
          });
          const isInFreePlan = await IsInFreePlanTime({
            shop,
            server: process.env.SERVER_URL as string,
          });
          switch (payload?.app_purchase_one_time.name) {
            case "500K Credits":
              credits = 500000;
              price = isInFreePlan?.response
                ? 3.99
                : plan?.response?.planType === "Premium"
                  ? 1.99
                  : plan?.response?.planType === "Pro"
                    ? 2.99
                    : plan?.response?.planType === "Basic"
                      ? 3.59
                      : 3.99;
              break;
            case "1M Credits":
              credits = 1000000;
              price = isInFreePlan?.response
                ? 7.99
                : plan?.response?.planType === "Premium"
                  ? 3.99
                  : plan?.response?.planType === "Pro"
                    ? 5.99
                    : plan?.response?.planType === "Basic"
                      ? 7.19
                      : 7.99;
              break;
            case "2M Credits":
              credits = 2000000;
              price = isInFreePlan?.response
                ? 15.99
                : plan?.response?.planType === "Premium"
                  ? 7.99
                  : plan?.response?.planType === "Pro"
                    ? 11.99
                    : plan?.response?.planType === "Basic"
                      ? 14.39
                      : 15.99;
              break;
            case "3M Credits":
              credits = 3000000;
              price = isInFreePlan?.response
                ? 23.99
                : plan?.response?.planType === "Premium"
                  ? 11.99
                  : plan?.response?.planType === "Pro"
                    ? 19.99
                    : plan?.response?.planType === "Basic"
                      ? 21.99
                      : 23.99;
              break;
            case "5M Credits":
              credits = 5000000;
              price = isInFreePlan?.response
                ? 39.99
                : plan?.response?.planType === "Premium"
                  ? 19.99
                  : plan?.response?.planType === "Pro"
                    ? 29.99
                    : plan?.response?.planType === "Basic"
                      ? 35.99
                      : 39.99;
              break;
            case "10M Credits":
              credits = 10000000;
              price = isInFreePlan?.response
                ? 79.99
                : plan?.response?.planType === "Premium"
                  ? 39.99
                  : plan?.response?.planType === "Pro"
                    ? 59.99
                    : plan?.response?.planType === "Basic"
                      ? 71.99
                      : 79.99;
              break;
            case "20M Credits":
              credits = 20000000;
              price = isInFreePlan?.response
                ? 159.99
                : plan?.response?.planType === "Premium"
                  ? 79.99
                  : plan?.response?.planType === "Pro"
                    ? 119.99
                    : plan?.response?.planType === "Basic"
                      ? 143.99
                      : 159.99;
              break;
            case "30M Credits":
              credits = 30000000;
              price = isInFreePlan?.response
                ? 239.99
                : plan?.response?.planType === "Premium"
                  ? 119.99
                  : plan?.response?.planType === "Pro"
                    ? 179.99
                    : plan?.response?.planType === "Basic"
                      ? 219.99
                      : 239.99;
              break;
          }
          InsertOrUpdateOrder({
            shop,
            id: payload?.app_purchase_one_time.admin_graphql_api_id,
            status: payload?.app_purchase_one_time.status,
          });
          if (payload?.app_purchase_one_time.status === "ACTIVE") {
            const addChars = await AddCharsByShopName({
              shop,
              amount: credits,
              gid: payload?.app_purchase_one_time.admin_graphql_api_id,
            });
            console.log("addChars: ", addChars);
            if (addChars?.success) {
              UpdateStatus({ shop });
              SendPurchaseSuccessEmail({
                shop,
                credit: credits,
                price: price,
              });
            } else {
              console.error("addChars error! ! ! ");
            }
          }
        }
        break;
      } catch (error) {
        console.error("Error processing purchase:", error);
        return new Response(null, { status: 200 });
      }
    case "APP_SUBSCRIPTIONS_UPDATE":
      try {
        new Response(null, { status: 200 });
        let plan = 0;
        switch (payload?.app_subscription.name) {
          case "Basic":
            plan = 4;
            break;
          case "Pro":
            plan = 5;
            break;
          case "Premium":
            plan = 6;
            break;
        }
        InsertOrUpdateOrder({
          shop,
          id: payload?.app_subscription.admin_graphql_api_id,
          status: payload?.app_subscription.status,
        });
        if (payload?.app_subscription.status === "ACTIVE") {
          const addChars = await AddCharsByShopNameAfterSubscribe({
            shop,
            appSubscription: payload?.app_subscription.admin_graphql_api_id,
          });
          if (addChars?.success) {
            AddSubscriptionQuotaRecord({
              subscriptionId: payload?.app_subscription.admin_graphql_api_id,
            });
            UpdateUserPlan({ shop, plan });
            UpdateStatus({ shop });
            SendSubscribeSuccessEmail({
              id: payload?.app_subscription.admin_graphql_api_id,
              shopName: shop,
              feeType:
                payload?.app_subscription?.interval == "every_30_days" ? 1 : 2,
            });
          }
        }
        if (payload?.app_subscription.status === "CANCELLED") {
          UpdateUserPlan({ shop, plan: 2 });
        }
      } catch (error) {
        console.error("Error APP_SUBSCRIPTIONS_UPDATE:", error);
        return new Response(null, { status: 200 });
      }
    case "THEMES_PUBLISH":
      try {
        const JSONData = JSON.stringify(payload);
        await WebhookDefaultTheme({
          shop,
          JSONData,
        });
        break;
      } catch (error) {
        console.error("Error THEMES_PUBLISH:", error);
        return new Response(null, { status: 200 });
      }
    case "SHOP_UPDATE":
      try {
        const JSONData = JSON.stringify(payload);
        await WebhookDefaultLanguage({
          shop,
          JSONData,
        });
        break;
      } catch (error) {
        console.error("Error SHOP_UPDATE:", error);
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
        await Uninstall({ shop });
        await UpdateUserPlan({ shop, plan: 2 });
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
