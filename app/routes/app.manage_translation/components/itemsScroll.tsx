import { Spin, Typography } from "antd";
import React, { useState } from "react";
import "../styles.css";

const { Text } = Typography;

export interface MenuItem {
    key: string;
    label: string;
}

interface ItemsScrollProps {
    menuData: MenuItem[] | undefined;
    setSelectItem: (item: string) => void;
    selectItem: string | undefined;
}

const ItemsScroll: React.FC<ItemsScrollProps> = ({ menuData = undefined, setSelectItem, selectItem }) => {
    const [activeKey, setActiveKey] = useState<string | null>(selectItem || null);

    if (!menuData) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin /></div>;
    }

    return (
        <>
            {menuData.map((item) => (
                <div
                    className={`items-scroll-item ${activeKey === item?.key ? 'selected' : ''}`}
                    key={item?.key}
                    onClick={() => {
                        setSelectItem(item?.key);
                        setActiveKey(item?.key);
                    }}
                >
                    {/* <Text
                        style={{
                            width: '100%',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'normal',
                            lineHeight: '1.5',
                            maxHeight: '3em', // 2行 * 1.5em
                        }}
                    > */}
                    {"item?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.labelitem?.label"}
                    {/* </Text> */}
                </div>
            ))}
        </>
    );
};

export default ItemsScroll;

