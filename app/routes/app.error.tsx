import { Button, Card, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams, useSubmit } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import {
  LoaderFunctionArgs,
} from "@remix-run/node";

const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const Index = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorCode = searchParams.get("code") || "400";
  // 错误信息映射
  const errorMessages: { [key: string]: { title: string; message: string } } = {
    "400": {
      title: t("Bad Request"),
      message: t(
        "The request could not be understood by the server due to malformed syntax.",
      ),
    },
    "401": {
      title: t("Unauthorized"),
      message: t(
        "Authentication is required and has failed or has not been provided.",
      ),
    },
    "403": {
      title: t("Forbidden"),
      message: t("You don't have permission to access this resource."),
    },
    "404": {
      title: t("Not Found"),
      message: t("The requested resource could not be found."),
    },
    "500": {
      title: t("Internal Server Error"),
      message: t(
        "The server encountered an unexpected condition that prevented it from fulfilling the request.",
      ),
    },
    "502": {
      title: t("Bad Gateway"),
      message: t(
        "The server received an invalid response from the upstream server.",
      ),
    },
    "503": {
      title: t("Service Unavailable"),
      message: t("The server is currently unavailable."),
    },
    "504": {
      title: t("Gateway Timeout"),
      message: t(
        "The server did not receive a timely response from the upstream server.",
      ),
    },
  };

  const currentError = errorMessages[errorCode] || errorMessages["400"];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f5f5f5",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 500,
          textAlign: "center",
          padding: "24px",
        }}
      >
        <Title level={1} style={{ fontSize: 72, margin: "24px 0" }}>
          {errorCode}
        </Title>
        <Title level={2} style={{ margin: "24px 0" }}>
          {currentError.title}
        </Title>
        <Text
          type="secondary"
          style={{
            display: "block",
            marginBottom: "24px",
            fontSize: 16,
          }}
        >
          {currentError.message}
        </Text>
        <Button type="primary" onClick={() => navigate("/app")} size="large">
          {t("Back to Home")}
        </Button>
      </Card>
    </div>
  );
};

export default Index;
