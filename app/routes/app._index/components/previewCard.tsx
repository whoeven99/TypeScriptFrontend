import React, { useEffect, useState } from 'react';
import { Card, Rate, Input, Form, message, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFetcher } from '@remix-run/react';

const { Text } = Typography;

interface PreviewCardProps {
}

const PreviewCard: React.FC<PreviewCardProps> = () => {
    const { t } = useTranslation();
    const [count, setCount] = useState(0);
    const [mounted, setMounted] = useState(false);
    const fetcher = useFetcher<any>();

    // 确保组件只在客户端渲染
    useEffect(() => {
        const rate = localStorage.getItem("rate");
        if (rate) {
            setCount(JSON.parse(rate));
        }
        setMounted(true);
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

    if (!mounted) {
        return null;
    }

    return (
        <Card
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
