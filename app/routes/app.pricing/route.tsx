import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Space, Row, Col, Card, Progress, Button, Typography, Alert, Skeleton, Popover, Badge } from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import ScrollNotice from "~/components/ScrollNotice";
import { ActionFunctionArgs } from "@remix-run/node";
import { GetUserWords } from "~/api/serve";
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { useFetcher } from "@remix-run/react";
import { OptionType } from "~/components/paymentModal";
import { CheckOutlined, QuestionCircleOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export const action = async ({ request }: ActionFunctionArgs) => {
    const sessionService = await SessionService.init(request);
    let shopSession = sessionService.getShopSession();
    if (!shopSession) {
        const adminAuthResult = await authenticate.admin(request);
        const { shop, accessToken } = adminAuthResult.session;
        shopSession = {
            shop: shop,
            accessToken: accessToken as string,
        };
        sessionService.setShopSession(shopSession);
    }
    const { shop, accessToken } = shopSession;
    try {
        const formData = await request.formData();
        const loading = JSON.parse(formData.get("loading") as string);
        switch (true) {
            case !!loading:
                try {
                    const data = await GetUserWords({
                        shop,
                    });

                    return data;
                } catch (error) {
                    console.error("Error glossary loading:", error);
                }
        }
    } catch (error) {
        console.error("Error pricing action:", error);
    }
};

const Index = () => {
    const [currentCredits, setCurrentCredits] = useState(0);
    const [maxCredits, setMaxCredits] = useState(0);
    const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [buyButtonLoading, setBuyButtonLoading] = useState(false);
    const { t } = useTranslation();
    const fetcher = useFetcher<any>();
    const payFetcher = useFetcher<any>();
    const orderFetcher = useFetcher<any>();

    useEffect(() => {
        setIsLoading(false);
        fetcher.submit({ loading: true }, { method: "POST" });
    }, []);

    useEffect(() => {
        if (fetcher.data) {
            setCurrentCredits(fetcher.data.chars);
            setMaxCredits(fetcher.data.totalChars);
        }
    }, [fetcher.data]);

    useEffect(() => {
        if (payFetcher.data) {
            if (
                payFetcher.data.data.data.appPurchaseOneTimeCreate.appPurchaseOneTime &&
                payFetcher.data.data.data.appPurchaseOneTimeCreate.confirmationUrl
            ) {
                const order =
                    payFetcher.data.data.data.appPurchaseOneTimeCreate.appPurchaseOneTime;
                const confirmationUrl =
                    payFetcher.data.data.data.appPurchaseOneTimeCreate.confirmationUrl;
                const orderInfo = {
                    id: order.id,
                    amount: order.price.amount,
                    name: order.name,
                    createdAt: order.createdAt,
                    status: order.status,
                    confirmationUrl: confirmationUrl,
                };
                const formData = new FormData();
                formData.append("orderInfo", JSON.stringify(orderInfo));
                orderFetcher.submit(formData, {
                    method: "post",
                    action: "/app",
                });
                open(confirmationUrl, "_top");
            }
            if (
                payFetcher.data.data.data.appPurchaseOneTimeCreate.userErrors.length
            ) {
                setBuyButtonLoading(false);
                console.log(
                    payFetcher.data.data.data.appPurchaseOneTimeCreate.userErrors[0]
                        .message,
                );
            }
        }
    }, [payFetcher.data]);

    const creditOptions: OptionType[] = [
        {
            key: "option-1",
            name: "500K",
            Credits: 500000,
            price: {
                currentPrice: 1.99,
                comparedPrice: 100.0,
                currencyCode: "USD",
            },
        },
        {
            key: "option-2",
            name: "1M",
            Credits: 1000000,
            price: {
                currentPrice: 3.99,
                comparedPrice: 20.0,
                currencyCode: "USD",
            },
        },
        {
            key: "option-3",
            name: "2M",
            Credits: 2000000,
            price: {
                currentPrice: 7.99,
                comparedPrice: 100.0,
                currencyCode: "USD",
            },
        },
        {
            key: "option-4",
            name: "3M",
            Credits: 3000000,
            price: {
                currentPrice: 11.99,
                comparedPrice: 200.0,
                currencyCode: "USD",
            },
        },
        {
            key: "option-5",
            name: "5M",
            Credits: 5000000,
            price: {
                currentPrice: 19.99,
                comparedPrice: 200.0,
                currencyCode: "USD",
            },
        },
        {
            key: "option-6",
            name: "10M",
            Credits: 10000000,
            price: {
                currentPrice: 39.99,
                comparedPrice: 800.0,
                currencyCode: "USD",
            },
        },
        {
            key: "option-7",
            name: "20M",
            Credits: 20000000,
            price: {
                currentPrice: 79.99,
                comparedPrice: 1000.0,
                currencyCode: "USD",
            },
        },
        {
            key: "option-8",
            name: "30M",
            Credits: 30000000,
            price: {
                currentPrice: 119.99,
                comparedPrice: 2000.0,
                currencyCode: "USD",
            },
        },
    ];

    const plans = [
        {
            title: 'Starter',
            price: '1.99',
            subtitle: t('pricing.for_individuals'),
            buttonText: t('pricing.try_free'),
            buttonType: 'default',
            disabled: false,
            features: [
                '5,000 words one time',
                '1 translated language',
                'Add 153 currencies',
                'Edit translation',
                'Customize Switcher',
                'Global Search',
                'Shopify payment integration'
            ]
        },
        {
            title: 'Basic',
            price: '7.99',
            subtitle: t('pricing.for_small_teams'),
            buttonText: t('pricing.try_free'),
            features: [
                '30,000 words/month',
                '5 translated languages',
                'Multilingual SEO',
                'Auto switch Currency',
                'Glossary',
                'Export & Import'
            ]
        },
        {
            title: 'Pro',
            price: '19.99',
            subtitle: t('pricing.for_growing'),
            buttonText: t('pricing.try_free'),
            features: [
                '80,000 words/month',
                '20 translated languages',
                'Auto update translation',
                'Auto switch Language',
                'Visual Editor',
                'Image translation'
            ]
        },
        {
            title: 'Premium',
            price: '39.99',
            subtitle: t('pricing.for_growing'),
            buttonText: t('pricing.try_free'),
            isRecommended: true,
            features: [
                '80,000 words/month',
                '20 translated languages',
                'Auto update translation',
                'Auto switch Language',
                'Visual Editor',
                'Image translation'
            ]
        }
    ];


    // 模拟当前积分数据
    const isQuotaExceeded = currentCredits >= maxCredits && maxCredits > 0;

    const handlePay = () => {
        setBuyButtonLoading(true);
        const payInfo = {
            name: selectedOption?.name,
            price: {
                amount: selectedOption?.price.currentPrice,
                currencyCode: selectedOption?.price.currencyCode,
            },
        };
        const formData = new FormData();
        formData.append("payInfo", JSON.stringify(payInfo));
        payFetcher.submit(formData, {
            method: "post",
            action: "/app",
        });
    }

    return (
        <Page>
            <TitleBar title={t("Pricing")} />
            <ScrollNotice text={t("Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.")} />
            <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                {/* 积分余额显示 */}
                <Card loading={isLoading}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                            <Title level={4} style={{ marginRight: 10, marginBottom: 0 }}>{t("Your translation quota")}</Title>
                            <Popover content={t("Permanent quotas · Never expire · Top up anytime.")}>
                                <QuestionCircleOutlined />
                            </Popover>
                        </div>
                        {maxCredits ? <div
                            dangerouslySetInnerHTML={{
                                __html: t("{{currentCredits}} has been used, {{maxCredits}} available.", {
                                    currentCredits: currentCredits.toLocaleString(),
                                    maxCredits: maxCredits.toLocaleString()
                                })
                            }}
                        /> : <Skeleton active paragraph={{ rows: 1, style: { margin: 1 } }} title={false} />}
                        <Progress
                            percent={Math.round((currentCredits / maxCredits) * 100)}
                            size={["100%", 15]}
                            strokeColor="#007F61"
                            showInfo={false}
                        />
                    </Space>

                </Card>
                {isQuotaExceeded && (
                    <Alert
                        message={t("The quota has been used up")}
                        description={t("Buy extra credits now to continue using")}
                        type="warning"
                        showIcon
                    />
                )}
                <Card style={{ textAlign: 'center' }} loading={isLoading}>
                    {/* 价格选项 */}
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={3} style={{ textAlign: 'left' }}>{t("Buy Credits")}</Title>
                        <Row gutter={[16, 16]}>
                            {creditOptions.map((option) => (
                                <Col
                                    key={option.key}
                                    xs={12}
                                    sm={12}
                                    md={6}
                                    lg={6}
                                    xl={6}
                                >
                                    <Card
                                        hoverable
                                        style={{
                                            textAlign: 'center',
                                            borderColor: JSON.stringify(selectedOption) === JSON.stringify(option) ? '#007F61' : undefined,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setSelectedOption(option)}
                                    >
                                        <div style={{ width: '100%' }}>
                                            <Title level={5} style={{ marginBottom: 0, fontWeight: 600 }}>{option.Credits.toLocaleString()} {t("Credits")}</Title>
                                            <Title level={3} style={{ margin: 0, color: '#007F61', fontWeight: 700 }}>${option.price.currentPrice}</Title>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                        {/* 购买区域 */}
                        <Text type="secondary" style={{ margin: 0 }}>
                            {t("Total pay")}: ${selectedOption ?
                                creditOptions.find(option => JSON.stringify(selectedOption) === JSON.stringify(option))?.price.currentPrice
                                    .toFixed(2) :
                                '0.00'
                            }
                        </Text>
                        <Button
                            type="primary"
                            size="large"
                            disabled={!selectedOption}
                            loading={buyButtonLoading}
                            onClick={handlePay}
                        >
                            {t("Buy now")}
                        </Button>
                    </Space>
                </Card>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Row gutter={[24, 24]}>
                        {plans.map((plan, index) => (
                            <Col
                                key={plan.title}
                                xs={24}
                                sm={24}
                                md={24}
                                lg={6}
                                style={{ display: 'flex' }}
                            >
                                <Badge.Ribbon
                                    text={t('pricing.recommended')}
                                    color="#1890ff"
                                    style={{
                                        display: plan.isRecommended ? 'block' : 'none',
                                        right: -8
                                    }}
                                >
                                    <Card
                                        hoverable
                                        style={{
                                            flex: 1,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            borderColor: plan.isRecommended ? '#1890ff' : undefined,
                                            minWidth: "220px"
                                        }}
                                        styles={{
                                            body: {
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }
                                        }}
                                    >
                                        <Title level={4}>{plan.title}</Title>
                                        <div style={{ margin: '16px 0' }}>
                                            <Text style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                                ${plan.price}
                                            </Text>
                                            <Text style={{ fontSize: '16px' }}>/月</Text>
                                        </div>
                                        <Paragraph type="secondary">{plan.subtitle}</Paragraph>

                                        <Button
                                            type={plan.isRecommended ? 'primary' : 'default'}
                                            size="large"
                                            block
                                            disabled={plan.disabled}
                                            style={{ marginBottom: '24px' }}
                                        >
                                            {plan.buttonText}
                                        </Button>

                                        <div style={{ flex: 1 }}>
                                            {plan.features.map((feature, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        marginBottom: '12px',
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <CheckOutlined style={{ color: '#52c41a' }} />
                                                    <Text>{feature}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </Badge.Ribbon>
                            </Col>
                        ))}
                    </Row>
                </div>
            </Space>
        </Page>
    );
};

export default Index;