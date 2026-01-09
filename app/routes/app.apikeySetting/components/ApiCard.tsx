import React, { useState } from 'react';
import { Card, Text, Button, InlineGrid, Box, Checkbox } from '@shopify/polaris';
import { Skeleton } from 'antd'
import { useTranslation } from "react-i18next";

interface ApiCardProps {
  title: string;
  apiStatus: boolean;
  limit: string;
  onConfigure?: () => void;
  onTestApi?: () => void;
  isLoading: boolean,
  modelVersion: string
}

export default function ApiCard({ title, apiStatus, limit, onConfigure, onTestApi, isLoading, modelVersion }: ApiCardProps) {
  const { t } = useTranslation();
  // 格式化千分位函数
  const formatNumber = (num: string) => {
    if (num === t('openai.ne')) return num; // 如果是 "N/A"，直接返回
    const [used, total] = num.split('/'); // 拆分 used/total
    const formattedUsed = parseInt(used).toLocaleString('en-US'); // 格式化 used
    const formattedTotal = parseInt(total).toLocaleString('en-US'); // 格式化 total
    return `${formattedUsed}/${formattedTotal}`; // 返回格式化结果
  };
  return (
    <Card>
      <Box padding="400">
        <Text variant="headingSm" as="h3">
          <span style={{ color: "#000000e0", fontWeight: 600, fontSize: '16px', marginBottom: "20px", lineHeight: '24px', display: 'block' }}>{title}</span>
        </Text>
        <Box paddingBlockStart="200">
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <>
              {modelVersion &&
                <Text as="p" variant="bodyMd" tone="subdued">
                  {t('openai.mv')}{modelVersion}
                </Text>
              }
              <div style={{ height: "5px" }}></div>
              <Text as="p" variant="bodyMd">
                {t('openai.as')}
                <Text as="span" tone={apiStatus ? 'success' : 'critical'}>
                  {apiStatus ? t('openai.Effective') : t('openai.ne')}
                </Text>
              </Text>
              <div style={{ height: "5px" }}></div>
              <Text as="p" variant="bodyMd" tone="subdued">
                {t('openai.Amount')}{formatNumber(limit)}
              </Text>
              {
                !modelVersion && <div style={{ height: "20px" }}></div>
              }

            </>
          )}
        </Box>

        <div style={{ display: 'flex', gap: "10px", justifyContent: 'end' }}>
          <Box paddingBlockStart="300">
            <Button variant="primary" onClick={onConfigure}>{t('openai.Configuration')}</Button>
          </Box>
          <Box paddingBlockStart="300">
            <Button onClick={onTestApi}>{t('openai.tit')}</Button>
          </Box>
        </div>
      </Box>
    </Card>
  );
}
