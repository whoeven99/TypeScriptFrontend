import React, { Suspense } from 'react';
import { Card, Button, Typography, Skeleton, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { PhoneOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ContactCardProps {
    onClick: () => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ onClick }) => {
    const { t } = useTranslation();

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
                        <Button
                            icon={<PhoneOutlined />}
                            onClick={onClick}
                        >
                            {t("contact.contactButton")}
                        </Button>
                    </div>
                </Space>
            </Card>
        </Suspense>
    );
};

export default ContactCard;
