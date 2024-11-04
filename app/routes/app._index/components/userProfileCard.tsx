import { Avatar, Button, Card } from "antd";
import { Typography } from "antd";

const { Text } = Typography;

interface UserProfileCardProps {
  plan: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ plan }) => {
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
            <div className="plan_action">
              <Button>Free Words</Button>
              <Button type="primary">Upgrade</Button>
            </div>
          </div>
        </div>
        <div className="user_profilecard_right">
          <span className="character_usage_label">Character Usage: </span>
          <div className="characters_statistical">
            <Text strong style={{ fontSize: "28px", lineHeight: "28px" }}>
              5
            </Text>
            <Text type="secondary" style={{ fontSize: "20px" }}>
              / 8000
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserProfileCard;
