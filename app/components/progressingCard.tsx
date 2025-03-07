import React, { useEffect, useState } from "react";
import { Button, Card, Progress, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useFetcher, useNavigate } from "@remix-run/react";
import { PhoneOutlined } from "@ant-design/icons";
import { handleContactSupport } from "~/routes/app._index/route";

const { Text, Title } = Typography;

interface ProgressingCardProps {
    source: string;
    target: string;
    status: number;
    resourceType: string;
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({
    source,
    target,
    status,
    resourceType,
}) => {
    // const [data, setData] = useState<any>(null);
    const [item, setItem] = useState("Products");
    const [itemsCount, setItemsCount] = useState<{
        totalNumber: number;
        translatedNumber: number;
    }>({
        totalNumber: 0,
        translatedNumber: 0,
    });
    // const [target, setTarget] = useState<string>("");
    const [newResourceType, setNewResourceType] = useState<string>(resourceType);
    const [progress, setProgress] = useState<number>(0);
    const [newStatus, setNewStatus] = useState<number>(status);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const statusFetcher = useFetcher<any>();
    const itemsFetcher = useFetcher<any>();
    // const target = useSelector((state: any) =>
    //     state.languageTableData.rows.find(
    //         (item: any) => item.status === 2,
    //     ),
    // );

    useEffect(() => {
        if (item) {
            console.log("item: ", item);
        }
    }, [item]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        // 当状态为 2 时，开始轮询
        if (newStatus === 2) {
            const pollStatus = () => {
                // 状态查询请求
                const statusformData = new FormData();
                statusformData.append(
                    "statusData",
                    JSON.stringify({
                        source: source,
                        target: [target],
                    }),
                );

                statusFetcher.submit(statusformData, {
                    method: "post",
                    action: "/app",
                });

                // 项目计数请求
                const itemsFormData = new FormData();
                itemsFormData.append(
                    "itemsCount",
                    JSON.stringify({
                        source: [source],
                        target: target,
                        resourceType: item,  // 使用当前的 item
                    }),
                );

                itemsFetcher.submit(itemsFormData, {
                    method: "post",
                    action: "/app/manage_translation",
                });

                // 设置下一次轮询
                timeoutId = setTimeout(pollStatus, 5000);
            };

            // 开始首次轮询
            pollStatus();

            // 清理函数
            return () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            };
        }
    }, [newStatus, source, target, item]); // 添加 item 到依赖数组

    useEffect(() => {
        if (statusFetcher.data?.data) {
            const newStatusValue = statusFetcher.data?.data[0].status;
            setNewStatus(newStatusValue);
            if (newStatusValue === 2) {
                setNewResourceType(statusFetcher.data?.data[0].resourceType || "");
            } else {
                setNewResourceType("");
                // 状态不为 2 时，轮询会自动停止
            }
        }
    }, [statusFetcher.data]);

    useEffect(() => {
        if (itemsFetcher.data?.data) {
            setItemsCount({
                totalNumber: itemsFetcher.data?.data[0].totalNumber || 0,
                translatedNumber: itemsFetcher.data?.data[0].translatedNumber || 0,
            });
            // console.log("itemsCount: ", itemsCount);

            // const newStatusValue = statusFetcher.data.data[0].status;
            // setNewStatus(newStatusValue);
            // if (newStatusValue === 2) {
            //     setNewResourceType(statusFetcher.data.data[0].resourceType);
            // } else {
            //     setNewResourceType("");
            //     // 状态不为 2 时，轮询会自动停止
            // }
        }
    }, [itemsFetcher.data]);

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
        if (newResourceType) {
            const progress = calculateProgressByType(newResourceType);
            setProgress(progress);
        }
    }, [newResourceType]);

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
                return 28;
            case 'PRODUCT_OPTION':
                setItem("Products");
                return 30;
            case 'PRODUCT_OPTION_VALUE':
                setItem("Products");
                return 32;
            case 'COLLECTION':
                setItem("Collections");
                return 34;
            case 'ONLINE_STORE_THEME':
                setItem("Online Store Theme");
                return 36;
            case 'ONLINE_STORE_THEME_APP_EMBED':
                setItem("Online Store Theme");
                return 38;
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
                {newStatus !== 0 ?
                    <Card>
                        {/* <Space style={{ width: '100%', }} size="small"> */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',  // 确保占满容器宽度
                                textAlign: 'center',
                                gap: 10,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    width: '85%',  // 确保占满容器宽度
                                    textAlign: 'center',
                                    flexDirection: 'column',
                                    // height: '69px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    width: '100%',  // 确保占满容器宽度
                                    textAlign: 'center',
                                    marginBottom: 'auto'  // 将内容推到顶部
                                }}>
                                    {/* 左侧部分 */}
                                    <div style={{
                                        display: 'flex',
                                        maxWidth: '20%',  // 限制最大宽度
                                        flexDirection: 'column',
                                        lineHeight: '1.5',
                                        textAlign: 'left',
                                        flex: 1
                                    }}>
                                        <Text style={{
                                            whiteSpace: 'nowrap'  // 防止文字换行
                                        }}>{t("progressing.target")}</Text>
                                        <Text style={{
                                            textAlign: 'left',
                                            fontSize: '24px',
                                            fontWeight: 600
                                        }}>{target}</Text>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        maxWidth: newStatus === 1 ? '100%' : '80%',  // 限制最大宽度
                                        alignItems: newStatus === 1 ? 'flex-end' : 'center',  // 居中对齐
                                        textAlign: 'left',
                                        flex: 7
                                    }}>
                                        {
                                            newStatus === 1 &&
                                            <Text>{t("progressing.finished")}</Text>
                                        }
                                        {
                                            newStatus === 2 &&
                                            <Text>{t("progressing.progressingWithSpace", { item: t(item) })}({itemsCount.translatedNumber}/{itemsCount.totalNumber})</Text>
                                        }
                                        {
                                            newStatus === 3 &&
                                            <Text>{t("progressing.contact")}</Text>
                                        }
                                        {
                                            newStatus === 4 &&
                                            <Text>{t("progressing.contact")}</Text>
                                        }
                                    </div>

                                    {/* 右侧部分 */}

                                </div>
                                <div style={{
                                    width: '100%',
                                    marginTop: 'auto'  // 将进度条推到底部
                                }}>
                                    <Progress
                                        percent={newStatus === 1 ? 100 : progress}
                                        status={newStatus === 1 ? 'success' : newStatus === 2 ? 'active' : 'normal'}
                                        percentPosition={{ align: 'end', type: 'inner' }}
                                        size={["100%", 20]}
                                        strokeColor="#001342"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '15%', flexDirection: 'column', height: '82px' }}>
                                {newStatus === 3 &&
                                    <div style={{
                                        width: '100%',  // 限制最大宽度
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                    }}>

                                        <Button
                                            block
                                            onClick={() => navigate("/app/translate", { state: { selectedLanguageCode: target } })}
                                        >
                                            {t("progressing.buyCredits")}
                                        </Button>
                                        <Button
                                            block
                                            type="primary"
                                            icon={<PhoneOutlined />}
                                            onClick={handleContactSupport}
                                        >
                                            {t("progressing.contactButton")}
                                        </Button>

                                    </div>
                                }
                                {/* {newStatus === 2 &&
                                            <>
                                                <Text>
                                                    {t("progressing.remaining")}
                                                </Text>
                                            </>
                                        } */}
                                {newStatus === 4 &&
                                    <Button
                                        block
                                        type="primary"
                                        icon={<PhoneOutlined />}
                                        onClick={handleContactSupport}
                                        style={{ marginTop: 'auto' }}
                                    >
                                        {t("progressing.contactButton")}
                                    </Button>
                                }
                                {newStatus === 1 &&
                                    <Button
                                        block
                                        type="primary"
                                        icon={<PhoneOutlined />}
                                        onClick={() => navigate("/app/language")}
                                        style={{ marginTop: 'auto' }}
                                    >
                                        {t("progressing.publish")}
                                    </Button>
                                }
                            </div>
                        </div>
                        {/* </Space> */}
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
