import { SubmitFunction } from "@remix-run/react";
import { CurrencyCode } from "@shopify/hydrogen-react/storefront-api-types";
import { Button, Card, Space, Typography } from "antd";

const { Title, Text, Paragraph } = Typography;

interface PlanCardProps {
  planName: string; // 计划名称
  price: string; // 价格
  description: {
    text: string;
  }; // 内容描述
  statu: boolean;
  submit: SubmitFunction;
}

const PlanCard: React.FC<PlanCardProps> = ({
  planName,
  price,
  description,
  statu,
  submit,
}) => {
  const onClick = () => {
    const data = {
      name: "Premium Plan",
      returnUrl: "https://typescriptfrontend.onrender.com/",
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: 19.99,
                currencyCode: "USD",
              },
            },
          },
        },
      ],
    };
    const formData = new FormData();
    formData.append("plandata", JSON.stringify(data)); // 将选中的语言作为字符串发送

    submit(formData, {
      method: "post",
      action: "/app/price",
    }); // 提交表单请求
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <Title level={4}>{planName}</Title>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <Paragraph strong style={{ fontSize: "34px", marginBottom: "0" }}>
              ${price}
            </Paragraph>
            <Text strong>/month</Text>
          </div>
          {statu ? (
            <Button disabled style={{ width: "100%" }}>
              Current plan
            </Button>
          ) : (
            <Button type="primary" style={{ width: "100%" }} onClick={onClick}>
              Try 3-days free
            </Button>
          )}
          <Paragraph>{description.text}</Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default PlanCard;
