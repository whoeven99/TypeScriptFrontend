import React from 'react';
import { Card, Typography, List } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReadOutlined, RightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface GuideItem {
    title: string;
    link: string;
}

const UserGuideCard: React.FC = () => {
    const { t } = useTranslation();

    const guideList: GuideItem[] = [
        {
            title: t('userGuide.feature1'),
            link: 'http://ciwi.bogdatech.com/help/frequently-asked-question/how-to-translate/'
        },
        {
            title: t('userGuide.feature2'),
            link: 'http://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-app-from-shopify-theme-customization-to-apply-the-language-currency-exchange-switcher/'
        },
        {
            title: t('userGuide.feature3'),
            link: 'https://docs.example.com/feature3'
        }
    ];

    return (
        <Card
            style={{
                height: '100%',
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}
        >
            <Text strong style={{ marginBottom: '16px' }}>
                <ReadOutlined style={{ marginRight: '8px', color: '#007F61' }} />
                {t('userGuide.title')}
            </Text>
            {/* 
            <Text
                style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#637381',
                    fontSize: '14px'
                }}
            >
                {t('userGuide.description')}
            </Text> */}

            <List
                itemLayout="horizontal"
                dataSource={guideList}
                renderItem={(item) => (
                    <List.Item
                        style={{
                            padding: '4px 0',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                        onClick={() => window.open(item.link, '_blank')}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            color: '#1890ff'
                        }}>
                            <Text style={{
                                color: '#1890ff',
                                width: 'calc(100% - 24px)', // 减去右箭头的宽度
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>{item.title}</Text>
                            <RightOutlined style={{ fontSize: '12px' }} />
                        </div>
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default UserGuideCard; 