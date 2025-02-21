import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import { Suspense, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
    Button,
    Card,
    Checkbox,
    Flex,
    message,
    Popover,
    Radio,
    RadioChangeEvent,
    Skeleton,
    Space,
    Switch,
    Table,
    Typography,
} from "antd";
import { useTranslation } from "react-i18next";
import {
    ArrowLeftIcon
} from '@shopify/polaris-icons';
import { useFetcher, useNavigate } from "@remix-run/react";
import { useDispatch } from "react-redux";
import { ShopLocalesType } from "../app.language/route";
import { setTableData } from "~/store/modules/languageTableData";

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

interface LanguageSettingType {
    primaryLanguage: string;
    primaryLanguageCode: string;
    shopLanguagesWithoutPrimary: ShopLocalesType[];
    shopLanguageCodesWithoutPrimary: string[];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
    await authenticate.admin(request);
    return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
    return null;
};

const Index = () => {
    const [languageData, setLanguageData] = useState<LanguageDataType[]>([]);
    const [languageSetting, setLanguageSetting] = useState<LanguageSettingType>();
    const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>();
    const [loadingLanguage, setLoadingLanguage] = useState<boolean>(true);
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const loadingLanguageFetcher = useFetcher<any>();
    const languageLocalInfoFetcher = useFetcher<any>();
    const navigate = useNavigate();

    useEffect(() => {
        const languageFormData = new FormData();
        languageFormData.append("languageData", JSON.stringify(true));
        loadingLanguageFetcher.submit(languageFormData, {
            method: "post",
            action: "/app",
        });
        // const userFormData = new FormData();
        // userFormData.append("userData", JSON.stringify(true));
        // loadingUserFetcher.submit(userFormData, {
        //   method: "post",
        //   action: "/app",
        // });
        shopify.loading(true);
        const installTime = localStorage.getItem('installTime')
        if (!installTime) {
            localStorage.setItem('installTime', new Date().toISOString());
        }
    }, []);

    useEffect(() => {
        if (loadingLanguageFetcher.data) {
            setLanguageData(loadingLanguageFetcher.data.data);
            setLanguageSetting(loadingLanguageFetcher.data.languageSetting);
            setLoadingLanguage(false);
            shopify.loading(false);
        }
    }, [loadingLanguageFetcher.data]);


    // useEffect(() => {
    //   if (loadingUserFetcher.data) {
    //     setUser(loadingUserFetcher.data.data);
    //     if (!loadingUserFetcher.data.data?.plan) {
    //       // setNewUserModal(true);
    //     }
    //   }
    // }, [loadingUserFetcher.data]);

    // useEffect(() => {
    //   if (user && user.chars >= user.totalChars) {
    //     setLimited(true);
    //   }
    // }, [user]);

    // useEffect(() => {
    //   if (initializationFetcher.data && user) {
    //     if (initializationFetcher.data?.data) {
    //       setNewUserModal(false);
    //       setNewUserModalLoading(false);
    //       setUser({ ...user, totalChars: 50000 });
    //     }
    //   }
    // }, [initializationFetcher.data]);

    useEffect(() => {
        if (languageData.length) {
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
        }
    }, [dispatch, languageData]);


    const handleTranslate = () => {
        console.log("translate");
    };

    const onChange = (e: RadioChangeEvent) => {
        setSelectedLanguageCode(e.target.value);
    };

    return (
        <Page>
            <TitleBar title={t("Translate Store")} />
            <div>
                <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Button
                                type="text"
                                variant="breadcrumb"
                                onClick={() => navigate(-1)}
                                style={{ padding: "4px" }}
                            >
                                <Icon
                                    source={ArrowLeftIcon}
                                    tone="base"
                                />
                            </Button>
                            <Title style={{ fontSize: "1.25rem", margin: "0" }}>
                                {t("Translate Store")}
                            </Title>
                        </div>
                        <Button type="primary" onClick={() => handleTranslate()}>t("Translate")</Button>
                    </div>
                    <div style={{ paddingLeft: "8px" }}>
                        <Text>{t("Your store's default language:")}</Text>
                        {languageSetting && (
                            <Text strong>
                                {languageSetting.primaryLanguage ? (
                                    languageSetting.primaryLanguage
                                ) : (
                                    <Skeleton active paragraph={{ rows: 0 }} />
                                )}
                            </Text>
                        )}
                    </div>
                    <Card>
                        <Radio.Group
                            value={selectedLanguageCode}
                            onChange={onChange}
                            style={{ width: '100%' }}
                        >
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                                gap: '16px',
                                width: '100%'
                            }}>
                                {languageData.map((lang) => (
                                    <Radio key={lang.locale} value={lang.locale}>
                                        {lang.name}
                                    </Radio>
                                ))}
                            </div>
                        </Radio.Group>
                    </Card>
                </Space>
            </div>
        </Page>
    );
};

export default Index;
