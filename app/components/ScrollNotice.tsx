import { ExclamationCircleOutlined } from '@ant-design/icons';
import React, { useRef } from 'react';

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
                color: '#878787',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',  // 添加省略号
                WebkitLineClamp: 1,        // 限制为单行
                WebkitBoxOrient: 'vertical',
                padding: '0 15px',         // 添加内边距防止文字贴边
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
            {text}
            {/* </div> */}
        </div>
    );
};

export default ScrollNotice; 