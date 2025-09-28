import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const formData = await request.formData();
  const metrics = JSON.parse(formData.get("metrics") as string);
  //   const metrics = await request.json();
  const LCPdata = metrics?.metrics?.find((item: any) => item.name == "LCP");
  console.log("LCPdata: ", LCPdata);

  if (LCPdata) console.log(`${shop} received LCP:`, LCPdata?.value);
  return {
    body: "Metrics received",
  };
};
