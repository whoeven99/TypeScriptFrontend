import React, { Suspense } from 'react';
import { Card, Button, Typography, Skeleton, Space, Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { PhoneOutlined, WechatOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ContactCardProps {
    isChinese: boolean;
    onClick: () => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ isChinese, onClick }) => {
    const { t } = useTranslation();

    return (
        <Suspense fallback={<Skeleton.Button active style={{ height: 150 }} block />}>
            <Card
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
                    justifyContent: "space-between",
                    flex: 1
                }}>
                    <Text strong style={{ marginBottom: '8px' }}>
                        {t("contact.title")}
                    </Text>

                    <Text>
                        {t("contact.description")}
                    </Text>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Popover content={
                            <img src="/images/wechat.webp" alt="Wechat"  width={200} height={270}/>
                        } trigger="click">
                            <Button
                                icon={isChinese ? <WechatOutlined /> : <PhoneOutlined />}
                                onClick={!isChinese ? onClick : () => {}}
                            >
                                {t("contact.contactButton")}
                            </Button>
                        </Popover>
                    </div>
                </Space>
            </Card>
        </Suspense>
    );
};

export default ContactCard;
