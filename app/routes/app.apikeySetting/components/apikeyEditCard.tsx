import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Card, Input, Button, Tag, Space, Typography, message, InputRef } from 'antd';
import styles from './ApiKeyEditCard.module.css';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface ApiKeyEditCardProps {
    title: string;
    model: string;
    apiKey?: string;
    count?: string | number;
    tags?: string[];
    minlength?: number;
    onSave?: (values: { model: string; apiKey: string; count: string }) => void;
    onDelete?: (modal: string) => void;
    loading?: boolean;
}

export interface ApiKeyEditCardMethods {
    setEditMode: (isEdit: boolean) => void;
    setApiKeyValue: (value: string) => void;
    setCountValue: (value: string) => void;
}

export const ApiKeyEditCard = forwardRef<ApiKeyEditCardMethods, ApiKeyEditCardProps>(({
    title,
    model,
    apiKey = '',
    count = '',
    tags = [],
    minlength = 30,
    onSave,
    onDelete,
    loading
}, ref) => {
    const [apiKeyValue, setApiKeyValue] = useState(apiKey);
    const [countValue, setCountValue] = useState(count.toString());
    const [isEdit, setIsEdit] = useState(false);
    const [apiKeyError, setApiKeyError] = useState(false);
    const [countError, setCountError] = useState(false);
    const { t } = useTranslation();
    const apiKeyRef = useRef<InputRef>(null);
    const countRef = useRef<InputRef>(null);

    useEffect(() => {
        setApiKeyValue(apiKey);
        setCountValue(count.toString());
    }, [apiKey, count]);

    useImperativeHandle(ref, () => ({
        setEditMode: (value: boolean) => setIsEdit(value),
        setApiKeyValue: (value: string) => setApiKeyValue(value),
        setCountValue: (value: string) => setCountValue(value)
    }));

    const validateInputs = (): boolean => {
        if (apiKeyValue.length < minlength) {
            setApiKeyError(true);
            if (apiKeyRef.current?.input) {
                apiKeyRef.current.input.style.borderColor = 'red';
            }
            return false;
        }
        setApiKeyError(false);

        const countNum = Number(countValue);
        if (isNaN(countNum) || countNum <= 0) {
            setCountError(true);
            if (countRef.current?.input) {
                countRef.current.input.style.borderColor = 'red';
            }
            return false;
        }
        setCountError(false);

        return true;
    };

    const handleSave = () => {
        if (!validateInputs()) return;
        onSave?.({
            model,
            apiKey: apiKeyValue,
            count: countValue
        });
    };

    const handleCancel = () => {
        setIsEdit(false);
        setApiKeyValue(apiKey);
        setCountValue(count.toString());
        setApiKeyError(false);
        setCountError(false);
        if (apiKeyRef.current?.input) {
            apiKeyRef.current.input.style.borderColor = '';
        }
        if (countRef.current?.input) {
            countRef.current.input.style.borderColor = '';
        }
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
            if (Number(value) > 2147483647) {
                setCountValue("2147483647");
            }
        }
    };

    return (
        <Card className={styles.card}>
            <div className={styles.header}>
                <Title level={5}>{title}</Title>
                {isEdit ?
                    <Space>
                        <Button type="default" onClick={handleCancel} loading={loading}>
                            {t("Cancel")}
                        </Button>
                        <Button type="primary" onClick={handleSave} loading={loading}>
                            {t("Save")}
                        </Button>
                    </Space>
                    :
                    <Space>
                        <Button disabled={!apiKeyValue} onClick={() => onDelete?.(model)} loading={loading}>
                            {t("Delete")}
                        </Button>
                        <Button onClick={handleEdit}>
                            {t("Edit")}
                        </Button>
                    </Space>
                }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong style={{
                        whiteSpace: 'nowrap',
                        width: '50px'  // 固定宽度，根据实际文本长度调整
                    }}>
                        {t("API Key")}
                    </Text>
                    <Input
                        ref={apiKeyRef}
                        placeholder={t("Please enter API Key")}
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        style={{ flex: 1 }}  // 输入框占据剩余空间
                        disabled={!isEdit || loading}
                    />
                </div>
                {/* 错误提示放在下方，并且与输入框左对齐 */}
                <div style={{
                    marginLeft: '60px',  // 80px(标签宽度) + 8px(间距)
                    visibility: isEdit && apiKeyError ? 'visible' : 'hidden',
                    marginBottom: '4px'
                }}>
                    <Text type="danger" strong>
                        {t("The API key format is incorrect")}
                    </Text>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong style={{
                        whiteSpace: 'nowrap',
                        width: '50px'  // 固定宽度，根据实际文本长度调整
                    }}>
                        {t("Quota")}
                    </Text>
                    <Input
                        ref={countRef}
                        placeholder={t("Please enter Quota")}
                        value={countValue}
                        onChange={handleCountChange}
                        style={{ flex: 1 }}  // 输入框占据剩余空间
                        disabled={!isEdit || loading}
                    />
                </div>
                {/* 错误提示放在下方，并且与输入框左对齐 */}
                <div style={{
                    marginLeft: '60px',  // 80px(标签宽度) + 8px(间距)
                    visibility: isEdit && countError ? 'visible' : 'hidden',
                }}>
                    <Text type="danger" strong>
                        {t('Quota must be a positive number')}
                    </Text>
                </div>
            </div>
            <Space size={[0, 8]} wrap>
                {tags.map((tag, index) => (
                    <Tag key={index}>{tag}</Tag>
                ))}
            </Space>
        </Card>
    );
});
