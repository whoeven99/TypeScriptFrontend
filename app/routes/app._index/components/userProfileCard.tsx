import { Card } from "antd";
import { Typography } from "antd";
import "../styles.css";

const { Text } = Typography;

interface UserProfileCardProps {
  chars: number;
  totalChars: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
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
              /{" "}
              {totalChars >= 5000000
                ? "Unlimited"
                : Intl.NumberFormat().format(totalChars)}
            </Text>
          </div>
        </div>
        <div className="user_profilecard_right">
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
