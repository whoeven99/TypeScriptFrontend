import { Button, Card, Row, Col, Typography, Badge } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Page } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import ScrollNotice from '~/components/ScrollNotice';
import UserProfileCard from './components/userProfileCard';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { useState } from 'react';
const { Title, Text, Paragraph } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
    return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
    return null;
};

export default function PricingRoute() {
    const { t } = useTranslation();

    const [paymentModalVisible, setPaymentModalVisible] = useState(false);

    //  const plans = [
    //      {
    //          title: 'Free',
    //          price: '0',
    //          subtitle: t('pricing.for_individuals'),
    //          buttonText: t('pricing.current_plan'),
    //          buttonType: 'default',
    //          disabled: true,
    //          features: [
    //              '5,000 words one time',
    //              '1 translated language',
    //              'Add 153 currencies',
    //              'Edit translation',
    //              'Customize Switcher',
    //              'Global Search',
    //              'Shopify payment integration'
    //          ]
    //      },
    //      {
    //          title: 'Basic',
    //          price: '7.99',
    //          subtitle: t('pricing.for_small_teams'),
    //          buttonText: t('pricing.try_free'),
    //          features: [
    //              '30,000 words/month',
    //              '5 translated languages',
    //              'Multilingual SEO',
    //              'Auto switch Currency',
    //              'Glossary',
    //              'Export & Import'
    //          ]
    //      },
    //      {
    //          title: 'Pro',
    //          price: '29.99',
    //          subtitle: t('pricing.for_growing'),
    //          buttonText: t('pricing.try_free'),
    //          isRecommended: true,
    //          features: [
    //              '80,000 words/month',
    //              '20 translated languages',
    //              'Auto update translation',
    //              'Auto switch Language',
    //              'Visual Editor',
    //              'Image translation'
    //          ]
    //      }
    //  ];

    return (
        <Page>
            <TitleBar title={t("Translate Store")} />
            <ScrollNotice text={t("Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.")} />
            {/* <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                 <Row gutter={[24, 24]}>
                     {plans.map((plan, index) => (
                         <Col 
                             key={plan.title} 
                             xs={24}
                             sm={24}
                             md={24}
                             lg={8}
                             style={{ display: 'flex' }}
                         >
                             <Badge.Ribbon
                                 text={t('pricing.recommended')}
                                 color="#1890ff"
                                 style={{
                                     display: plan.isRecommended ? 'block' : 'none',
                                     right: 0
                                 }}
                             >
                                 <Card
                                     hoverable
                                     style={{
                                         flex: 1,
                                         height: '100%',
                                         display: 'flex',
                                         flexDirection: 'column',
                                         position: 'relative',
                                         borderColor: plan.isRecommended ? '#1890ff' : undefined,
                                         width: "290px"
                                     }}
                                     bodyStyle={{
                                         flex: 1,
                                         display: 'flex',
                                         flexDirection: 'column'
                                     }}
                                 >
                                     <Title level={4}>{plan.title}</Title>
                                     <div style={{ margin: '16px 0' }}>
                                         <Text style={{ fontSize: '32px', fontWeight: 'bold' }}>
                                             ${plan.price}
                                         </Text>
                                         <Text style={{ fontSize: '16px' }}>/月</Text>
                                     </div>
                                     <Paragraph type="secondary">{plan.subtitle}</Paragraph>
 
                                     <Button
                                         type={plan.isRecommended ? 'primary' : 'default'}
                                         size="large"
                                         block
                                         disabled={plan.disabled}
                                         style={{ marginBottom: '24px' }}
                                     >
                                         {plan.buttonText}
                                     </Button>
 
                                     <div style={{ flex: 1 }}>
                                         {plan.features.map((feature, idx) => (
                                             <div
                                                 key={idx}
                                                 style={{
                                                     marginBottom: '12px',
                                                     display: 'flex',
                                                     alignItems: 'flex-start',
                                                     gap: '8px'
                                                 }}
                                             >
                                                 <CheckOutlined style={{ color: '#52c41a' }} />
                                                 <Text>{feature}</Text>
                                             </div>
                                         ))}
                                     </div>
                                 </Card>
                             </Badge.Ribbon>
                         </Col>
                     ))}
                 </Row>
             </div> */}
            <UserProfileCard chars={0} totalChars={0} />
        </Page>
    );
}