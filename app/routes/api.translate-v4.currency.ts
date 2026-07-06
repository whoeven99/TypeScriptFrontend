import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  deleteCurrency,
  getCurrencyCacheData,
  getCurrencyTableByShopName,
  insertCurrency,
  updateCurrency,
  updateDefaultCurrency,
} from "~/server/currency/currency.server";
import {
  buildTranslateV4Error,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  try {
    const result = await getCurrencyTableByShopName(shop);
    return json(result);
  } catch (error) {
    console.error("[currency] list failed:", error);
    const appError = buildTranslateV4Error(
      TRANSLATE_V4_ERROR_KEYS.CURRENCY_LIST_FAILED,
    );
    return json(
      {
        success: false,
        errorCode: appError.errorCode,
        errorMsg: appError.errorMsg,
        response: [],
      },
      { status: appError.status },
    );
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const actionType = String(body.action ?? "");

    switch (actionType) {
      case "insert":
        return json(
          await insertCurrency({
            shop,
            currencyName: body.currencyName,
            currencyCode: body.currencyCode,
            rounding: body.primaryStatus ? null : "",
            exchangeRate: body.primaryStatus ? null : "Auto",
            primaryStatus: Number(body.primaryStatus ?? 0),
          }),
        );
      case "update":
        return json(
          await updateCurrency({
            shop,
            id: body.id,
            rounding: body.rounding,
            exchangeRate: body.exchangeRate,
          }),
        );
      case "delete":
        return json(await deleteCurrency(shop, body.id));
      case "cache":
        return json(await getCurrencyCacheData(shop, body.currencyCode));
      case "updateDefault":
        return json(
          await updateDefaultCurrency({
            shop,
            currencyName: body.currencyName,
            currencyCode: body.currencyCode,
            rounding: null,
            exchangeRate: null,
            primaryStatus: 1,
          }),
        );
      default:
        const appError = buildTranslateV4Error(
          TRANSLATE_V4_ERROR_KEYS.UNKNOWN_ACTION,
        );
        return json(
          {
            success: false,
            errorCode: appError.errorCode,
            errorMsg: appError.errorMsg,
            response: undefined,
          },
          { status: appError.status },
        );
    }
  } catch (error) {
    console.error("[currency] action failed:", error);
    const appError = buildTranslateV4Error(
      TRANSLATE_V4_ERROR_KEYS.INTERNAL_ERROR,
    );
    return json(
      {
        success: false,
        errorCode: appError.errorCode,
        errorMsg: appError.errorMsg,
        response: undefined,
      },
      { status: appError.status },
    );
  }
};
