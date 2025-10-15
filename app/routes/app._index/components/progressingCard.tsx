import React, { useState } from "react";
import { Button, Card, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { FetcherWithComponents,useNavigate  } from "@remix-run/react";
import ProgressBlock from "./progressBlock";
import useReport from "scripts/eventReport";
const { Text, Title } = Typography;

interface ProgressingCardProps {
  dataSource: any[];
  source: string;
  stopTranslateFetcher: FetcherWithComponents<any>;
  isProgressLoading: boolean;
  isMobile: boolean;
  setProgressingModalOpen: (e: boolean) => void;
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({
  dataSource = [],
  source = "",
  stopTranslateFetcher,
  isProgressLoading,
  isMobile,
  setProgressingModalOpen,
}) => {
  const { t } = useTranslation();
  const {reportClick} = useReport();
  const navigate = useNavigate();
  const navigateToTranslate = () => {
    reportClick("dashboard_translate_button");
    navigate("/app/translate", {
      state: { from: "/app", selectedLanguageCode: "" },
    });
  };
  return (
    <Card
      style={{ width: "100%" }}
      styles={{ body: { width: "100%",padding: "12px 24px", } }}
    >
      <Flex
        justify="space-between"
        align="center"
        style={{ marginBottom: "10px" }}
      >
        <Title level={4} style={{ fontWeight: 600 }}>
          {t("transLanguageCard1.title")}
        </Title>
        {isProgressLoading ? (
          <Skeleton.Button active />
        ) : (
          <Button type="primary" onClick={() => navigateToTranslate()}>
            {t("transLanguageCard1.button")}
          </Button>
        )}
      </Flex>
      {isProgressLoading ? (
        <Skeleton.Button active style={{ height: "130px" }} block />
      ) : dataSource?.length !== 0 ? (
        <Card>
          <ProgressBlock
            key={dataSource[0]?.target}
            isMobile={isMobile}
            source={source}
            target={dataSource[0]?.target}
            status={dataSource[0]?.status}
            translateStatus={dataSource[0]?.translateStatus}
            progressData={dataSource[0]?.progressData}
            value={dataSource[0]?.value}
            module={dataSource[0]?.module}
            stopTranslateFetcher={stopTranslateFetcher}
          />
        </Card>
      ) : (
        <Card>
          <Text
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "52px",
            }}
          >
            {t("progressing.noTranslate")}
          </Text>
        </Card>
      )}
      <Flex
        justify="left"
        style={{
          display: dataSource.length > 1 ? "flex" : "none",
          marginTop: "8px",
        }}
      >
        <Text>
          {t("{{count}} languages in progress — ", {
            count: dataSource.length,
          })}
        </Text>
        <Button
          type="link"
          onClick={() => setProgressingModalOpen(true)}
          size="small"
        >
          {t("see all tasks")}
        </Button>
      </Flex>
    </Card>
  );
};

export default ProgressingCard;
