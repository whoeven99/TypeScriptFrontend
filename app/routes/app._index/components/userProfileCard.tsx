import { Avatar, Card } from "antd";
import { Typography } from "antd";

const { Text } = Typography;

interface UserProfileCardProps {
  name: string;
  plan: string;
  chars: number;
  totalChars: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  name,
  plan,
  chars,
  totalChars,
}) => {
  const planName = plan === "Free" ? "Free" : "Premium";

  return (
    <Card style={{ height: "128px" }}>
      <div className="user_profile_wrapper">
        <div className="user_profilecard_left">
          <Avatar size={"large"} style={{ backgroundColor: "#f56a00" }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <div className="plan_overview">
            <span>Pricing Plan: {planName}</span>
          </div>
        </div>
        <div className="user_profilecard_right">
          {plan ? (
            <span className="character_usage_label">
              One-time Character credits:
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
      </div>
    </Card>
  );
};

export default UserProfileCard;
