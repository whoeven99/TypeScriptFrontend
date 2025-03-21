import { Button, Card } from "antd";
import { Typography } from "antd";
import AnimatedText from "./animatedText";
import { useTranslation } from "react-i18next";
import { openaiLogoBase64 } from '~/constants/images';

const { Text } = Typography;

interface UserProfileCardProps {
  chars: number;
  totalChars: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  chars,
  totalChars,
}) => {
  const { t } = useTranslation();

  async function urlToBase64(url: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  return (
    <Card>
      <div className="user_profile_wrapper">
        <div className="user_profilecard_left">
          <span className="character_usage_label">
            {t("My credits:")}
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
          <div className="gpttip">
            <img
              // src="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/openai.png"
              src={"data:image/png;base64,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"}
              alt="GPT 4o"
              style={{ width: "20px", height: "auto", marginRight: "5px" }}
            />
            <Text type="secondary">{t("Powered by GPT 4o")}</Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserProfileCard;
