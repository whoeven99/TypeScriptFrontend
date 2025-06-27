import React, { useEffect, useState } from "react";
import { Button, Card, Progress, Skeleton, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useFetcher, useNavigate } from "@remix-run/react";
import { PhoneOutlined } from "@ant-design/icons";
import { handleContactSupport } from "~/routes/app._index/route";
import { GetUserValue } from "~/api/JavaServer";

const { Text, Title } = Typography;

interface ProgressingCardProps {
    shop: string;
    server: string;
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({ shop, server }) => {
    // const [data, setData] = useState<any>(null);
    const [item, setItem] = useState("");
    // const [itemsCount, setItemsCount] = useState<{
    //     totalNumber: number;
    //     translatedNumber: number;
    // }>({
    //     totalNumber: 0,
    //     translatedNumber: 0,
    // });
    const [value, setValue] = useState<string>("");
    const [source, setSource] = useState<string>("");
    const [target, setTarget] = useState<string>("");
    const [resourceType, setResourceType] = useState<string>("");
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<number>(0);
    const [translateStatus, setTranslateStatus] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const fetcher = useFetcher<any>();
    const statusFetcher = useFetcher<any>();
    // const itemsFetcher = useFetcher<any>();
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
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
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
                // const itemsFormData = new FormData();
                // itemsFormData.append(
                //     "itemsCount",
                //     JSON.stringify({
                //         source: source,
                //         target: target,
                //         resourceType: item, // 使用当前的 item
                //     }),
                // );

                // itemsFetcher.submit(itemsFormData, {
                //     method: "post",
                //     action: "/app/manage_translation",
                // });

                async function getUserValue() {
                    const userValue = await GetUserValue({ shop: shop, server });
                    setValue(userValue?.response?.value || "");
                    setTranslateStatus(userValue?.response?.status || 2);
                }

                getUserValue();

                // setValue(userValue.data.userValue);

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

    // useEffect(() => {
    //     if (typeof itemsFetcher.data?.data[0]?.totalNumber === 'number' && typeof itemsFetcher.data?.data[0]?.translatedNumber === 'number') {
    //         setItemsCount({
    //             totalNumber: itemsFetcher.data?.data[0]?.totalNumber || 0,
    //             translatedNumber: itemsFetcher.data?.data[0]?.translatedNumber || 0,
    //         });
    //     }
    // }, [itemsFetcher.data]);

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
                    selectedLanguage: target,
                    translateSettings1: "google",
                    translateSettings2: "1",
                    translateSettings3: [
                        "products",
                        "collection",
                        "article",
                        "blog_titles",
                        "pages",
                        "filters",
                        "metaobjects",
                        "metadata",
                        "notifications",
                        "navigation",
                        "shop",
                        "theme",
                        "delivery",
                        "shipping",
                    ],
                }),
            },
            {
                method: "post",
                action: "/app/language",
            },
        )
    };

    return (
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
                                    flexDirection: isMobile ? "column" : "row",
                                    width: "100%", // 确保占满容器宽度
                                    textAlign: "center",
                                    gap: 10,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        width: isMobile ? "100%" : "80%", // 确保占满容器宽度
                                        textAlign: "center",
                                        flexDirection: "column",
                                        height: isMobile ? "100%" : '69px'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            width: "100%", // 确保占满容器宽度
                                            marginBottom: "auto",
                                            gap: 30,
                                        }}
                                    >
                                        {/* 左侧部分 */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            {/* <Text
                                                style={{
                                                    whiteSpace: "nowrap", // 防止文字换行
                                                    lineHeight: "30px",
                                                }}
                                            >
                                                {t("progressing.target")}
                                            </Text> */}
                                            <Text
                                                style={{
                                                    fontSize: "18px",
                                                    fontWeight: 700,
                                                    color: "#007F61",
                                                    lineHeight: "30px",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {target}
                                            </Text>
                                        </div>

                                        <div
                                            style={{
                                                maxWidth: isMobile ? "50%" : status === 1 ? "100%" : "80%", // 限制最大宽度
                                                textAlign: "start",
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            {status === 1 && (
                                                <Text>{t("progressing.finished")}</Text>
                                            )}
                                            {status === 2 && (
                                                translateStatus === 1 ?
                                                    <Text>{t("progressing.init")}</Text>
                                                    :

                                                    <div style={{ width: "100%" }}>
                                                        <Text
                                                            style={{
                                                                width: "100%",
                                                                whiteSpace: "nowrap",
                                                                display: "block"
                                                            }}
                                                        >
                                                            {translateStatus === 2 ?
                                                                t("progressing.progressingWithSpace", {
                                                                    item: t(item)
                                                                }) :
                                                                t("progressing.progressingWriting", {
                                                                    item: t(item)
                                                                })
                                                            }
                                                        </Text>
                                                        <div style={{ width: "100%" }}>
                                                            <Text style={{
                                                                display: "flex",
                                                                width: "100%",
                                                                overflow: "hidden",
                                                                color: "#007F61",
                                                                whiteSpace: "nowrap"
                                                            }}>
                                                                <span style={{ flexShrink: 0 }}>[</span>
                                                                <span style={{
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                }}>
                                                                    {value}
                                                                </span>
                                                                <span style={{ flexShrink: 0 }}>]</span>
                                                            </Text>
                                                        </div>
                                                    </div>

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
                                            display: isMobile ? "none" : "block",
                                        }}
                                    >
                                        <Progress
                                            percent={status === 1 ? 100 : translateStatus === 1 && status === 2 ? 0 : progress}
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
                                        width: isMobile ? "100%" : "20%",
                                        // height: "82px",
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
                                            style={{
                                                marginTop: "auto",
                                            }}
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
                                            style={{
                                                marginTop: "auto",
                                                alignItems: "flex-end"
                                            }}
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
    );
};

export default ProgressingCard;
