import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  listIpRedirections,
  syncIpRedirectionsWithMarkets,
  updateIpRedirection,
  type IpRedirectionRegionInput,
  type IpRedirectionUpdateInput,
} from "~/server/translateV4/ipRedirection.server";

function ok<T>(data: T) {
  return json({ ok: true, data, error: null });
}

function fail(error: string, status = 400) {
  return json({ ok: false, data: null, error }, { status });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    return ok(await listIpRedirections(session.shop));
  } catch (err) {
    console.error("[ip-redirections] list failed:", err);
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    regions?: IpRedirectionRegionInput[];
    id?: number;
    data?: IpRedirectionUpdateInput;
  };

  try {
    if (body.action === "sync") {
      const regions = Array.isArray(body.regions) ? body.regions : [];
      return ok(await syncIpRedirectionsWithMarkets(session.shop, regions));
    }

    if (body.action === "update") {
      return ok(
        await updateIpRedirection(
          session.shop,
          Number(body.id),
          body.data ?? {},
        ),
      );
    }

    return fail("Unsupported action");
  } catch (err) {
    console.error("[ip-redirections] action failed:", err);
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
};
