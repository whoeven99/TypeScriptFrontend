import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Col, Row, Skeleton, Space, Typography } from "antd";
import { useFetcher } from "@remix-run/react";
import "./styles.css";
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
  localeName: string;
  status: number;
  published: boolean;
}

interface UserType {
  name: string;
  plan: string;
  chars: number;
  totalChars: number;
  primaryLanguage: string;
  primaryLanguageCode: string;
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
  const [languageData, setLanguageData] = useState<LanguageDataType[]>([]);

  const [user, setUser] = useState<UserType>();
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useDispatch();
  const fetcher = useFetcher<FetchType>();

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

  // useEffect(() => {
  //   if (statusFetcher.data) {
  //     console.log(statusFetcher.data);
  //     const items = statusFetcher.data.data.map((item: any) => {
  //       if (item.status === 2) {
  //         return item;
  //       } else {
  //         dispatch(setStatuState({ target: item.target, status: item.status }));
  //       }
  //     });
  //     if (items[0] !== undefined) {
  //       // 加入10秒的延时
  //       const delayTimeout = setTimeout(() => {
  //         const formData = new FormData();
  //         formData.append(
  //           "statusData",
  //           JSON.stringify({
  //             source: primaryLanguage?.locale,
  //             target: [items[0].target],
  //           }),
  //         );

  //         statusFetcher.submit(formData, {
  //           method: "post",
  //           action: "/app",
  //         });
  //       }, 10000); // 10秒延时（10000毫秒）

  //       // 清除超时定时器，以防组件卸载后仍然尝试执行
  //       return () => clearTimeout(delayTimeout);
  //     }
  //   }
  // }, [statusFetcher.data]);

  useEffect(() => {
    const data = languageData.map((lang) => ({
      key: lang.key,
      language: lang.name,
      localeName: lang.localeName,
      locale: lang.locale,
      primary: false,
      status: lang.status || 0,
      auto_update_translation: false,
      published: lang.published,
      loading: false,
    }));
    dispatch(setTableData(data)); // 只在组件首次渲染时触发
  }, [dispatch, languageData]);

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
                  name={user.name}
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
                        flagUrl={language.src.slice(0, 4)}
                        primaryLanguage={user.primaryLanguage}
                        primaryLanguageCode={user.primaryLanguageCode}
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
