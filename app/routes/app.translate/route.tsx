import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import { Suspense, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
    Button,
    Card,
    Checkbox,
    Col,
    Flex,
    message,
    Popover,
    Radio,
    RadioChangeEvent,
    Row,
    Select,
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
import { useFetcher, useLocation, useNavigate } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { LanguagesDataType, ShopLocalesType } from "../app.language/route";
import { setStatusState, setTableData } from "~/store/modules/languageTableData";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import TranslationWarnModal from "~/components/translationWarnModal";

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
    const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>("");
    const [translateSettings1, setTranslateSettings1] = useState<string>("1");
    const [translateSettings2, setTranslateSettings2] = useState<string>("1");
    const [translateSettings3, setTranslateSettings3] = useState<string[]>(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    const [translateSettings4, setTranslateSettings4] = useState<string>("1");
    const [loadingLanguage, setLoadingLanguage] = useState<boolean>(true);
    const [showWarnModal, setShowWarnModal] = useState(false);
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const loadingLanguageFetcher = useFetcher<any>();
    const languageLocalInfoFetcher = useFetcher<any>();
    const navigate = useNavigate();
    const location = useLocation();
    const fetcher = useFetcher<any>();

    const dataSource: LanguagesDataType[] = useSelector(
        (state: any) => state.languageTableData.rows,
    );

    useEffect(() => {
        console.log(translateSettings1, translateSettings2, translateSettings3, translateSettings4);
    }, [translateSettings1, translateSettings2, translateSettings3, translateSettings4]);

    useEffect(() => {
        console.log(selectedLanguageCode);
    }, [selectedLanguageCode]);

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
        if (location) {
            console.log("selectedLanguageCode: ", location?.state?.selectedLanguageCode);
            setSelectedLanguageCode(location?.state?.selectedLanguageCode || "");
        }
        shopify.loading(true);
        // const installTime = localStorage.getItem('installTime')
        // if (!installTime) {
        //     localStorage.setItem('installTime', new Date().toISOString());
        // }
    }, []);

    useEffect(() => {
        if (loadingLanguageFetcher.data) {
            setLanguageData(loadingLanguageFetcher.data.data);
            setLanguageSetting(loadingLanguageFetcher.data.languageSetting);
            setLoadingLanguage(false);
            shopify.loading(false);
        }
    }, [loadingLanguageFetcher.data]);

    useEffect(() => {
        if (fetcher.data) {
            if (fetcher.data.success) {
                message.success(t("The translation task is in progress."));
                navigate("/app/language");
            } else {
                setShowWarnModal(true);
            }
        }
    }, [fetcher.data]);
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


    const handleTranslate = async () => {
        if (!languageSetting?.primaryLanguageCode) {
            message.error(
                t(
                    "Please set the primary language first.",
                ),
            );
            return;
        }
        if (!selectedLanguageCode) {
            message.error(
                t(
                    "Please select a language to translate first.",
                ),
            );
            return;
        }
        const selectedItem = dataSource.find(
            (item: LanguagesDataType) => item.locale === selectedLanguageCode,
        );
        const selectedTranslatingItem = dataSource.find(
            (item: LanguagesDataType) => item.status === 2,
        );
        if (selectedItem && !selectedTranslatingItem) {
            const formData = new FormData();
            formData.append(
                "translation",
                JSON.stringify({
                    primaryLanguage: languageSetting?.primaryLanguageCode,
                    selectedLanguage: selectedItem,
                }),
            ); // 将选中的语言作为字符串发送
            fetcher.submit(formData, {
                method: "post",
                action: "/app/language",
            }); // 提交表单请求
            // const installTime = localStorage.getItem('installTime')
            // if (!installTime) {
            //     localStorage.setItem('installTime', new Date().toISOString());
            // } else {
            //     const createTime = new Date(installTime);
            //     const currentTime = new Date();

            //     // 计算时间差（毫秒）
            //     const timeDifference = currentTime.getTime() - createTime.getTime();

            // 转换为天数（1天 = 24 * 60 * 60 * 1000 毫秒）
            // const daysDifference = Math.floor(timeDifference / (24 * 60 * 60 * 1000));

            // 如果超过3天，显示评分弹窗
            // if (daysDifference >= 3) {
            //     // 检查localStorage是否已经显示过
            //     const hasShownRating = localStorage.getItem('hasShownRating');
            //     if (!hasShownRating) {
            //         setPreviewModalVisible(true);
            //         // 标记已经显示过
            //         localStorage.setItem('hasShownRating', 'true');
            //     }
            // }
            // }
        } else {
            message.error(
                t(
                    "The translation task is in progress. Please try translating again later.",
                ),
            );
        }
    };
    const onChange = (e: RadioChangeEvent) => {
        setSelectedLanguageCode(e.target.value);
    };

    const translateSettings1Options = [
        {
            label: "OpenAI/GPT-4",
            value: "1"
        },
        {
            label: "Google/Gemini-1.5",
            value: "2"
        },
        {
            label: "DeepL/DeepL-translator",
            value: "3"
        },
        {
            label: "Qwen/Qwen-Max",
            value: "4"
        },
        {
            label: "DeepSeek-ai/DeepSeek-V3",
            value: "5"
        },
        {
            label: "Meta/Llama-3",
            value: "6"
        },
        {
            label: "Google/Google translate",
            value: "7"
        }
    ]

    const translateSettings2Options = [
        {
            label: t("General"),
            value: "1"          
        },
        {
            label: t("Clothing"),
            value: "2"
        },
        {
            label: t("Jewelry"),
            value: "3"
        },
        {
            label: t("Electrical appliances"),
            value: "4"
        },
    ]

    const translateSettings3Options = [
        {
            label: t("Products"),
            value: "1",
            disabled: true
        },
        {
            label: t("Collections"),
            value: "2",
            disabled: true
        },
        {
            label: t("Articles"),
            value: "3",
            disabled: true
        },
        {
            label: t("Blog titles"),
            value: "4",
            disabled: true
        },
        {
            label: t("Pages"),
            value: "5",
            disabled: true
        },
        {
            label: t("Filters"),
            value: "6",
            disabled: true
        },
        {
            label: t("Metaobjects"),
            value: "7",
            disabled: true
        },
        {
            label: t("Navigation"),
            value: "8",
            disabled: true
        },
        {
            label: t("Shop"),
            value: "9",
            disabled: true
        },
        {
            label: t("Theme"),
            value: "10",
            disabled: true
        },
        {
            label: t("Delivery"),
            value: "11",
            disabled: true
        },
        {
            label: t("Shipping"),
            value: "12",
            disabled: true
        },
    ]

    const translateSettings4Options = [
        {
            label: t("translateSettings4Options.option1"),
            value: "1"
        },
        {
            label: t("translateSettings4Options.option1"),
            value: "2"
        },
        {
            label: t("translateSettings4Options.option1"),
            value: "3"
        },
    ]

    const handleNavigate = () => {
        try {
            // 尝试获取浏览历史长度
            if (location.state.from) {
                // 如果有历史记录，则返回上一页
                navigate(location.state.from);
            } else {
                // 如果没有历史记录，则导航到 /app
                navigate('/app');
            }
        } catch (error) {
            // 如果出现任何错误，默认导航到 /app
            navigate('/app');
        }
    };

    return (
        <Page>
            <TitleBar title={t("Translate Store")} />
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
                            onClick={handleNavigate}
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
                    <Button type="primary" onClick={() => handleTranslate()}>{t("Translate")}</Button>
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
                {loadingLanguage ? (
                    <Skeleton.Button active style={{ height: 600 }} block />
                ) : languageData.length != 0 ? (
                    <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                        <Card
                            style={{
                                width: '100%',
                                marginBottom: "16px"
                            }}
                        >
                            <Radio.Group
                                value={selectedLanguageCode}
                                onChange={onChange}
                                style={{ width: '100%' }}
                            >
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                                    gap: '16px',
                                    width: '100%'
                                }}>
                                    {languageData.map((lang) => (
                                        <Radio
                                            key={lang.locale}
                                            value={lang.locale}
                                            style={{
                                                width: '100%',
                                                marginRight: 0,
                                                padding: '8px 12px',
                                                border: '1px solid #f0f0f0',
                                                borderRadius: '4px',
                                                alignItems: "center"
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                width: '100%'
                                            }}>
                                                <img
                                                    src={lang.src[0]}
                                                    alt={lang.name}
                                                    style={{
                                                        width: "30px",
                                                        height: "auto",
                                                        justifyContent: 'center',
                                                        border: "1px solid #888",
                                                        borderRadius: "2px",
                                                        marginRight: "8px"
                                                    }}
                                                />
                                                <span>{lang.name}({lang.localeName})</span>
                                            </div>
                                        </Radio>
                                    ))}
                                </div>
                            </Radio.Group>
                        </Card>
                        <div style={{ paddingLeft: "8px" }}>
                            <Title level={5} style={{ fontSize: "1.25rem", margin: "0" }}>
                                {t("translateSettings.title")}
                            </Title>
                            {/* <Text style={{ margin: "0" }}>
                                {t("translateSettings.description")}
                            </Text> */}
                        </div>
                        <Card
                            style={{
                                width: '100%',
                                minHeight: "222px",
                                marginBottom: "16px"
                            }}
                        >
                            <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                                <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
                                    {t("translateSettings1.title")}
                                </Title>
                                <Row key={translateSettings1} gutter={[16, 16]}>
                                    {
                                        translateSettings1Options.map((option) => (
                                            <Col key={option.value} span={6}>
                                                <Button type={translateSettings1 === option.value ? "primary" : "default"} key={option.value} value={option.value} onClick={() => setTranslateSettings1(option.value)} style={{ width: "100%" }}
                                                >
                                                    {option.label}
                                                </Button>
                                            </Col>

                                        ))
                                    }
                                </Row>
                                <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
                                    {t("translateSettings2.title")}
                                </Title>
                                <Select
                                    defaultValue={"1"}
                                    // value={translateSettings2}
                                    options={translateSettings2Options}
                                    style={{
                                        width: '100%'
                                    }}
                                    // optionType="button"
                                    // buttonStyle="solid"
                                    // onChange={(e) => setTranslateSettings2(e.target.value)}
                                    onSelect={(value) => setTranslateSettings2(value)}
                                >
                                </Select>
                                <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
                                    {t("translateSettings3.title")}
                                </Title>
                                <Checkbox.Group
                                    defaultValue={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]}
                                    value={translateSettings3}
                                    options={translateSettings3Options}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        width: '100%'
                                    }}
                                    onChange={(e) => setTranslateSettings3(e)}
                                >
                                </Checkbox.Group>
                                {/* <Title level={5} style={{ fontSize: "1.25rem", margin: "0" }}>
                                    {t("translateSettings4.title")}
                                </Title>
                                <Radio.Group
                                    defaultValue={1}
                                    value={translateSettings4}
                                    options={translateSettings4Options}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        width: '100%'
                                    }}
                                    optionType="button"
                                    buttonStyle="solid"
                                    onChange={(e) => setTranslateSettings4(e.target.value)}
                                >
                                </Radio.Group> */}
                            </Space>
                        </Card>
                    </Space>
                ) : (
                    <NoLanguageSetCard />
                )}
            </Space>
            {showWarnModal && (
                <TranslationWarnModal show={showWarnModal} setShow={setShowWarnModal} />
            )}
        </Page>
    );
};

export default Index;
