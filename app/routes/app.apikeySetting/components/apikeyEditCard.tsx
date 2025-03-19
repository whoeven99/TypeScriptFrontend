import React from 'react';
import { Card, Input, Button, Tag, Space, Typography } from 'antd';
import styles from './ApiKeyEditCard.module.css';
import { useTranslation } from 'react-i18next';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ApiKeyEditCardProps {
    title: string;
    apiKey?: string;
    count?: string | number;
    tags?: string[];
    onSave?: (values: { apiKey: string; count: string }) => void;
}

export const ApiKeyEditCard: React.FC<ApiKeyEditCardProps> = ({
    title,
    apiKey = '',
    count = '',
    tags = [],
    onSave
}) => {
    const [apiKeyValue, setApiKeyValue] = React.useState(apiKey);
    const [countValue, setCountValue] = React.useState(count.toString());
    const { t } = useTranslation();

    const handleSave = () => {
        onSave?.({
            apiKey: apiKeyValue,
            count: countValue
        });
    };

    return (
        <Card className={styles.card}>
            <div className={styles.header}>
                <Title level={5}>{title}</Title>
                <Button type="primary" onClick={handleSave}>
                    {t("Save")}
                </Button>
            </div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text strong style={{ whiteSpace: 'nowrap', marginRight: '8px', flex: 1 }}>{t("API Key")}</Text>
                    <Input.Password
                        placeholder={t("API Key")}
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        style={{ flex: 12 }}
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text strong style={{ whiteSpace: 'nowrap', marginRight: '8px', flex: 1 }}>{t("Count")}</Text>
                    <Input
                        placeholder={t("Count")}
                        value={countValue}
                        onChange={(e) => setCountValue(e.target.value)}
                        style={{ flex: 12 }}
                    />
                </div>
                <Space size={[0, 8]} wrap>
                    {tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                    ))}
                </Space>
            </Space>
        </Card>
    );
};
