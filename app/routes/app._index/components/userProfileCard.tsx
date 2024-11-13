import { Avatar, Card } from "antd";
import { Typography } from "antd";

const { Text } = Typography;

interface UserProfileCardProps {
  plan: number;
  consumedWords: number;
  totalWords: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  plan,
  consumedWords,
  totalWords,
}) => {
  const planName = plan === 0 ? "Free" : "Premium";

  return (
    <Card style={{ height: "128px" }}>
      <div className="user_profile_wrapper">
        <div className="user_profilecard_left">
          <Avatar size={"large"} style={{ backgroundColor: "#f56a00" }}>
            K
          </Avatar>
          <div className="plan_overview">
            <span>Current Plan: {planName}</span>
          </div>
        </div>
        <div className="user_profilecard_right">
          <span className="character_usage_label">Character Usage: </span>
          <div className="characters_statistical">
            <Text strong style={{ fontSize: "28px", lineHeight: "28px" }}>
              {consumedWords}
            </Text>
            <Text type="secondary" style={{ fontSize: "20px" }}>
              / {totalWords}
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserProfileCard;
