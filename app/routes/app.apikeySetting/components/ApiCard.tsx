import React, { useState } from 'react';
import { Card, Text, Button, InlineGrid, Box, Checkbox } from '@shopify/polaris';
import {Skeleton} from 'antd'
import { useTranslation } from "react-i18next";

interface ApiCardProps {
  title: string;
  apiStatus: boolean;
  limit: string;
  onConfigure?: () => void;
  onTestApi?:()=>void;
  isLoading:boolean
}

export default function ApiCard({ title, apiStatus, limit, onConfigure,onTestApi,isLoading }: ApiCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <Box padding="400">
        <InlineGrid columns="1fr auto" alignItems="center">
          <Text variant="headingSm" as="h3">
            {title}
          </Text>
          {/* <Checkbox
            label=""
            checked={enabled}
            onChange={handleToggle}
          /> */}
        </InlineGrid>

        <Box paddingBlockStart="200">
          {isLoading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <>
              <Text as="p" variant="bodyMd">
                {t('openai.as')}
                <Text as="span" tone={apiStatus ? 'success' : 'critical'}>
                  {apiStatus ? t('openai.Effective') : t('openai.ne')}
                </Text>
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {t('openai.Amount')}{limit}
              </Text> 
            </>
          )}
        </Box>

        <Box paddingBlockStart="300">
          <Button onClick={onConfigure}>{t('openai.Configuration')}</Button>
        </Box>
        <Box paddingBlockStart="300">
          <Button onClick={onTestApi}>{t('openai.tit')}</Button>
        </Box>
      </Box>
    </Card>
  );
}
