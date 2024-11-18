import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import UserProfileCard from "./components/userProfileCard";
import { Col, Space, Typography } from "antd";
import { useLoaderData } from "@remix-run/react";
import "./styles.css";
import UserLanguageCard from "./components/userLanguageCard";
import {
  GetLanguageList,
  GetPicture,
  GetTotalWords,
  GetUserSubscriptionPlan,
  GetUserWords,
} from "~/api/serve";
import { queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { useDispatch } from "react-redux";
import { setTableData } from "~/store/modules/languageTableData";

const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
    request,
  });

  const words = await GetUserWords({ request });
  const plan = await GetUserSubscriptionPlan({ request });
  const languages = await GetLanguageList({ request });
  const shopPrimaryLanguage = shopLanguages.filter(
    (language) => language.primary,
  );

  const shopLanguagesWithoutPrimary = shopLanguages.filter(
    (language) => !language.primary,
  );

  const shopLocales = shopLanguagesWithoutPrimary.map((item) => item.locale);

  const pictures = await GetPicture(shopLocales);
  const totalWords = await GetTotalWords({ request, targets: shopLocales });

  const languageData = shopLanguagesWithoutPrimary.map((lang, i) => ({
    key: i,
    src: pictures[shopLocales[i]],
    name: lang.name,
    locale: lang.locale,
    status:
      languages.find((language: any) => language.target === lang.locale)
        ?.status || 0,
    published: lang.published,
    totalWords: totalWords[i],
  }));

  const user = {
    plan: plan,
    chars: words?.chars,
    totalChars: words?.totalChars,
    primaryLanguage: shopPrimaryLanguage[0].name,
    shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimary,
    shopLanguageCodesWithoutPrimary: shopLocales,
  };

  return json({
    languageData,
    user,
  });
};

const Index = () => {
  const { languageData, user } = useLoaderData<typeof loader>();
  const dispatch = useDispatch();
  const data = languageData.map((lang) => ({
    key: lang.key,
    language: lang.name,
    locale: lang.locale,
    primary: false,
    status: lang.status || 0,
    auto_update_translation: false,
    published: lang.published,
    loading: false,
  }));
  dispatch(setTableData(data));

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <UserProfileCard
            plan={user.plan}
            chars={user.chars}
            totalChars={user.totalChars}
          />
          <div>
            <Title level={3}>{languageData.length} alternative languages</Title>
            <div>
              <Text type="secondary">Your store’s default language: </Text>
              <Text>
                {user.primaryLanguage
                  ? user.primaryLanguage
                  : "No primary language set"}
              </Text>
            </div>
          </div>

          <div className="language_cards">
            {languageData.map((language: any, index: any) => (
              <Col span={8} key={index}>
                <UserLanguageCard
                  flagUrl={language.src[0]}
                  primaryLanguage={user.primaryLanguage}
                  languageName={language.name}
                  wordsNeeded={language.totalWords}
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
