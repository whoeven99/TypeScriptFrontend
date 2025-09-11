import React, { useState } from "react";
import {
  Card,
  DataTable,
  Select,
  Text,
  InlineStack,
  Page,
  Icon,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { ChartVerticalFilledIcon } from "@shopify/polaris-icons";
import { Flex, Button } from "antd";
const Index = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("all");

  const priceData = [
    [
      "€0 - €10",
      "8月12日",
      "8月16日",
      "8月20日",
      "8月24日",
      "8月28日",
      "9月1日",
      "9月5日",
      "9月9日",
    ],
    ["8月12日-2025年9月1日", "...", "7月12日-2025年8月1日"],
  ];

  const percentageData = [
    [
      "0% - 100%",
      "8月12日",
      "8月16日",
      "8月20日",
      "8月24日",
      "8月28日",
      "9月1日",
      "9月5日",
      "9月9日",
    ],
    ["8月12日-2025年9月1日", "...", "7月12日-2025年8月1日"],
  ];

  const locationData = [
    ["United States - Iowa - Council Bluffs", "564", "53%"],
    ["Hong Kong - Kwai Tsing - Ha Kwai Chung", "6", "25%"],
  ];

  const languageOptions = [
    { label: "All Languages", value: "all" },
    { label: "English", value: "en" },
    { label: "Chinese", value: "zh" },
  ];

  return (
    <Page>
      <TitleBar>转换率</TitleBar>
      <Flex
        gap="small"
        style={{ padding: "20px 0", height: "30px" }}
        align="center"
      >
        <div style={{ maxWidth: "20px" }}>
          <Icon source={ChartVerticalFilledIcon} tone="base" />
        </div>
        <Text variant="headingMd" as="h2">
          转换率
        </Text>
      </Flex>
      <Card>
        <InlineStack>
          <Text variant="headingMd" as="h2">
            按时间显示平均订单金额
          </Text>
          <Select
            label="Language"
            options={languageOptions}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
          />
        </InlineStack>
        <DataTable
          columnContentTypes={[
            "text",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
          ]}
          headings={[
            "",
            "8月12日",
            "8月16日",
            "8月20日",
            "8月24日",
            "8月28日",
            "9月1日",
            "9月5日",
            "9月9日",
          ]}
          rows={priceData}
        />
      </Card>
      <Card>
        <InlineStack>
          <Text variant="headingMd" as="h2">
            按时间显示转化率
          </Text>
          <Select
            label="Language"
            options={languageOptions}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
          />
        </InlineStack>
        <DataTable
          columnContentTypes={[
            "text",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
          ]}
          headings={[
            "",
            "8月12日",
            "8月16日",
            "8月20日",
            "8月24日",
            "8月28日",
            "9月1日",
            "9月5日",
            "9月9日",
          ]}
          rows={percentageData}
        />
      </Card>
      <Card>
        <InlineStack>
          <Text variant="headingMd" as="h2">
            按地点显示订单
          </Text>
          <Select
            label="Language"
            options={languageOptions}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
          />
        </InlineStack>
        <DataTable
          columnContentTypes={["text", "numeric", "text"]}
          headings={["", "数量", "转化率"]}
          rows={locationData}
        />
      </Card>
    </Page>
  );
};

export default Index;
