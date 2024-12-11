import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    switch (true) {
      case !!loading:
        break;
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action manage_translation:", error);
    throw new Response("Error action manage_translation", { status: 500 });
  }
};

const Index = () => {
  const [loading, setLoading] = useState<boolean>();

  return (
    <Page>
      <TitleBar title="Manage Translation" />
      {loading ? <div>loading...</div> : <></>}
    </Page>
  );
};

export default Index;
