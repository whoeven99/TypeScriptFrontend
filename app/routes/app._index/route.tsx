import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import UserProfileCard from "./components/userProfileCard";
import { Col, Row, Space } from "antd";
import { useLoaderData } from "@remix-run/react";
import Mock from "mockjs";
import "./styles.css";
import UserDataCard from "./components/userDataCard";
import UserLanguageCard from "./components/userLanguageCard";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = Mock.mock({
    data: {
      plan: 0,
      visitorData: 1000,
      gmvData: 200,
      languages: [
        {
          src: "/cn.png",
          name: "Chinese",
          code: "cn",
          words: 25151,
        },
        {
          src: "/en.png",
          name: "Japanese",
          code: "ja",
          words: 61211,
        },
        {
          src: "/fr.png",
          name: "French",
          code: "fr",
          words: 42451,
        },
      ],
    },
  }).data;

  return json({
    user,
  });
};

// export const action = async ({ request }: ActionFunctionArgs) => {

//   return json({

//   });
// };

const Index = () => {
  const { user } = useLoaderData<typeof loader>();
  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <UserProfileCard plan={user.plan} />
          <UserDataCard visitorData={user.visitorData} gmvData={user.gmvData} />
          <Row gutter={12}>
            {user.languages.map((language: any, index: any) => (
              <Col span={8} key={index}>
                <UserLanguageCard
                  flagUrl={language.src}
                  languageName={language.name}
                  wordsNeeded={language.words}
                  languageCode={language.code}
                />
              </Col>
            ))}
          </Row>
        </Space>
      </BlockStack>
    </Page>
  );
};

export default Index;
