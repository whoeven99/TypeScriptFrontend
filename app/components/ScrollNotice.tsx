import React, { useRef } from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface ScrollNoticeProps {
    text: string;
    speed?: number;  // 滚动速度，默认值 50
    height?: number; // 容器高度，默认值 40
    backgroundColor?: string; // 背景色
    className?: string;
}

const ScrollNotice: React.FC<ScrollNoticeProps> = ({
    text,
    speed = 50,
    height = 40,
    backgroundColor = '#EFEFEF',
    className
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    // const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            ref={containerRef}
            style={{
                height: `${height}px`,
                lineHeight: `${height}px`,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor,
                width: '100%',
                display: 'flex',
                borderRadius: '5px',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '10px',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',  // 添加省略号
                WebkitLineClamp: 1,        // 限制为单行
                WebkitBoxOrient: 'vertical',
            }}
            className={className}
        // onMouseEnter={() => setIsHovered(true)}
        // onMouseLeave={() => setIsHovered(false)}
        >
            {/* <div
                ref={contentRef}
                style={{
                    whiteSpace: 'nowrap',
                    position: 'absolute',
                    left: '10px',
                }}
            > */}
            <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', color: '#878787' }}>{text}</Text>
            {/* </div> */}
        </div>
    );
};

export default ScrollNotice; 