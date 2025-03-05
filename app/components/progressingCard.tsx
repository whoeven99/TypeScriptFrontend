import React, { useEffect, useState } from "react";
import { Button, Card, Progress, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { updateState } from "~/store/modules/translatingResourceType";
import { useFetcher } from "@remix-run/react";
import { PhoneOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

interface ProgressingCardProps {
    source: string;
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({
    source,
}) => {
    const [data, setData] = useState<any>(null);
    const [item, setItem] = useState("Products");
    const [target, setTarget] = useState<string>("");
    const [resourceType, setResourceType] = useState<string>("");
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<number>(0);
    const { t } = useTranslation();
    const fetcher = useFetcher<any>();
    const statusFetcher = useFetcher<any>();
    // const target = useSelector((state: any) =>
    //     state.languageTableData.rows.find(
    //         (item: any) => item.status === 2,
    //     ),
    // );

    useEffect(() => {
        fetcher.submit({
            translatingLanguage: JSON.stringify(source),
        }, {
            method: "POST",
            action: "/app",
        });
    }, []);

    useEffect(() => {
        if (fetcher.data) {
            if (fetcher.data.success) {
                setData(fetcher.data.data);
            }
        }
    }, [fetcher.data]);

    useEffect(() => {
        if (data) {
            console.log("data: ", data);
            setTarget(data.target);
            setStatus(data.status);
            setResourceType(data.resourceType);
        }
    }, [data]);

    useEffect(() => {
        if (status === 2) {
            const formData = new FormData();
            formData.append(
                "statusData",
                JSON.stringify({
                    source: source,
                    target: [target],
                }),
            );
            const timeoutId = setTimeout(() => {
                statusFetcher.submit(formData, {
                    method: "post",
                    action: "/app",
                });
            }, 2000); // 2秒延时
            // 在组件卸载时清除定时器
            return () => clearTimeout(timeoutId);
        }
    }, [status]);

    useEffect(() => {
        if (statusFetcher.data) {
            if (statusFetcher.data.data) {
                console.log(statusFetcher.data.data);
                if (statusFetcher.data.data[0].status === 2) {
                    setStatus(statusFetcher.data.data[0].status);
                    setResourceType(statusFetcher.data.data[0].resourceType);
                } else {
                    setStatus(statusFetcher.data.data[0].status);
                    setResourceType("");
                }
            }
        }
    }, [statusFetcher.data]);

    // useEffect(() => {
    //     if (target) {
    //         statusFetcher.submit({
    //             statusData: JSON.stringify({
    //                 source: source,
    //                 target: [target],
    //             }),
    //         }, {
    //             method: "POST",
    //             action: "/app",
    //         });
    //     }
    // }, [target]);

    // useEffect(() => {
    //     if (statusFetcher.data) {
    //         if (statusFetcher.data.data) {
    //             const statusData = statusFetcher.data.data.find((item: any) => item.status === 2);
    //             console.log(statusData);
    //             if (statusData) {
    //                 // setResourceType(statusData.resourceType);
    //                 setResourceType(statusData.resourceType);
    //             }
    //         }
    //     }
    // }, [statusFetcher.data]);

    useEffect(() => {
        if (resourceType) {
            const progress = calculateProgressByType(resourceType);
            setProgress(progress);
        }
    }, [resourceType]);

    // const RESOURCE_TYPES = [
    //     'PRODUCT',
    //     'PRODUCT_OPTION',
    //     'PRODUCT_OPTION_VALUE',

    //     'COLLECTION',

    //     'ONLINE_STORE_THEME',
    //     'ONLINE_STORE_THEME_APP_EMBED',
    //     'ONLINE_STORE_THEME_JSON_TEMPLATE',
    //     'ONLINE_STORE_THEME_SECTION_GROUP',
    //     'ONLINE_STORE_THEME_SETTINGS_CATEGORY',
    //     'ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS',

    //     'PACKING_SLIP_TEMPLATE',

    //     'SHOP_POLICY',

    //     'EMAIL_TEMPLATE',

    //     'ONLINE_STORE_THEME_LOCALE_CONTENT',

    //     'MENU',

    //     'LINK',

    //     'DELIVERY_METHOD_DEFINITION',

    //     'FILTER',

    //     'METAFIELD',

    //     'METAOBJECT',

    //     'PAYMENT_GATEWAY',

    //     'SELLING_PLAN',
    //     'SELLING_PLAN_GROUP',

    //     'SHOP',

    //     'ARTICLE',

    //     'BLOG',

    //     'PAGE'
    // ];

    const calculateProgressByType = (resourceType: string): number => {
        switch (resourceType) {
            case 'PRODUCT':
                setItem("Products");
                return 1;
            case 'PRODUCT_OPTION':
                setItem("Products");
                return 15;
            case 'PRODUCT_OPTION_VALUE':
                setItem("Products");
                return 20;
            case 'COLLECTION':
                setItem("Collections");
                return 25;
            case 'ONLINE_STORE_THEME':
                setItem("Online Store Theme");
                return 30;
            case 'ONLINE_STORE_THEME_APP_EMBED':
                setItem("Online Store Theme");
                return 40;
            case 'ONLINE_STORE_THEME_JSON_TEMPLATE':
                setItem("Online Store Theme");
                return 42;
            case 'ONLINE_STORE_THEME_SECTION_GROUP':
                setItem("Online Store Theme");
                return 44;
            case 'ONLINE_STORE_THEME_SETTINGS_CATEGORY':
                setItem("Online Store Theme");
                return 46;
            case 'ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS':
                setItem("Online Store Theme");
                return 48;
            case 'PACKING_SLIP_TEMPLATE':
                setItem("Online Store Theme");
                return 50;
            case 'SHOP_POLICY':
                setItem("Policies");
                return 55;
            case 'EMAIL_TEMPLATE':
                setItem("Email Templates");
                return 60;
            case 'ONLINE_STORE_THEME_LOCALE_CONTENT':
                setItem("Email Templates");
                return 62;
            case 'MENU':
                setItem("Navigation");
                return 65;
            case 'LINK':
                setItem("Navigation");
                return 67;
            case 'DELIVERY_METHOD_DEFINITION':
                setItem("Delivery");
                return 70;
            case 'FILTER':
                setItem("Filters");
                return 73;
            case 'METAFIELD':
                setItem("Metafields");
                return 75;
            case 'METAOBJECT':
                setItem("Metaobjects");
                return 75;
            case 'PAYMENT_GATEWAY':
                setItem("Payment Gateways");
                return 77;
            case 'SELLING_PLAN':
                setItem("Selling Plans");
                return 80;
            case 'SELLING_PLAN_GROUP':
                setItem("Selling Plans");
                return 83;
            case 'SHOP':
                setItem("Shop");
                return 85;
            case 'ARTICLE':
                setItem("Articles");
                return 90;
            case 'BLOG':
                setItem("Blogs");
                return 95;
            case 'PAGE':
                setItem("Pages");
                return 99;
            default:
                return 0;
        }
    };

    return (
        <Card
        >
            <Title level={4}>{t("progressing.title")}</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
                {status !== 0 ?
                    <Card>
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',  // 确保占满容器宽度
                                textAlign: 'center',
                            }}>
                                {/* 左侧部分 */}
                                <div style={{
                                    display: 'flex',
                                    maxWidth: '33%'  // 限制最大宽度
                                }}>
                                    <Text>{t("progressing.target")}</Text>
                                    <Text>{target}</Text>
                                </div>

                                {/* 中间部分 */}
                                <div style={{
                                    display: 'flex',
                                    maxWidth: '33%',  // 限制最大宽度
                                    alignItems: 'center'  // 居中对齐
                                }}>
                                    <Text>{t("progressing.progressing")}{" "}</Text>
                                    <Text>{t(item)}{" "}</Text>
                                    <Text>{t("progressing.module")}</Text>
                                </div>

                                {/* 右侧部分 */}
                                <div style={{
                                    display: 'flex',
                                    maxWidth: '33%',  // 限制最大宽度
                                    alignItems: 'flex-end'  // 右对齐
                                }}>
                                    {status === 3 &&
                                        <Button>
                                            {t("progressing.buyCredits")}
                                        </Button>
                                    }
                                    {status === 2 &&
                                        <>
                                            <Text>
                                                {t("progressing.remaining")}
                                            </Text>
                                            <Text>

                                            </Text>
                                        </>
                                    }
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                <Progress
                                    percent={status === 1 ? 100 : progress}
                                    status={status === 1 ? 'success' : 'active'}
                                    percentPosition={{ align: 'end', type: 'inner' }}
                                    size={["100%", 20]}
                                    strokeColor="#001342"
                                />
                                {(status === 3 || status === 4) &&
                                    <Button
                                        type="primary"
                                        icon={<PhoneOutlined />}
                                    >
                                        {t("contact.contactButton")}
                                    </Button>
                                }
                                {status === 1 &&
                                    <Button
                                        type="primary"
                                        icon={<PhoneOutlined />}
                                    >
                                        {t("progressing.publishLanguage")}
                                    </Button>
                                }
                            </div>
                        </Space>
                    </Card>
                    :
                    <Card>
                        <Text style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '52px' }}>{t("progressing.noTranslate")}</Text>
                    </Card>
                }
            </Space>
        </Card>
    );
};

export default ProgressingCard;
