import React, { useState, useCallback } from "react";
import { Card, DatePicker, Button, InlineStack, Text } from "@shopify/polaris";

const PolarisDateFilter = ({ handleCancel, onChange }: any) => {
  const [{ month, year }, setDate] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
  }>({
    start: new Date(),
    end: new Date(),
  });

  // 切换月份
  const handleMonthChange = useCallback(
    (month: number, year: number) => setDate({ month, year }),
    [],
  );

  // 预设日期（今天、昨天、过去 7 天...）
  const setPreset = (type: string) => {
    const today = new Date();
    let start = today;
    let end = today;

    if (type === "yesterday") {
      start = new Date(today);
      start.setDate(today.getDate() - 1);
      end = start;
    } else if (type === "last7") {
      start = new Date(today);
      start.setDate(today.getDate() - 6);
      end = today;
    } else if (type === "last30") {
      start = new Date(today);
      start.setDate(today.getDate() - 29);
      end = today;
    }

    setSelectedDates({ start, end });
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 设置时间为 00:00:00，避免时间戳问题
  return (
    <InlineStack gap="200" align="center">
      <Button onClick={() => setPreset("yesterday")}>昨天</Button>
      <Button onClick={() => setPreset("last7")}>过去 7 天</Button>
      <Button onClick={() => setPreset("last30")}>过去 30 天</Button>
    </InlineStack>
    // <Card>
    //   <InlineStack direction="row" align="start" gap="400">

    //     <div style={{ marginTop: 16 }}>
    //       <DatePicker
    //         month={month}
    //         year={year}
    //         onChange={(dates) => {
    //           setSelectedDates(dates);
    //           if (onChange) onChange(dates); // 触发父组件的 onChange 回调
    //         }}
    //         onMonthChange={handleMonthChange}
    //         selected={selectedDates}
    //         allowRange
    //         disableDatesAfter={today} // 限制选择今天之后的日期
    //       />
    //     </div>
    //   </InlineStack>
    //   <div style={{ marginTop: 16, marginBottom: 16 }}>
    //     <Text as="span" variant="bodyMd">
    //       已选范围: {selectedDates.start.toDateString()} -{" "}
    //       {selectedDates.end.toDateString()}
    //     </Text>
    //   </div>
    //   <InlineStack direction="row" align="end" gap="050">
    //     <Button onClick={handleCancel}>取消</Button>
    //     <Button variant="primary">应用</Button>
    //   </InlineStack>
    // </Card>
  );
};

export default PolarisDateFilter;
