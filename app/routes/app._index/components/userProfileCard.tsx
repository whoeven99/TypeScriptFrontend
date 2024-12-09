import { Button, Card } from "antd";
import { Typography } from "antd";
import "../styles.css";
import AnimatedText from "./animatedText";

const { Text } = Typography;

interface UserProfileCardProps {
  setPaymentModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  chars: number;
  totalChars: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  setPaymentModalVisible,
  chars,
  totalChars,
}) => {
  return (
    <Card>
      <div className="user_profile_wrapper">
        <div className="user_profilecard_left">
          <span className="character_usage_label">
            One-time character credits:
          </span>
          <div className="characters_statistical">
            <Text strong style={{ fontSize: "28px", lineHeight: "28px" }}>
              {Intl.NumberFormat().format(chars)}
            </Text>
            <Text type="secondary" style={{ fontSize: "20px" }}>
              /
            </Text>
            <AnimatedText totalChars={totalChars} />
          </div>
        </div>
        <div className="user_profilecard_right">
          <Button type="primary" onClick={() => setPaymentModalVisible(true)} />
          <div className="gpttip">
            <img
              src="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/openai.png"
              alt="GPT 4o"
              style={{ width: "20px", height: "auto", marginRight: "5px" }}
            />
            <Text type="secondary">Powered by GPT 4o</Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserProfileCard;
