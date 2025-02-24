import React, { Suspense } from 'react';
import { Card, Button, Typography, Skeleton, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { PhoneOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ContactCard: React.FC = () => {
    const { t } = useTranslation();
    const handleContactSupport = () => {
        // 声明 tidioChatApi 类型
        interface Window {
            tidioChatApi?: {
                open: () => void;
            }
        }

        if ((window as Window)?.tidioChatApi) {
            (window as Window).tidioChatApi?.open();
        } else {
            console.warn('Tidio Chat API not loaded');
            // 备用方案：打开支持页面
            // window.open('https://apps.shopify.com/translator-by-ciwi/support', '_blank');
        }
    };

    return (
        <Suspense fallback={<Skeleton.Button active style={{ height: 150 }} block />}>
            <Card
                bordered={false}
                style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                }}
                styles={{
                    body: {
                        display: "flex",
                        flexDirection: "column",
                        flex: 1
                    }
                }}
            >
                <Space direction="vertical" size="middle" style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flex: 1
                }}>
                    <Text strong style={{ marginBottom: '8px' }}>
                        {t("contact.title")}
                    </Text>

                    <Text
                        style={{
                            display: 'block',
                            color: '#637381',
                            fontSize: '14px'
                        }}
                    >
                        {t("contact.description")}
                    </Text>

                    <Button
                        type="primary"
                        icon={<PhoneOutlined />}
                        onClick={handleContactSupport}
                        style={{
                            backgroundColor: '#007F61',
                            borderColor: '#007F61',
                            borderRadius: '6px',
                            boxShadow: '0 2px 4px rgba(0, 127, 97, 0.2)',
                        }}
                    >
                        {t("contact.contactButton")}
                    </Button>
                </Space>
            </Card>
        </Suspense>
    );
};

export default ContactCard;
