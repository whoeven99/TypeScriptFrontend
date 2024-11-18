import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { UpdateUser } from "~/api/serve";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  console.log(1);
  await UpdateUser({ request });
  return null;
};
