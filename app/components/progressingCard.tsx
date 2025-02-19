import React, { useEffect, useState } from "react";
import { Card, Progress, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { updateState } from "~/store/modules/translatingResourceType";

const { Text } = Typography;

interface ProgressingCardProps {
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [item, setItem] = useState("Products");
    const { t } = useTranslation();
    const resourceType = useSelector((state: any) => {
        return state.translatingResourceType.resourceType;
    });
    console.log(resourceType);
    const target = useSelector((state: any) =>
        state.languageTableData.rows.find(
            (item: any) => item.status === 2,
        ),
    );

    const dispatch = useDispatch();

    const RESOURCE_TYPES = [
        'PRODUCT',
        'PRODUCT_OPTION',
        'PRODUCT_OPTION_VALUE',

        'COLLECTION',

        'ONLINE_STORE_THEME',
        'ONLINE_STORE_THEME_APP_EMBED',
        'ONLINE_STORE_THEME_JSON_TEMPLATE',
        'ONLINE_STORE_THEME_SECTION_GROUP',
        'ONLINE_STORE_THEME_SETTINGS_CATEGORY',
        'ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS',

        'PACKING_SLIP_TEMPLATE',

        'SHOP_POLICY',

        'EMAIL_TEMPLATE',

        'ONLINE_STORE_THEME_LOCALE_CONTENT',

        'MENU',

        'LINK',

        'DELIVERY_METHOD_DEFINITION',

        'FILTER',

        'METAFIELD',

        'METAOBJECT',

        'PAYMENT_GATEWAY',

        'SELLING_PLAN',
        'SELLING_PLAN_GROUP',

        'SHOP',

        'ARTICLE',

        'BLOG',

        'PAGE'
    ];

    const calculateProgressByType = (resourceType: string): number => {
        switch (resourceType) {
            case 'PRODUCT':
                setItem("Products");
                return 1;
            case 'PRODUCT_OPTION':
                setItem("Products");
                return 15;
            case 'PRODUCT_OPTION_VALUE':
                setItem("Products");
                return 20;
            case 'COLLECTION':
                setItem("Collections");
                return 25;
            case 'ONLINE_STORE_THEME':
                setItem("Online Store Theme");
                return 30;
            case 'ONLINE_STORE_THEME_APP_EMBED':
                setItem("Online Store Theme");
                return 40;
            case 'ONLINE_STORE_THEME_JSON_TEMPLATE':
                setItem("Online Store Theme");
                return 42;
            case 'ONLINE_STORE_THEME_SECTION_GROUP':
                setItem("Online Store Theme");
                return 44;
            case 'ONLINE_STORE_THEME_SETTINGS_CATEGORY':
                setItem("Online Store Theme");
                return 46;
            case 'ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS':
                setItem("Online Store Theme");
                return 48;
            case 'PACKING_SLIP_TEMPLATE':
                setItem("Online Store Theme");
                return 50;
            case 'SHOP_POLICY':
                setItem("Policies");
                return 55;
            case 'EMAIL_TEMPLATE':
                setItem("Email Templates");
                return 60;
            case 'ONLINE_STORE_THEME_LOCALE_CONTENT':
                setItem("Email Templates");
                return 62;
            case 'MENU':
                setItem("Navigation");
                return 65;
            case 'LINK':
                setItem("Navigation");
                return 67;
            case 'DELIVERY_METHOD_DEFINITION':
                setItem("Delivery");
                return 70;
            case 'FILTER':
                setItem("Filters");
                return 73;
            case 'METAFIELD':
                setItem("Metafields");
                return 75;
            case 'METAOBJECT':
                setItem("Metaobjects");
                return 75;
            case 'PAYMENT_GATEWAY':
                setItem("Payment Gateways");
                return 77;
            case 'SELLING_PLAN':
                setItem("Selling Plans");
                return 80;
            case 'SELLING_PLAN_GROUP':
                setItem("Selling Plans");
                return 83;
            case 'SHOP':
                setItem("Shop");
                return 85;
            case 'ARTICLE':
                setItem("Articles");
                return 90;
            case 'BLOG':
                setItem("Blogs");
                return 95;
            case 'PAGE':
                setItem("Pages");
                return 99;
            default:
                return 0;
        }
    };


    return (
        target &&
        <Card
            title={t("progressing.title")}
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                    <Text>{t("progressing.target")}</Text>
                    <Text>{target.locale}</Text>
                </div>
                <div>
                    <Text>{t("progressing.progressing")}</Text>
                    <Text>{t(item)}</Text>
                    <Text>{t("progressing.module")}</Text>
                </div>
                <Progress
                    percent={calculateProgressByType(resourceType)}
                    status={calculateProgressByType(resourceType) === 100 ? 'success' : 'active'}
                    percentPosition={{ align: 'end', type: 'inner' }}
                    size={["100%", 20]}
                    strokeColor="#001342"
                />
            </Space>
        </Card>
    );
};

export default ProgressingCard;
