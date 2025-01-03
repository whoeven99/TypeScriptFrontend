import { useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import { Typography } from "antd";

const { Text } = Typography;

interface AnimatedTextProps {
  totalChars: number;
}

const AnimatedText = ({ totalChars }: AnimatedTextProps) => {
  const [prevChars, setPrevChars] = useState<number>(0);

  // 使用 react-spring 的 useSpring 来制作数值动画
  const props = useSpring({
    number: prevChars,
    to: { number: totalChars },
    config: {
      mass: 1,
      friction: 100,
      tension: 300,
    },
    onRest: () => setPrevChars(totalChars), // 动画完成后更新前一个值
  });

  return (
    <animated.div style={{ display: "inline-block" }}>
      <Text type="secondary" style={{ fontSize: "20px" }}>
        {/* 使用 animated.span 来包装插值 */}
        <animated.span>
          {props.number.to((n: number) => n.toFixed(0))}
        </animated.span>
      </Text>
    </animated.div>
  );
};

export default AnimatedText;
