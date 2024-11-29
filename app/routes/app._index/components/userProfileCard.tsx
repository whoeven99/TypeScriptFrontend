import { Avatar, Button, Card } from "antd";
import { Typography } from "antd";

const { Text } = Typography;

interface UserProfileCardProps {
  plan: string;
  chars: number;
  totalChars: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
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
          <img
            src="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/openai-min.png"
            alt="GPT 4o"
          />
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/openai-min.png"
          />
          <Text type="secondary">Powered by GPT 4o</Text>
        </div>
      </div>
    </Card>
  );
};

export default UserProfileCard;
