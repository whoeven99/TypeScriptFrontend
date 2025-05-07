import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card } from 'antd';

const { Title, Text } = Typography;

const Index: React.FC = () => {
    const [loading, setLoading] = useState(false);

    const onFinish = (values: { email: string }) => {
        setLoading(true);
        setTimeout(() => {
            window.location.href = 'https://apps.shopify.com/translator-by-ciwi';
        }, 800);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f7fa' }}>
            <Card style={{ width: 500, boxShadow: '0 2px 8px #f0f1f2' }}>
                <Title level={3} style={{ textAlign: 'center' }}>邀请加入</Title>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 10 }}>
                    您被邀请加入团队，请填写您的邮箱以接受邀请并安装应用。
                </Text>
                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="邮箱地址(请使用注册shopify商店时使用的邮箱)"
                        name="email"
                        rules={[
                            { required: true, message: '请输入邮箱地址' },
                            { type: 'email', message: '请输入有效的邮箱地址' },
                        ]}
                    >
                        <Input placeholder="example@email.com" size="large" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" block size="large" loading={loading} htmlType="submit">
                            接受邀请并安装应用
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Index;
