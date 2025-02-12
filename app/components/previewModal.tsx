import React, { useState } from 'react';
import { Modal, Rate, Input, Form, message } from 'antd';
import { useTranslation } from 'react-i18next';

interface RatingFormProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
}

const RatingForm: React.FC<RatingFormProps> = ({ visible, setVisible }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // const handleSubmit = async () => {
    //     try {
    //         setLoading(true);
    //         const values = await form.validateFields();
    //         await onSubmit(values.rating, values.feedback);
    //         message.success(t('rating.submitSuccess'));
    //         form.resetFields();
    //         onClose();
    //     } catch (error) {
    //         message.error(t('rating.submitError'));
    //     } finally {
    //         setLoading(false);
    //     }
    // };

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
            // onOk={handleSubmit}
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
                    <Rate tooltips={desc} />
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

export default RatingForm;
