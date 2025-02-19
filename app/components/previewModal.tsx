import React, { useEffect, useState } from 'react';
import { Modal, Rate, Input, Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFetcher } from '@remix-run/react';

interface PreviewModalProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ visible, setVisible }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [count, setCount] = useState(0);
    const [mounted, setMounted] = useState(false);
    const fetcher = useFetcher<any>();

    // 确保组件只在客户端渲染
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async () => {
        if (count === 5) {
            const formData = new FormData();
            formData.append("rate", JSON.stringify(count));
            // 5星评价时跳转到Shopify应用商店
            fetcher.submit(
                formData,
                { method: 'post', action: '/app' },
            );
        }
        setVisible(false);
    };

    if (!mounted) {
        return null;
    }

    return (
        <Modal
            title={t('rating.title')}
            open={visible}
            onCancel={() => setVisible(false)}
            onOk={handleSubmit}
            okText={t('OK')}
            cancelText={t('Cancel')}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="rating"
                    label={t('rating.description')}
                >
                    <Rate value={count} onChange={(value) => setCount(value)} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default PreviewModal;
