import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Divider, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useFetcher, useNavigate } from "@remix-run/react";
import { GetProgressData, GetUserValue } from "~/api/JavaServer";
import useReport from "../../../../scripts/eventReport";
import ProgressBlock from "./progressBlock";
const { Text, Title } = Typography;

interface ProgressingCardProps {}

const ProgressingCard: React.FC<ProgressingCardProps> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const languagefetcher = useFetcher<any>();
  const stopTranslateFetcher = useFetcher<any>();

  const source = useRef<string>("");
  const timeoutIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false); // 当前轮询是否激活（可控制停止）

  const [dataSource, setDataSource] = useState<any[]>([]);
  const [status, setStatus] = useState<number>(0);
  const [translateStatus, setTranslateStatus] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showMoreItems, setShowMoreItems] = useState<boolean>(false);

  const { reportClick } = useReport();

  // === 响应窗口变化 ===
  useEffect(() => {
    isActiveRef.current = true;
    pollStatus(); // 立即执行第一次

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // === 处理 fetcher 返回结果 ===
  useEffect(() => {
    if (languagefetcher.data) {
      const data =
        languagefetcher.data?.response?.map((item: any) => {
          if (item)
            return {
              ...item,
              module: resourceTypeToModule(item?.resourceType || ""),
            };
          return item;
        }) ?? [];

      setDataSource(data);
      setLoading(false);

      const needRepoll = languagefetcher.data.response.some(
        (item: any) => item?.status === 2,
      );

      if (!needRepoll) {
        return () => {
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
          }
        };
      }

      // 若轮询仍激活，则等待3秒后继续
      if (isActiveRef.current) {
        timeoutIdRef.current = window.setTimeout(() => {
          pollStatus();
        }, 3000);
      }
    }
  }, [languagefetcher.data]);

  useEffect(() => {
    if (stopTranslateFetcher.data) {
      if (stopTranslateFetcher.data?.success) {
        setStatus(7);
        setTranslateStatus(1);
      } else {
      }
    }
  }, [stopTranslateFetcher.data]);

  // === 轮询请求函数 ===
  const pollStatus = () => {
    if (!isActiveRef.current) return;

    console.log("[poll] fetch /app at", new Date().toLocaleTimeString());

    languagefetcher.submit(
      { nearTransaltedData: JSON.stringify(true) },
      { method: "post", action: "/app" },
    );
  };

  const resourceTypeToModule = (resourceType: string) => {
    switch (true) {
      case resourceType == "SHOP" || resourceType == "SELLING_PLAN_GROUP":
        return "Shop";

      case resourceType == "PAGE":
        return "Pages";

      case resourceType == "ONLINE_STORE_THEME" ||
        resourceType == "ONLINE_STORE_THEME_LOCALE_CONTENT" ||
        resourceType == "ONLINE_STORE_THEME_JSON_TEMPLATE" ||
        resourceType == "ONLINE_STORE_THEME_SECTION_GROUP" ||
        resourceType == "ONLINE_STORE_THEME_SETTINGS_CATEGORY" ||
        resourceType == "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS" ||
        resourceType == "ONLINE_STORE_THEME_APP_EMBED":
        return "Theme";

      case resourceType == "PRODUCT" ||
        resourceType == "PRODUCT_OPTION" ||
        resourceType == "PRODUCT_OPTION_VALUE":
        return "Products";

      case resourceType == "COLLECTION":
        return "Collection";

      case resourceType == "METAFIELD":
        return "Store metadata";

      case resourceType == "ARTICLE":
        return "Article";

      case resourceType == "BLOG":
        return "Blog titles";

      case resourceType == "MENU" || resourceType == "LINK":
        return "Navigation";

      case resourceType == "FILTER":
        return "Filters";

      case resourceType == "METAOBJECT" ||
        resourceType == "PAYMENT_GATEWAY" ||
        resourceType == "SELLING_PLAN":
        return "Metaobjects";

      case resourceType == "PACKING_SLIP_TEMPLATE":
        return "Shipping";

      case resourceType == "DELIVERY_METHOD_DEFINITION":
        return "Delivery";

      case resourceType == "SHOP_POLICY":
        return "Policies";

      case resourceType == "EMAIL_TEMPLATE":
        return "Email";

      default:
        return "";
    }
  };

  const handleReTranslate = () => {
    navigate("/app/translate");
    reportClick("dashboard_translation_task_retranslate");
  };

  const moreItems = useCallback(() => {
    if (showMoreItems) {
      const dom = dataSource?.map((item: any, index: number) => {
        if (index) {
          return (
            <React.Fragment key={item?.target}>
              <Divider />
              <ProgressBlock
                key={item?.target}
                isMobile={isMobile}
                source={source.current}
                target={item?.target}
                status={item?.status}
                translateStatus={item?.translateStatus}
                progressData={item?.progressData}
                value={item?.value}
                module={item?.module}
                handleReTranslate={handleReTranslate}
                stopTranslateFetcher={stopTranslateFetcher}
              />
            </React.Fragment>
          );
        } else {
          return (
            <ProgressBlock
              key={item?.target}
              isMobile={isMobile}
              source={source.current}
              target={item?.target}
              status={item?.status}
              translateStatus={item?.translateStatus}
              progressData={item?.progressData}
              value={item?.value}
              module={item?.module}
              handleReTranslate={handleReTranslate}
              stopTranslateFetcher={stopTranslateFetcher}
            />
          );
        }
      });

      return dom;
    } else {
      return (
        <ProgressBlock
          key={dataSource[0]?.target}
          isMobile={isMobile}
          source={source.current}
          target={dataSource[0]?.target}
          status={dataSource[0]?.status}
          translateStatus={dataSource[0]?.translateStatus}
          progressData={dataSource[0]?.progressData}
          value={dataSource[0]?.value}
          module={dataSource[0]?.module}
          handleReTranslate={handleReTranslate}
          stopTranslateFetcher={stopTranslateFetcher}
        />
      );
    }
  }, [dataSource, isMobile, source, showMoreItems]);

  return (
    <Card>
      <Flex
        justify="space-between"
        align="center"
        style={{ marginBottom: "8px" }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {t("progressing.title")}
        </Title>

        {dataSource?.length > 1 && (
          <Button onClick={() => setShowMoreItems(!showMoreItems)}>
            {showMoreItems
              ? t("progressing.showLessItems")
              : t("progressing.showMoreItems", { items: dataSource?.length })}
          </Button>
        )}
      </Flex>
      {loading ? (
        <Skeleton.Button active style={{ height: "130px" }} block />
      ) : dataSource?.length !== 0 ? (
        <Card>
          {/* 始终显示第一个 ProgressBlock */}
          {moreItems()}
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
    </Card>
  );
};

export default ProgressingCard;
