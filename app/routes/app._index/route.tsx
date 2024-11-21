import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Col, Row, Skeleton, Space, Typography } from "antd";
import { useFetcher, useLoaderData } from "@remix-run/react";
import "./styles.css";
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
import { lazy, Suspense, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";

const UserProfileCard = lazy(() => import("./components/userProfileCard"));
const UserLanguageCard = lazy(() => import("./components/userLanguageCard"));

const { Title, Text } = Typography;

interface LanguageDataType {
  key: number;
  src: string[];
  name: string;
  locale: string;
  status: number;
  published: boolean;
}

interface UserType {
  plan: string;
  chars: number;
  totalChars: number;
  primaryLanguage: string;
  shopLanguagesWithoutPrimary: ShopLocalesType[];
  shopLanguageCodesWithoutPrimary: string[];
}

interface FetchType {
  languageData: LanguageDataType[];
  user: UserType;
}

export interface WordsType {
  chars: number;
  totalChars: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const Index = () => {
  // const { languageData, user } = useLoaderData<typeof loader>();
  const [languageData, setLanguageData] = useState<LanguageDataType[]>([]);
  const [user, setUser] = useState<UserType>();
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useDispatch();
  const fetcher = useFetcher<FetchType>();

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
    const formData = new FormData();
    formData.append("index", JSON.stringify(true));
    fetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setLanguageData(fetcher.data.languageData);
      setUser(fetcher.data.user);
      shopify.loading(false);
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    dispatch(setTableData(data)); // 只在组件首次渲染时触发
  }, [dispatch, data]);

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        {loading ? (
          <div>loading...</div>
        ) : (
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div style={{ paddingLeft: "8px" }}>
              <Title level={3}>
                Faster, higher-quality localization translation tool.
              </Title>
            </div>
            <Suspense fallback={<Skeleton active />}>
              {user && (
                <UserProfileCard
                  plan={user.plan}
                  chars={user.chars}
                  totalChars={user.totalChars}
                />
              )}
            </Suspense>
            <div style={{ paddingLeft: "8px" }}>
              <Title level={3}>
                {languageData.length} alternative languages
              </Title>
              <div>
                <Text>Your store’s default language: </Text>
                {user && (
                  <Text strong>
                    {user.primaryLanguage
                      ? user.primaryLanguage
                      : "No primary language set"}
                  </Text>
                )}
              </div>
            </div>
            <Row gutter={[16, 16]}>
              {languageData.map((language: any, index: number) => (
                <Col span={8} key={index}>
                  <Suspense fallback={<Skeleton active />}>
                    {user && (
                      <UserLanguageCard
                        flagUrl={language.src[0]}
                        primaryLanguage={user.primaryLanguage}
                        languageName={language.name}
                        languageCode={language.locale}
                      />
                    )}
                  </Suspense>
                </Col>
              ))}
            </Row>
          </Space>
        )}
      </BlockStack>
    </Page>
  );
};

export default Index;
