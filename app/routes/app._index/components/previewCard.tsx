import React, { useEffect, useState } from 'react';
import { Card, Rate, Input, Form, message, Typography, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFetcher } from '@remix-run/react';
import { CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PreviewCardProps {
}

const PreviewCard: React.FC<PreviewCardProps> = () => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [count, setCount] = useState(0);
    const fetcher = useFetcher<any>();

    // 确保组件只在客户端渲染
    useEffect(() => {
        const rate = localStorage.getItem("rate");
        if (rate) {
            setCount(JSON.parse(rate));
        }
        const isVisible = localStorage.getItem("isVisible");
        if (!isVisible) {
            setIsVisible(true);
        }
    }, []);

    const handleRate = async (value: number) => {
        localStorage.setItem("rate", JSON.stringify(value));
        const formData = new FormData();
        formData.append("rate", JSON.stringify(value));
        // 5星评价时跳转到Shopify应用商店
        fetcher.submit(
            formData,
            { method: 'post', action: '/app' },
        );
        if (value === 5) {
            window.open("https://apps.shopify.com/translator-by-ciwi", "_blank");
        }
    };

    const handleClose = () => {
        localStorage.setItem("isVisible", JSON.stringify(false));
        setIsVisible(false);
    };

    return (
        <Card
            style={{ display: isVisible ? 'block' : 'none' }}
            extra={
                <Button type="text" onClick={handleClose}>
                    <CloseOutlined />
                </Button>
            }
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Text>{t('rating.description')}</Text>
                <Rate defaultValue={count} onChange={(value) => handleRate(value)} style={{ minWidth: 132 }} />
            </div>

        </Card>
    );
};

export default PreviewCard;
