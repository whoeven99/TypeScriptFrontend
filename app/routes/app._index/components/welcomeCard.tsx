import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { Button, Card, ConfigProvider, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
// import {LoaderFunctionArgs} from  '@remix-run/node'
// import { authenticate } from "~/shopify.server";
// import {json} from '@remix-run/node'
const { Text } = Typography;

interface WelcomeCardProps {
  switcherOpen: boolean;
  blockUrl: string;
  shop: string;
}

// export const loader = async ({ request }: any) => {
//   const { session } = await authenticate.admin(request);
//   console.log("qualityEvaluation");
//   const scopes = session.scope ? session.scope.split(",") : [];
//   const optionalScopes = process.env.OPTIONAL_SCOPES;
//   const missScopes = optionalScopes
//     ?.split(",")
//     .filter((s) => !scopes.includes(s));
//   const hasRequiresScopes = missScopes?.length === 0;
//   return {hasRequiresScopes};
// };

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   const adminAuthResult = await authenticate.admin(request);
//   const { shop } = adminAuthResult.session;

//   return json({
//     shop,
//     server: process.env.SERVER_URL,
//     apiKey: process.env.SHOPIFY_API_KEY || "",
//   });
// };

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  switcherOpen,
  blockUrl,
  shop,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  const graphqlFetcher = useFetcher<any>();
  const { report, trackExposure, fetcherState } = useReport();
  // const {server,apiKey} = useLoaderData<typeof loader>()
  const handleSetting = () => {
    if (!switcherOpen) {
      // TODO: Disable App
      window.open(blockUrl, "_blank");
      fetcher.submit(
        {
          log: `${shop} 前往开启switcher, 从主页面点击`,
        },
        {
          method: "POST",
          action: "/log",
        },
      );
    } else {
      // TODO: Setup App
      localStorage.setItem("switcherCard", "true");
      fetcher.submit(
        {
          log: `${shop} 前往配置switcher, 从主页面点击`,
        },
        {
          method: "POST",
          action: "/log",
        },
      );
      setTimeout(() => {
        navigate("/app/switcher");
      }, 500);
    }
    report(
      { status: !switcherOpen ? 0 : 1 },
      { method: "post", action: "/app", eventType: "click" },
      "dashboard_switcher_button",
    );
  };
  const handleTestGraphqlData = () => {
    const formData = new FormData();
    formData.append("quailtyEvaluation", JSON.stringify({}));
    graphqlFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  };
  return (
    <Card
      title={
        !switcherOpen
          ? t("The switcher is currently enabled.")
          : t("Enable language and currency switcher")
      }
      // extra={
      //   <Button
      //     icon={<RedoOutlined spin={loading} />}
      //     type="link"
      //     onClick={handleReload}
      //   />
      // }
    >
      <Flex justify="space-between" align="center">
        <Text>
          {!switcherOpen
            ? t(
                "Customers can switch languages and currencies when visiting the site. ",
              )
            : t(
                "The switcher is currently disabled. If you need IP-based automatic language and currency switching, please click “ Setup”. ",
              )}
        </Text>
        <Button
          onClick={() => {
            handleSetting();
          }}
        >
          {!switcherOpen ? t("Disable App") : t("Setup App")}
        </Button>
        <Button onClick={handleTestGraphqlData}>数据评估和报告页面</Button>
        {/* <span>{hasRequiresScopes}?'需要请求权限':'有改权限'</span> */}
      </Flex>
    </Card>
  );
};

export default WelcomeCard;
