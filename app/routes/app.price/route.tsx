import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { Col, Row, Space } from "antd";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import PlanCard from "./components/planCard";
import Mock from "mockjs";
import "./styles.css";
import { mutationAppSubscriptionCreate } from "~/api/admin";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const plan = Mock.mock({
    data: [
      {
        name: "Free",
        price: 0,
        discription: { text: "Basic features" },
        statu: true,
      },
      {
        name: "Premium",
        price: 19.99,
        discription: { text: "All features included" },
        statu: false,
      },
    ],
  }).data;

  return json({
    plan,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const plandata = JSON.parse(formData.get("plandata") as string);
  if (plandata) {
    const data = await mutationAppSubscriptionCreate({
      request,
      name: plandata.name,
      lineItems: plandata.lineItems,
      returnUrl: plandata.returnUrl,
    });
    console.log(plandata.lineItems);
    return json({ data });
  }

  return null;
};

const Index = () => {
  const { plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const submit = useSubmit();

  useEffect(() => {
    if (actionData) {
      console.log(actionData.data);

      //   if (actionData.data.application_charge) {
      //     const confirmationUrl = actionData.data.application_charge.confirmation_url;
      //     // 重定向用户到确认支付页面
      //     window.location.href = confirmationUrl;
      //   }
    }
  }, [actionData]);

  return (
    <Page>
      <TitleBar title="Pricing" />
      <BlockStack gap="500">
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <Row className="centered-row" gutter={12}>
            <Col span={8}>
              <PlanCard
                planName={plan[0].name}
                price={plan[0].price}
                description={plan[0].discription}
                statu={plan[0].statu}
                submit={submit}
              />
            </Col>
            <Col span={8}>
              <PlanCard
                planName={plan[1].name}
                price={plan[1].price}
                description={plan[1].discription}
                statu={plan[1].statu}
                submit={submit}
              />
            </Col>
          </Row>
        </Space>
      </BlockStack>
    </Page>
  );
};

export default Index;
