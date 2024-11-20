import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import UserProfileCard from "./components/userProfileCard";
import { Col, Row, Space, Typography } from "antd";
import { useLoaderData } from "@remix-run/react";
import "./styles.css";
import UserLanguageCard from "./components/userLanguageCard";
import {
  GetLanguageList,
  GetLanguageData,
  GetUserSubscriptionPlan,
  GetUserWords,
} from "~/api/serve";
import { queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { useDispatch } from "react-redux";
import { setTableData } from "~/store/modules/languageTableData";
import { useEffect } from "react";
import { authenticate } from "~/shopify.server";

const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
      shop,
      accessToken,
    });
    const words = await GetUserWords({ shop });
    const plan = await GetUserSubscriptionPlan({ shop, accessToken });
    const languages = await GetLanguageList({ shop, accessToken });
    const shopPrimaryLanguage = shopLanguages.filter(
      (language) => language.primary,
    );
    const shopLanguagesWithoutPrimary = shopLanguages.filter(
      (language) => !language.primary,
    );
    const shopLocales = shopLanguagesWithoutPrimary.map((item) => item.locale);
    const pictures = await GetLanguageData({ locale: shopLocales });
    const languageData = shopLanguagesWithoutPrimary.map((lang, i) => ({
      key: i,
      src: pictures[shopLocales[i]].countries || "error",
      name: lang.name,
      locale: lang.locale,
      status:
        languages.find((language: any) => language.target === lang.locale)
          ?.status || 0,
      published: lang.published,
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
  } catch (error) {
    console.error("Error load index:", error);
    throw new Response("Error load index", { status: 500 });
  }
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

  useEffect(() => {
    dispatch(setTableData(data)); // 只在组件首次渲染时触发
  }, [dispatch, data]);

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <div style={{ paddingLeft: "8px" }}>
            <Title level={3}>Faster, higher-quality localization translation tool.</Title>
          </div>
          <UserProfileCard
            plan={user.plan}
            chars={user.chars}
            totalChars={user.totalChars}
          />
          <div style={{ paddingLeft: "8px" }}>
            <Title level={3}>{languageData.length} alternative languages</Title>
            <div>
              <Text>Your store’s default language: </Text>
              <Text strong>
                {user.primaryLanguage
                  ? user.primaryLanguage
                  : "No primary language set"}
              </Text>
            </div>
          </div>
          <Row gutter={[16, 16]}>
            {languageData.map((language: any, index: number) => (
              <Col span={8} key={index}>
                <UserLanguageCard
                  flagUrl={language.src[0]}
                  primaryLanguage={user.primaryLanguage}
                  languageName={language.name}
                  languageCode={language.locale}
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
