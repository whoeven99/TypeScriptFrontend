import React, { useEffect, useState } from "react";
import { Button, Card, message, Progress, Skeleton, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useFetcher, useNavigate } from "@remix-run/react";
import { PhoneOutlined } from "@ant-design/icons";
import { handleContactSupport } from "~/routes/app._index/route";

const { Text, Title } = Typography;

interface ProgressingCardProps { }

const ProgressingCard: React.FC<ProgressingCardProps> = ({ }) => {
    // const [data, setData] = useState<any>(null);
    const [item, setItem] = useState("");
    const [itemsCount, setItemsCount] = useState<{
        totalNumber: number;
        translatedNumber: number;
    }>({
        totalNumber: 0,
        translatedNumber: 0,
    });
    const [source, setSource] = useState<string>("");
    const [target, setTarget] = useState<string>("");
    const [resourceType, setResourceType] = useState<string>("");
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const fetcher = useFetcher<any>();
    const statusFetcher = useFetcher<any>();
    const itemsFetcher = useFetcher<any>();
    const translateFetcher = useFetcher<any>();

    useEffect(() => {
        fetcher.submit(
            {
                nearTransaltedData: JSON.stringify(true),
            },
            {
                method: "post",
                action: "/app",
            },
        );
    }, []);

    useEffect(() => {
        if (translateFetcher.data) {
            if (translateFetcher.data?.success) {
                setStatus(2)
                setResourceType("COLLECTION")
            }
        }
    }, [translateFetcher.data]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        // 当状态为 2 时，开始轮询
        if (status === 2) {
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
                        source: source,
                        target: target,
                        resourceType: item, // 使用当前的 item
                    }),
                );

                itemsFetcher.submit(itemsFormData, {
                    method: "post",
                    action: "/app/manage_translation",
                });

                // 设置下一次轮询
                timeoutId = setTimeout(pollStatus, 10000);
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
    }, [status, source, target, item, translateFetcher.data]); // 添加 item 到依赖数组

    useEffect(() => {
        if (fetcher.data?.translatingLanguage) {
            setSource(fetcher.data?.translatingLanguage.source);
            setTarget(fetcher.data?.translatingLanguage.target);
            setResourceType(fetcher.data?.translatingLanguage.resourceType);
            setStatus(fetcher.data?.translatingLanguage.status);
            setLoading(false);
        }
    }, [fetcher.data]);

    useEffect(() => {
        if (statusFetcher.data?.data) {
            const statusValue = statusFetcher.data?.data[0].status;
            setStatus(statusValue);
            if (statusValue === 2) {
                setResourceType(statusFetcher.data?.data[0].resourceType || "");
            } else {
                setResourceType("");
                // 状态不为 2 时，轮询会自动停止
            }
        }
    }, [statusFetcher.data]);

    useEffect(() => {
        if (itemsFetcher.data?.data && itemsFetcher.data?.data.length > 0) {
            setItemsCount({
                totalNumber: itemsFetcher.data?.data[0].totalNumber || 0,
                translatedNumber: itemsFetcher.data?.data[0].translatedNumber || 0,
            });
        }
    }, [itemsFetcher.data]);

    useEffect(() => {
        if (resourceType) {
            const progress = calculateProgressByType(resourceType);
            setProgress(progress);
        }
    }, [resourceType]);

    const calculateProgressByType = (resourceType: string): number => {
        switch (resourceType) {
            case "COLLECTION":
                setItem("Collection");
                return 20;
            case "PACKING_SLIP_TEMPLATE":
                setItem("Shipping");
                return 30;
            case "SHOP_POLICY":
                setItem("Shipping");
                return 40;
            case "EMAIL_TEMPLATE":
                setItem("Shipping");
                return 43;
            case "MENU":
                setItem("Navigation");
                return 45;
            case "LINK":
                setItem("Navigation");
                return 48;
            case "DELIVERY_METHOD_DEFINITION":
                setItem("Delivery");
                return 50;
            case "FILTER":
                setItem("Filters");
                return 52;
            case "METAFIELD":
                setItem("Store metadata");
                return 54;
            case "METAOBJECT":
                setItem("Metaobjects");
                return 56;
            case "PAYMENT_GATEWAY":
                setItem("Metaobjects");
                return 58;
            case "SELLING_PLAN":
                setItem("Metaobjects");
                return 60;
            case "SELLING_PLAN_GROUP":
                setItem("Shop");
                return 62;
            case "SHOP":
                setItem("Shop");
                return 65;
            case "ARTICLE":
                setItem("Article");
                return 68;
            case "BLOG":
                setItem("Blog titles");
                return 70;
            case "PAGE":
                setItem("Pages");
                return 72;
            case "PRODUCT":
                setItem("Products");
                return 75;
            case "PRODUCT_OPTION":
                setItem("Products");
                return 78;
            case "PRODUCT_OPTION_VALUE":
                setItem("Products");
                return 80;
            case "ONLINE_STORE_THEME":
                setItem("Theme");
                return 82;
            case "ONLINE_STORE_THEME_APP_EMBED":
                setItem("Theme");
                return 85;
            case "ONLINE_STORE_THEME_JSON_TEMPLATE":
                setItem("Theme");
                return 88;
            case "ONLINE_STORE_THEME_SECTION_GROUP":
                setItem("Theme");
                return 90;
            case "ONLINE_STORE_THEME_SETTINGS_CATEGORY":
                setItem("Theme");
                return 92;
            case "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS":
                setItem("Theme");
                return 95;
            case "ONLINE_STORE_THEME_LOCALE_CONTENT":
                setItem("Theme");
                return 99;
            default:
                return 0;
        }
    };

    const handleReTranslate = () => {
        translateFetcher.submit(
            {
                translation: JSON.stringify({
                    primaryLanguage: source,
                    selectedLanguage: {
                        locale: target,
                    },
                    translateSettings1: "1",
                    translateSettings2: "1",
                    translateSettings3: [],
                }),
            },
            {
                method: "post",
                action: "/app/language",
            },
        )
    };

    return (
        <>
            <Card>
                <Title level={4}>{t("progressing.title")}</Title>
                {loading ? (
                    <Skeleton.Button active style={{ height: "130px" }} block />
                ) : (
                    <Space direction="vertical" style={{ width: "100%" }}>
                        {status !== 0 ? (
                            <Card>
                                {/* <Space style={{ width: '100%', }} size="small"> */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        width: "100%", // 确保占满容器宽度
                                        textAlign: "center",
                                        gap: 10,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            width: "80%", // 确保占满容器宽度
                                            textAlign: "center",
                                            flexDirection: "column",
                                            // height: '69px'
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                width: "100%", // 确保占满容器宽度
                                                textAlign: "center",
                                                marginBottom: "auto",
                                                gap: 30,
                                            }}
                                        >
                                            {/* 左侧部分 */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    maxWidth: "20%", // 限制最大宽度
                                                    flexDirection: "column",
                                                    lineHeight: "1.5",
                                                    textAlign: "left",
                                                    flex: 1,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        whiteSpace: "nowrap", // 防止文字换行
                                                    }}
                                                >
                                                    {t("progressing.target")}
                                                </Text>
                                                <Text
                                                    style={{
                                                        textAlign: "left",
                                                        fontSize: "24px",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {target}
                                                </Text>
                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    maxWidth: status === 1 ? "100%" : "80%", // 限制最大宽度
                                                    alignItems: status === 1 ? "flex-end" : "center", // 居中对齐
                                                    textAlign: "left",
                                                    flex: 7,
                                                }}
                                            >
                                                {status === 1 && (
                                                    <Text>{t("progressing.finished")}</Text>
                                                )}
                                                {status === 2 && (
                                                    <Text>
                                                        {t("progressing.progressingWithSpace", {
                                                            item: t(item),
                                                        })}
                                                        ({itemsCount.translatedNumber}/
                                                        {itemsCount.totalNumber})
                                                    </Text>
                                                )}
                                                {status === 3 && (
                                                    <Text>⚠️{t("progressing.contact")}</Text>
                                                )}
                                                {status === 4 && (
                                                    <Text>{t("progressing.somethingWentWrong")}</Text>
                                                )}
                                                {status === 5 && (
                                                    <Text>
                                                        {t("progressing.privateApiKeyAmountLimit")}
                                                    </Text>
                                                )}
                                                {status === 6 && (
                                                    <Text>
                                                        🎉{t("progressing.hasPayed")}
                                                    </Text>
                                                )}
                                            </div>

                                            {/* 右侧部分 */}
                                        </div>
                                        <div
                                            style={{
                                                width: "100%",
                                                marginTop: "auto", // 将进度条推到底部
                                            }}
                                        >
                                            <Progress
                                                percent={status === 1 ? 100 : progress}
                                                status={
                                                    status === 1
                                                        ? "success"
                                                        : status === 2
                                                            ? "active"
                                                            : "normal"
                                                }
                                                percentPosition={{ align: "end", type: "inner" }}
                                                size={["100%", 20]}
                                                strokeColor="#007F61"
                                            />
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-end",
                                            width: "20%",
                                            height: "82px",
                                        }}
                                    >
                                        {status === 1 && (
                                            <Button
                                                block
                                                type="primary"
                                                onClick={() =>
                                                    navigate("/app/language", {
                                                        state: { publishLanguageCode: target },
                                                    })
                                                }
                                                style={{ marginTop: "auto" }}
                                            >
                                                {t("progressing.publish")}
                                            </Button>
                                        )}
                                        {status === 3 && (
                                            <div
                                                style={{
                                                    width: "100%", // 限制最大宽度
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 10,
                                                }}
                                            >
                                                <Button
                                                    block
                                                    type="primary"
                                                    onClick={() => navigate("/app/pricing")}
                                                >
                                                    {t("progressing.buyCredits")}
                                                </Button>
                                                <Button
                                                    block
                                                    icon={<PhoneOutlined />}
                                                    onClick={handleContactSupport}
                                                >
                                                    {t("progressing.contactButton")}
                                                </Button>
                                            </div>
                                        )}
                                        {status === 4 && (
                                            <Button
                                                block
                                                type="primary"
                                                icon={<PhoneOutlined />}
                                                onClick={handleContactSupport}
                                                style={{ marginTop: "auto" }}
                                            >
                                                {t("progressing.contactButton")}
                                            </Button>
                                        )}
                                        {status === 5 && (
                                            <div
                                                style={{
                                                    width: "100%", // 限制最大宽度
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 10,
                                                }}
                                            >
                                                <Button
                                                    block
                                                    type="primary"
                                                    onClick={() => navigate("/app/apikeySetting")}
                                                >
                                                    {t("progressing.apikeySetting")}
                                                </Button>
                                                <Button
                                                    block
                                                    icon={<PhoneOutlined />}
                                                    onClick={handleContactSupport}
                                                >
                                                    {t("progressing.contactButton")}
                                                </Button>
                                            </div>
                                        )}
                                        {status === 6 && (
                                            <Button
                                                block
                                                type="primary"
                                                onClick={handleReTranslate}
                                                style={{ marginTop: "auto" }}
                                            >
                                                {t("progressing.reTranslate")}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {/* </Space> */}
                            </Card>
                        ) : (
                            <Card>
                                <Text
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        minHeight: "52px",
                                    }}
                                >
                                    {t("progressing.noTranslate")}
                                </Text>
                            </Card>
                        )}
                    </Space>
                )}
            </Card>
        </>
    );
};

export default ProgressingCard;
