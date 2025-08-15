import React, { useState } from 'react';
import { Card, Text, Button, InlineGrid, Box, Checkbox } from '@shopify/polaris';
import {Skeleton} from 'antd'
interface ApiCardProps {
  title: string;
  apiStatus: boolean;
  limit: string;
  onConfigure?: () => void;
  onTestApi?:()=>void;
  isLoading:boolean
}

export default function ApiCard({ title, apiStatus, limit, onConfigure,onTestApi,isLoading }: ApiCardProps) {
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
                API 状态：
                <Text as="span" tone={apiStatus ? 'success' : 'critical'}>
                  {apiStatus ? '已生效' : '未启用'}
                </Text>
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                额度：{limit}
              </Text> 
            </>
          )}
        </Box>

        <Box paddingBlockStart="300">
          <Button onClick={onConfigure}>配置</Button>
        </Box>
        <Box paddingBlockStart="300">
          <Button onClick={onTestApi}>测试接口</Button>
        </Box>
      </Box>
    </Card>
  );
}
