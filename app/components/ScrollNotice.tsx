import React, { useRef } from "react";
import { Typography } from "antd";

const { Text } = Typography;

interface ScrollNoticeProps {
  text: string;
  height?: number; // 容器高度，默认值 40
  backgroundColor?: string; // 背景色
  className?: string;
}

const ScrollNotice: React.FC<ScrollNoticeProps> = ({
  text,
  height = 40,
  backgroundColor = "#EFEFEF",
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{
        height: `${height}px`,
        lineHeight: `${height}px`,
        position: "relative",
        backgroundColor,
        width: "100%",
        display: "flex",
        borderRadius: "5px",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "1px",
        WebkitBoxOrient: "vertical",
      }}
      className={className}
    >
      <Text style={{ textAlign: "center", color: "#878787" }}>{text}</Text>
    </div>
  );
};

export default ScrollNotice;
