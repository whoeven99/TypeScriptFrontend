import { Avatar, Button, Card } from "antd";
import { Typography } from "antd";

const { Text } = Typography;

interface UserProfileCardProps {
  setPaymentModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  plan: string;
  chars: number;
  totalChars: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  setPaymentModalVisible,
  plan,
  chars,
  totalChars,
}) => {
  return (
    <Card>
      <div className="user_profile_wrapper">
        <div className="user_profilecard_left">
          {plan ? (
            <span className="character_usage_label">
              One-time character credits:
            </span>
          ) : (
            <span className="character_usage_label">
              Character credits/month:
            </span>
          )}
          <div className="characters_statistical">
            <Text strong style={{ fontSize: "28px", lineHeight: "28px" }}>
              {Intl.NumberFormat().format(chars)}
            </Text>
            <Text type="secondary" style={{ fontSize: "20px" }}>
              / {Intl.NumberFormat().format(totalChars)}
            </Text>
          </div>
        </div>
        <div className="user_profilecard_right">
          <Button type="primary" onClick={() => setPaymentModalVisible(true)} />
        </div>
      </div>
    </Card>
  );
};

export default UserProfileCard;
