import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import UserProfileCard from "./components/userProfileCard";
import { Col, Space, Typography } from "antd";
import { useLoaderData } from "@remix-run/react";
import Mock from "mockjs";
import "./styles.css";
import UserLanguageCard from "./components/userLanguageCard";
import {
  GetConsumedWords,
  GetLanguageList,
  GetPicture,
  GetUserPlan,
} from "~/api/serve";
import { queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";

const { Title } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
    request,
  });

  const consumedWords: number = await GetConsumedWords({ request });
  const plan = await GetUserPlan({ request });
  const status = await GetLanguageList({ request });

  const shopLanguagesWithoutPrimary = shopLanguages.filter(
    (language) => !language.primary,
  );

  const shopLocales = shopLanguagesWithoutPrimary.map((item) =>
    item.locale.toUpperCase(),
  );
  const picture = await GetPicture(shopLocales);

  const languageData = shopLanguagesWithoutPrimary.map((lang, i) => ({
    key: i,
    src: picture[Object.keys(picture)[i]],
    name: lang.name,
    locale: lang.locale,
    status:
      status.find((statu: any) => statu.target === lang.locale)?.status || 0,
    published: lang.published,
    words: Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000,
  }));

  const user = Mock.mock({
    data: {
      plan: 0,
      visitorData: 1000,
      gmvData: 200,
      totalWords: plan.chars,
    },
  }).data;

  return json({
    consumedWords,
    languageData,
    user,
  });
};

// export const action = async ({ request }: ActionFunctionArgs) => {

//   return json({

//   });
// };

const Index = () => {
  const { consumedWords, languageData, user } = useLoaderData<typeof loader>();
  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <UserProfileCard
            plan={user.plan}
            consumedWords={consumedWords}
            totalWords={user.totalWords}
          />
          {/* <UserDataCard visitorData={user.visitorData} gmvData={user.gmvData} /> */}
          <Title level={3}>{languageData.length} Languages in your shop</Title>
          <div className="language_cards">
            {languageData.map((language: any, index: any) => (
              <Col span={8} key={index}>
                <UserLanguageCard
                  flagUrl={language.src[0]}
                  languageName={language.name}
                  wordsNeeded={language.words}
                  languageCode={language.locale}
                />
              </Col>
            ))}
          </div>
        </Space>
      </BlockStack>
    </Page>
  );
};

export default Index;
