import React, { useState } from "react";
import { Button, Card, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { FetcherWithComponents } from "@remix-run/react";
import ProgressBlock from "./progressBlock";
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

  return (
    <Card style={{ width: "100%" }} styles={{ body: { width: "100%" } }}>
      <Title
        level={4}
        // style={{ margin: 0 }}
      >
        {t("progressing.title")}
      </Title>
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
