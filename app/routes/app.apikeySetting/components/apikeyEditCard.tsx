import React from 'react';
import { Card, Input, Button, Tag, Space, Typography } from 'antd';
import styles from './ApiKeyEditCard.module.css';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface ApiKeyEditCardProps {
    title: string;
    modal: string;
    apiKey?: string;
    count?: string | number;
    tags?: string[];
    minlength?: number;
    onSave?: (values: { modal: string; apiKey: string; count: string }) => void;
    loading?: boolean;
}

export const ApiKeyEditCard: React.FC<ApiKeyEditCardProps> = ({
    title,
    modal,
    apiKey = '',
    count = '',
    tags = [],
    minlength,
    onSave,
    loading
}) => {
    const [apiKeyValue, setApiKeyValue] = React.useState(apiKey);
    const [countValue, setCountValue] = React.useState(count.toString());
    const [isEdit, setIsEdit] = React.useState(false);
    const { t } = useTranslation();

    const handleSave = () => {
        setIsEdit(false);
        onSave?.({
            modal,
            apiKey: apiKeyValue,
            count: countValue
        });
    };

    const handleEdit = () => {
        setIsEdit(true);
        setApiKeyValue('');
        setCountValue('');
    };

    return (
        <Card className={styles.card}>
            <div className={styles.header}>
                <Title level={5}>{title}</Title>
                {isEdit ?
                    <Button type="primary" onClick={handleSave}>
                        {t("Save")}
                    </Button>
                    :
                    <Button type="primary" onClick={handleEdit} loading={loading}>
                        {t("Edit")}
                    </Button>
                }
            </div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text strong style={{ whiteSpace: 'nowrap', marginRight: '8px', flex: 1 }}>{t("API Key")}</Text>
                    <Input
                        placeholder={t("API Key")}
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        style={{ flex: 12 }}
                        disabled={!isEdit}
                        
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text strong style={{ whiteSpace: 'nowrap', marginRight: '8px', flex: 1 }}>{t("Count")}</Text>
                    <Input
                        placeholder={t("Count")}
                        value={countValue}
                        onChange={(e) => setCountValue(e.target.value)}
                        style={{ flex: 12 }}
                        disabled={!isEdit}
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
