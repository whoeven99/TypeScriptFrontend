import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Divider, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useFetcher, useNavigate } from "@remix-run/react";
import { GetProgressData, GetUserValue } from "~/api/JavaServer";
import useReport from "../../../../scripts/eventReport";
import ProgressBlock from "./progressBlock";
const { Text, Title } = Typography;

interface ProgressingCardProps {
  shop: string;
  server: string;
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({ shop, server }) => {
  const source = useRef<string>("");
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [module, setModule] = useState("");
  const [value, setValue] = useState<string>("");
  const [target, setTarget] = useState<string[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [progressNumber, setProgressNumber] = useState<{
    hasTranslated: number;
    totalNumber: number;
  }>({
    hasTranslated: 0,
    totalNumber: 0,
  });
  const [status, setStatus] = useState<number>(0);
  const [translateStatus, setTranslateStatus] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [itemsVisible, setItemsVisible] = useState<boolean>(false);
  const [showMoreItems, setShowMoreItems] = useState<boolean>(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  const languagefetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const translateFetcher = useFetcher<any>();
  const stopTranslateFetcher = useFetcher<any>();
  const { reportClick, report } = useReport();

  useEffect(() => {
    languagefetcher.submit(
      {
        nearTransaltedData: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app",
      },
    );
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (translateFetcher.data) {
      if (translateFetcher.data?.success) {
        setStatus(2);
      }
    }
  }, [translateFetcher.data]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const needFetch = dataSource?.find((item) => item?.status == 2);

    // 当状态为 2 时，开始轮询
    if (needFetch) {
      const pollStatus = () => {
        // 状态查询请求
        languagefetcher.submit(
          {
            nearTransaltedData: JSON.stringify(true),
          },
          {
            method: "post",
            action: "/app",
          },
        );

        // async function getUserValue() {
        //   const data = await GetUserValue({ shop: shop, server });
        //   setValue(data?.response?.value || "");
        //   setTranslateStatus(data?.response?.status || 2);
        // }

        // getProgressData({ source: source.current, target: target[index] });
        // getUserValue();

        // setValue(userValue.data.userValue);

        // 设置下一次轮询
        timeoutId = setTimeout(pollStatus, 3000);
      };

      // 开始首次轮询
      pollStatus();

      // 清理函数
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
    // else if (target[index + 1]) {
    //   console.log("target[index + 1]: ", target[index + 1]);

    //   setIndex(index + 1);
    //   const pollStatus = () => {
    //     // 状态查询请求
    //     const statusformData = new FormData();
    //     statusformData.append(
    //       "statusData",
    //       JSON.stringify({
    //         source: source.current,
    //         target: [target[index + 1]],
    //       }),
    //     );

    //     statusFetcher.submit(statusformData, {
    //       method: "post",
    //       action: "/app",
    //     });

    //     async function getUserValue() {
    //       const userValue = await GetUserValue({ shop: shop, server });
    //       setValue(userValue?.response?.value || "");
    //       setTranslateStatus(userValue?.response?.status || 2);
    //     }

    //     getProgressData({ source: source.current, target: target[index + 1] });
    //     getUserValue();

    //     // setValue(userValue.data.userValue);

    //     // 设置下一次轮询
    //     timeoutId = setTimeout(pollStatus, 3000);
    //   };

    //   // 开始首次轮询
    //   pollStatus();

    //   // 清理函数
    //   return () => {
    //     if (timeoutId) {
    //       clearTimeout(timeoutId);
    //     }
    //   };
    // }
  }, [dataSource]); // 添加 item 到依赖数组

  useEffect(() => {
    if (languagefetcher.data) {
      source.current = languagefetcher.data.response[0]?.source;
      console.log("languagefetcher.data: ", languagefetcher.data);
      const data = languagefetcher.data?.response?.map((item: any) => {
        if (item)
          return {
            ...item,
            module: resourceTypeToModule(item?.resourceType || ""),
          };
      });
      console.log("data: ", data);

      setDataSource(data);
      setLoading(false);
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

  const moreItems = () => {
    if (showMoreItems) {
      const dom = dataSource.map((item: any, index: number) => {
        if (index) {
          return (
            <>
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
                module={module}
                handleReTranslate={handleReTranslate}
                stopTranslateFetcher={stopTranslateFetcher}
                translateButtonLoading={translateFetcher.state === "submitting"}
              />
            </>
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
              module={module}
              handleReTranslate={handleReTranslate}
              stopTranslateFetcher={stopTranslateFetcher}
              translateButtonLoading={translateFetcher.state === "submitting"}
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
          module={module}
          handleReTranslate={handleReTranslate}
          stopTranslateFetcher={stopTranslateFetcher}
          translateButtonLoading={translateFetcher.state === "submitting"}
        />
      );
    }
  };

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
        <Button onClick={() => setShowMoreItems(!showMoreItems)}>
          {showMoreItems
            ? t("progressing.showLessItems")
            : t("progressing.showMoreItems")}
        </Button>
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
