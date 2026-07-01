import React, { useState } from "react";
import { Button, Card, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@remix-run/react";
import ProgressBlock from "./progressBlock";
import useReport from "scripts/eventReport";
import AppSectionCard from "~/ui/components/AppSectionCard";
import { getTranslatePagePath } from "~/lib/translateNavigation";

const { Text } = Typography;

interface ProgressingCardProps {
  dataSource: any[];
  isProgressLoading: boolean;
  isMobile: boolean;
  setProgressingModalOpen: (e: boolean) => void;
  updateProgressDataSourceStatus: (taskId: number, status: number) => void;
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({
  dataSource = [],
  isProgressLoading,
  isMobile,
  setProgressingModalOpen,
  updateProgressDataSourceStatus,
}) => {
  const { t } = useTranslation();
  const { reportClick } = useReport();
  const navigate = useNavigate();
  const navigateToTranslate = () => {
    reportClick("dashboard_translate_button");
    navigate(getTranslatePagePath(), {
      state: { from: "/app", selectedLanguageCode: "" },
    });
  };

  return (
    <AppSectionCard
      title={t("transLanguageCard1.title")}
      extra={
        <Button type="primary" onClick={() => navigateToTranslate()}>
          {t("transLanguageCard1.button")}
        </Button>
      }
    >
      {isProgressLoading ? (
        <Skeleton.Button active style={{ height: "130px" }} block />
      ) : dataSource?.length !== 0 ? (
        <Card
          style={{
            border: "none",
            boxShadow: "none",
            background: "var(--app-color-surface-secondary)",
          }}
        >
          <ProgressBlock
            taskId={dataSource[0]?.taskId}
            key={dataSource[0]?.target}
            isMobile={isMobile}
            target={dataSource[0]?.target}
            status={dataSource[0]?.status}
            translateStatus={dataSource[0]?.translateStatus}
            initialCount={dataSource[0]?.initialCount}
            progressData={dataSource[0]?.progressData}
            value={dataSource[0]?.value}
            module={dataSource[0]?.module}
            updateProgressDataSourceStatus={updateProgressDataSourceStatus}
          />
        </Card>
      ) : (
        <Card
          style={{
            border: "none",
            boxShadow: "none",
            background: "var(--app-color-surface-secondary)",
          }}
          styles={{ body: { padding: "16px" } }}
        >
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
    </AppSectionCard>
  );
};

export default ProgressingCard;
