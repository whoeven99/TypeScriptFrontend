import React, { useState } from 'react';
import { Modal, Rate, Input, Form, message } from 'antd';
import { useTranslation } from 'react-i18next';

interface PreviewModalProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ visible, setVisible }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [count, setCount] = useState(5);

    const handleSubmit = async () => {
        if (count === 5) {
            // 5星评价时跳转到Shopify应用商店
            window.open('https://apps.shopify.com/translator-by-ciwi?locale=zh-CN', '_blank');
            setVisible(false);
            message.success(t('rating.thankYou'));
        }
    };

    const desc = [
        t('rating.terrible'),
        t('rating.bad'),
        t('rating.normal'),
        t('rating.good'),
        t('rating.excellent')
    ];

    return (
        <Modal
            title={t('rating.title')}
            open={visible}
            onCancel={() => setVisible(false)}
            onOk={handleSubmit}
            confirmLoading={loading}
            okText={t('rating.submit')}
            cancelText={t('rating.cancel')}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="rating"
                    label={t('rating.rateLabel')}
                    rules={[{ required: true, message: t('rating.rateRequired') }]}
                >
                    <Rate tooltips={desc} count={count} defaultValue={5} onChange={(value) => setCount(value)} />
                </Form.Item>
                <Form.Item
                    name="feedback"
                    label={t('rating.feedbackLabel')}
                    rules={[{ required: true, message: t('rating.feedbackRequired') }]}
                >
                    <Input.TextArea
                        rows={4}
                        placeholder={t('rating.feedbackPlaceholder')}
                        maxLength={500}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default PreviewModal;
