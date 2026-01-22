import { Icon } from "@shopify/polaris";
import { Affix, Button, Skeleton, Typography } from "antd";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

interface TranslateAffixProps {
  loading: boolean;
  languageData: LanguagesDataType[];
  selectedLanguageCode: string[];
  translateFetcher: any;
  handleNavigateBack: () => void;
  checkIfNeedPay: () => void;
}

const TranslateAffix = ({
  loading,
  languageData,
  selectedLanguageCode,
  translateFetcher,
  handleNavigateBack,
  checkIfNeedPay,
}: TranslateAffixProps) => {
  const { t } = useTranslation();

  return (
    <Affix offsetTop={0}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
          backgroundColor: "rgb(241, 241, 241)",
          padding: "16px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            type="text"
            variant="outlined"
            onClick={handleNavigateBack}
            style={{ padding: "4px" }}
          >
            <Icon source={ArrowLeftIcon} tone="base" />
          </Button>
          <Title
            style={{
              margin: "0",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            {t("Translate Store")}
          </Title>
        </div>
        {loading ? (
          <Skeleton.Button active />
        ) : (
          <Button
            type="primary"
            onClick={() => checkIfNeedPay()}
            style={{
              visibility: languageData.length != 0 ? "visible" : "hidden",
            }}
            loading={translateFetcher.state === "submitting"}
          >
            {selectedLanguageCode.length > 0 &&
              selectedLanguageCode.every(
                (item: string) =>
                  languageData.find((lang: any) => lang?.locale === item)
                    ?.status === 1,
              )
              ? t("Update")
              : t("Translate")}
          </Button>
        )}
      </div>
    </Affix>
  );
};

export default TranslateAffix;
