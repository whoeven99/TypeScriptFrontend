import React, { useState } from 'react';
import { Card, Input, Button, Tag, Space, Typography, message } from 'antd';
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
    minlength = 30,
    onSave,
    loading
}) => {
    const [apiKeyValue, setApiKeyValue] = useState(apiKey);
    const [countValue, setCountValue] = useState(count.toString());
    const [isEdit, setIsEdit] = useState(false);
    const { t } = useTranslation();

    const validateInputs = (): boolean => {
        if (apiKeyValue.length < minlength) {
            message.error(t('API Key is not valid'));
            return false;
        }

        const countNum = Number(countValue);
        if (isNaN(countNum) || countNum <= 0) {
            message.error(t('Count must be a positive number'));
            return false;
        }

        return true;
    };

    const handleSave = () => {
        if (!validateInputs()) return;
        
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

    const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            setCountValue(value);
        }
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
                        placeholder={t("Please enter API Key")}
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        style={{ flex: 12 }}
                        disabled={!isEdit}
                        status={isEdit && apiKeyValue && apiKeyValue.length < minlength ? 'error' : ''}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text strong style={{ whiteSpace: 'nowrap', marginRight: '8px', flex: 1 }}>{t("Count")}</Text>
                    <Input
                        placeholder={t("Please enter Count")}
                        value={countValue}
                        onChange={handleCountChange}
                        style={{ flex: 12 }}
                        disabled={!isEdit}
                        status={isEdit && countValue && !/^\d+$/.test(countValue) ? 'error' : ''}
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
