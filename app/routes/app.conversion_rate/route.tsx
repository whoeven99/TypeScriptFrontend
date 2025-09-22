import {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  Select,
  Text,
  InlineStack,
  Page,
  Layout,
  Grid,
  Popover,
  Button,
  BlockStack,
  InlineGrid,
  Icon,
  Box,
} from "@shopify/polaris";
import {
  Flex,
  Row,
  Skeleton,
  Typography,
  Button as AntButton,
  Divider,
} from "antd";
import {
  LayoutColumn1Icon,
  LayoutColumns2Icon,
  LayoutColumns3Icon,
  ChartVerticalFilledIcon,
  ArrowLeftIcon,
} from "@shopify/polaris-icons";
import ScrollNotice from "~/components/ScrollNotice";
import { authenticate } from "../../shopify.server";
import dynamic from "next/dynamic";
// import {  BarChart } from "@shopify/polaris-viz";
import "@shopify/polaris-viz/build/esm/styles.css";
import PolarisDateFilter from "./components/PolarisDateFilter";
import { useFetcher } from "@remix-run/react";
import { GetConversionData, GetStoreLanguage } from "../../api/JavaServer";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";
const { Title } = Typography;
// import { useNavigate } from "react-router";
const LineChart = dynamic(
  () => import("@shopify/polaris-viz").then((mod) => mod.LineChart),
  {
    ssr: false,
  },
);
const BarChart = dynamic(
  () => import("@shopify/polaris-viz").then((mod) => mod.BarChart),
  {
    ssr: false,
  },
);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  return json({ shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const { admin } = adminAuthResult;
  console.log("conversion rate action", shop);

  try {
    const formData = await request.formData();
    const polarisVizFetcher = JSON.parse(
      formData.get("polarisVizFetcher") as string,
    );
    const LanguageFetcher = JSON.parse(
      formData.get("LanguageFetcher") as string,
    );
    if (polarisVizFetcher) {
      try {
        const mutationResponse = await admin.graphql(
          `query MyQuery {
            shopLocales(published: true) {
              locale
              name
              primary
              published
            }
          }`,
        );
        const data = (await mutationResponse.json()) as any;
        let storeLanguage = [] as string[];
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            storeLanguage.push(item.locale);
          });
        }
        console.log("storeLanguage: ", storeLanguage);
        const updatedStoreLanguage = storeLanguage.map((lang) =>
          lang === "zh-CN" ? "zh-hans" : lang,
        );
        const { days } = polarisVizFetcher;
        console.log("coversion fetcher: ", polarisVizFetcher);
        console.log("updated store language: ", updatedStoreLanguage);

        const response = await GetConversionData({
          shop,
          storeLanguage: updatedStoreLanguage,
          dayData: days,
        });
        return response;
      } catch (error) {
        console.log("get polarisViz data failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    if (LanguageFetcher) {
      try {
        const mutationResponse = await admin.graphql(
          `query MyQuery {
            shopLocales(published: true) {
              locale
              name
              primary
              published
            }
          }`,
        );
        const data = (await mutationResponse.json()) as any;
        let source = "en";
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            if (item.primary === true) {
              source = item.locale;
            }
          });
        }
        // const { languages, days } = LanguageFetcher;
        const response = await GetStoreLanguage({
          shop,
          source,
        });
        return response;
      } catch (error) {
        console.log("get polarisViz data failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    return json({ success: false, message: "conersion action Invalid data" });
  } catch (error) {
    console.error("Error action conversion route:", error);
    return json({ error: "Error action app" }, { status: 500 });
  }
};

const Index = () => {
  const { report } = useReport();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [gridColumns, setGridColumns] = useState<number>(2); // 默认 2 列
  const polarisVizDataFetcher = useFetcher<any>();
  const storeLanguageFetcher = useFetcher<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilterCondition, setCondition] = useState("last7");
  const [chartData, setChartData] = useState<any>([]);
  const [filteredChartData, setFilteredChartData] = useState<any>([]);

  const SkeletonGrid = ["1", "2", "3"];
  const getLast24HoursRange = (): { start: Date; end: Date } => {
    const end = new Date(); // 现在
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // 一个星期前
    return { start, end };
  };
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
  }>(getLast24HoursRange());

  const handleSwitcherTime = (column: number) => {
    setGridColumns(column);
  };
  const generateDateRange = (start: Date, end: Date) => {
    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      const label = `${current.getMonth() + 1}月${current.getDate()}日`;
      dates.push(label);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };
  const clickReportDate = (day: number) => {
    report(
      { day: day },
      {
        action: "/app", // 默认 action 路径
        method: "post",
        eventType: "click",
      },
      "conversion_rate_filter_date",
    );
  };
  const clickReportGridColumns = (column: number) => {
    report(
      { gridColumns: column },
      {
        action: "/app", // 默认 action 路径
        method: "post",
        eventType: "click",
      },
      "conversion_rate_gridColumns",
    );
  };
  useEffect(() => {
    if (chartData.length === 0) return;

    const allDates = generateDateRange(selectedDates.start, selectedDates.end);

    const filled = chartData.map((chart: any) => {
      return {
        ...chart,
        data: chart.data.map((series: any) => {
          // 建立一个 key -> value 的 Map
          const valueMap = new Map(
            series.data.map((item: any) => [item.key, item.value]),
          );

          // 重新按完整日期数组生成数据
          const alignedData = allDates.map((date) => ({
            key: date,
            value: valueMap.get(date) ?? 0, // 没数据就补 0
          }));

          return {
            ...series,
            data: alignedData,
            name: `${formatDate(selectedDates.start)} ~ ${formatDate(selectedDates.end)}`,
          };
        }),
      };
    });
    console.log("filled data: ", filled);

    setFilteredChartData(filled);
  }, [selectedDates, chartData]);
  const formatDate = (date: Date) => {
    // if (!isClient) {
    //   return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    // }
    return date.toLocaleDateString();
  };

  const setPreset = (type: string) => {
    setCondition(type);
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    console.log(today.getDate());

    if (type === "yesterday") {
      start.setDate(today.getDate() - 1);
      end = new Date(start);
    } else if (type === "last7") {
      start.setDate(today.getDate() - 6);
    } else if (type === "last30") {
      start.setDate(today.getDate() - 29);
    }

    // 归零到当天 00:00:00
    start.setHours(0, 0, 0, 0);
    // 设置到当天 23:59:59
    end.setHours(23, 59, 59, 999);

    setSelectedDates({ start, end });
  };

  // useEffect(() => {

  // }, []);

  useEffect(() => {
    const formData = new FormData();
    formData.append("LanguageFetcher", JSON.stringify({}));
    storeLanguageFetcher.submit(formData, {
      method: "post",
      action: "/app/conversion_rate",
    });
  }, []);

  useEffect(() => {
    if (storeLanguageFetcher.data) {
      console.log(storeLanguageFetcher.data);
      if (storeLanguageFetcher.data?.success) {
        const formData = new FormData();
        formData.append("polarisVizFetcher", JSON.stringify({ days: 30 }));
        polarisVizDataFetcher.submit(formData, {
          method: "post",
          action: "/app/conversion_rate",
        });
      }
    }
  }, [storeLanguageFetcher.data]);

  // function transformData(raw: any) {
  //   const languageMap: Record<string, string> = {
  //     en: "English",
  //     ja: "日本語",
  //     zh: "简体中文",
  //     fr: "Français",
  //     de: "Deutsch",
  //     es: "Español",
  //   };

  //   function formatDateToChinese(dateStr: string) {
  //     const date = new Date(dateStr);
  //     if (isNaN(date.getTime())) return dateStr;
  //     return `${date.getMonth() + 1}月${date.getDate()}日`;
  //   }

  //   function getDateRangeName(dates: string[]) {
  //     if (!dates || dates.length === 0) return "未知日期范围";
  //     if (dates.length === 1) return `2025年${formatDateToChinese(dates[0])}`;
  //     return `2025年${formatDateToChinese(dates[0])}-${formatDateToChinese(
  //       dates[dates.length - 1],
  //     )}`;
  //   }

  //   const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});

  //   return Object.entries(parsed).map(([lang, dates]) => {
  //     const language = languageMap[lang] || lang;

  //     const sortedDates = Object.keys(dates as any).sort();
  //     const dateRangeName = getDateRangeName(sortedDates);

  //     const dateData = sortedDates.map((dateStr) => {
  //       const events = (dates as any)[dateStr];
  //       const value = Object.values(events).reduce(
  //         (sum: any, v) => sum + (Number(v) || 0),
  //         0,
  //       );
  //       return { key: formatDateToChinese(dateStr), value };
  //     });

  //     return {
  //       language,
  //       data: [
  //         {
  //           name: dateRangeName,
  //           data: dateData,
  //         },
  //       ],
  //     };
  //   });
  // }

  function transformData(raw: any) {
    const languageMap: Record<string, string> = {
      en: "English",
      ja: "日本語",
      "zh-hans": "简体中文",
      "zh-TW": "繁體中文",
      fr: "Français",
      de: "Deutsch",
      es: "Español",
      pt: "Português (Portugal)",
      "pt-BR": "Português (Brasil)",
      it: "Italiano",
      nl: "Nederlands",
      sv: "Svenska",
      da: "Dansk",
      no: "Norsk (Bokmål)",
      nn: "Norsk (Nynorsk)",
      fi: "Suomi",
      ko: "한국어",
      th: "ภาษาไทย",
      tr: "Türkçe",
      pl: "Polski",
      ru: "Русский",
      cs: "Čeština",
      hu: "Magyar",
      ro: "Română",
      el: "Ελληνικά",
      vi: "Tiếng Việt",
      ar: "العربية",
      he: "עברית",
      id: "Bahasa Indonesia",
      ms: "Bahasa Melayu",
      hi: "हिन्दी",
      bn: "বাংলা",
      ta: "தமிழ்",
      tl: "Filipino",
      bg: "Български",
      uk: "Українська",
      hr: "Hrvatski",
      sk: "Slovenčina",
      sl: "Slovenščina",
      et: "Eesti",
      lv: "Latviešu",
      lt: "Lietuvių",
      sr: "Српски",
      "sr-Latn": "Srpski",
      nb: "Norsk Bokmål",
      se: "Davvisámegiella (Northern Sami)",
    };

    function formatDateToChinese(dateStr: string) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    function getDateRangeName(dates: string[]) {
      if (!dates || dates.length === 0) return "未知日期范围";
      if (dates.length === 1) return `2025年${formatDateToChinese(dates[0])}`;
      return `2025年${formatDateToChinese(dates[0])}-${formatDateToChinese(
        dates[dates.length - 1],
      )}`;
    }

    const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});

    return Object.entries(parsed).map(([lang, dates]) => {
      const language = languageMap[lang] || lang;

      const sortedDates = Object.keys(dates as any).sort();
      const dateRangeName = getDateRangeName(sortedDates);

      const dateData = sortedDates.map((dateStr) => {
        const events = (dates as any)[dateStr] || {};
        const exposure = Number(events.page_viewed || 0);
        const clicks = Number(events.product_added_to_cart || 0);

        // 转换率（百分比）
        const conversionRate = exposure > 0 ? (clicks / exposure) * 100 : 0;

        return { key: formatDateToChinese(dateStr), value: conversionRate };
      });

      return {
        language,
        data: [
          {
            name: dateRangeName,
            data: dateData,
          },
        ],
      };
    });
  }

  useEffect(() => {
    if (polarisVizDataFetcher.data) {
      console.log(polarisVizDataFetcher.data);

      if (polarisVizDataFetcher.data.response) {
        setChartData(transformData(polarisVizDataFetcher.data.response));
        setFilteredChartData(
          transformData(polarisVizDataFetcher.data.response),
        );
      }
      console.log(transformData(polarisVizDataFetcher.data.response));

      setIsLoading(false);
    }
  }, [polarisVizDataFetcher.data]);
  return (
    <Page>
      {/* 筛选器 */}
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <AntButton
          type="text"
          variant="outlined"
          onClick={() => navigate("/app")}
          style={{ padding: "4px" }}
        >
          <Icon source={ArrowLeftIcon} tone="base" />
        </AntButton>
        <Title
          style={{
            margin: "0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}
        >
          商店数据预览
        </Title>
      </div>
      <Divider style={{ margin: "25px 0" }} />
      <BlockStack>
        <Card>
          <Flex
            justify="space-between"
            align="center"
            style={{ width: "100%" }}
          >
            <InlineStack gap="200" align="center">
              <Button
                variant={
                  currentFilterCondition === "yesterday"
                    ? "primary"
                    : "secondary"
                }
                onClick={() => {
                  setPreset("yesterday");
                  clickReportDate(1);
                }}
              >
                昨天
              </Button>
              <Button
                variant={
                  currentFilterCondition === "last7" ? "primary" : "secondary"
                }
                onClick={() => {
                  setPreset("last7"), clickReportDate(7);
                }}
              >
                过去 7 天
              </Button>
              <Button
                variant={
                  currentFilterCondition === "last30" ? "primary" : "secondary"
                }
                onClick={() => {
                  setPreset("last30");
                  clickReportDate(30);
                }}
              >
                过去 30 天
              </Button>
            </InlineStack>
            <InlineStack gap="150">
              <Button
                variant={gridColumns === 1 ? "primary" : "secondary"}
                onClick={() => {
                  handleSwitcherTime(1);
                  clickReportGridColumns(1);
                }}
                icon={LayoutColumn1Icon}
              />
              <Button
                variant={gridColumns === 2 ? "primary" : "secondary"}
                onClick={() => {
                  handleSwitcherTime(2);
                  clickReportGridColumns(2);
                }}
                icon={LayoutColumns2Icon}
              />
              {/* <Button
                variant={gridColumns === 3 ? "primary" : "secondary"}
                onClick={() => {
                  if (currentFilterCondition === "last30") {
                    return;
                  }
                  handleSwitcherTime(3);
                  clickReportGridColumns(3);
                }}
                icon={LayoutColumns3Icon}
              /> */}
            </InlineStack>
          </Flex>
        </Card>
      </BlockStack>
      <div style={{ height: "20px" }}></div>
      <Layout>
        <Layout.Section>
          <InlineGrid gap="400" columns={gridColumns}>
            {isLoading ? (
              SkeletonGrid.map((item: any, index: number) => {
                return (
                  <Card key={index}>
                    <Skeleton active paragraph={{ rows: 1 }} />
                    <Skeleton.Input
                      block
                      active
                      style={{ width: "100%", height: 200, borderRadius: 8 }}
                    />
                  </Card>
                );
              })
            ) : filteredChartData.length > 0 ? (
              filteredChartData.map((chart: any, index: number) => (
                <Card key={index}>
                  <Text as="h3" variant="headingSm">
                    {chart.language}
                  </Text>
                  <div
                    style={{ height: 300, minWidth: 400, marginTop: "16px" }}
                  >
                    {chart.data && chart.data.length > 0 ? (
                      <LineChart
                        theme="Light"
                        data={chart.data}
                        xAxisOptions={{ labelFormatter: (v: any) => v }}
                        yAxisOptions={{
                          labelFormatter: (v: any) =>
                            `${Math.max(0, Number(v)).toFixed(1)}%`,
                        }}
                      />
                    ) : (
                      <Text as="p">无数据可显示</Text>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card>
                <Text as="p">无图表数据</Text>
              </Card>
            )}
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Index;
