import { useFetcher } from "@remix-run/react";
import { Button, Modal, Space, Switch, Table } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  setPublishLoadingState,
  setPublishState,
} from "~/store/modules/languageTableData";
import isEqual from "lodash/isEqual";

interface MarketType {
  key: string;
  domain: {
    [key: string]: string[];
  };
}

interface MarketDataType {
  key: string;
  domain: string;
  published: boolean;
}

interface PublishModalProps {
  shop: string;
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  languageCode: string;
  languageName: string;
}

const PublishModal: React.FC<PublishModalProps> = ({
  shop,
  isVisible,
  setIsModalOpen,
  languageCode,
  languageName,
}) => {
  const [markets, setMarkets] = useState<MarketType[]>([]);
  const [dataSource, setDataSource] = useState<MarketDataType[]>([]);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const languageData = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const languageLocaleData = useMemo(() => {
    return languageData?.map((item: any) => item?.locale) || [];
  }, [languageData]);

  // 2. 用一个 ref 缓存上一次的值
  const prevLocaleDataRef = useRef<string[]>();

  const fetcher = useFetcher<any>();
  const webPresencesFetcher = useFetcher<any>();
  const webPresencesUpdateFetcher = useFetcher<any>();
  const publishFetcher = useFetcher<any>();

  useEffect(() => {
    // 如果数据和上一次完全一样，就不触发
    if (
      isEqual(prevLocaleDataRef.current, languageLocaleData) ||
      !languageData?.length
    ) {
      return;
    }

    prevLocaleDataRef.current = languageLocaleData;

    webPresencesFetcher.submit(
      {
        webPresences: JSON.stringify(true),
      },
      {
        method: "POST",
        action: "/app/language",
      },
    );
  }, [languageLocaleData]);

  useEffect(() => {
    if (webPresencesFetcher.data?.success) {
      console.log(webPresencesFetcher.data.response);
      let newMarketArray: MarketType[] = [];
      webPresencesFetcher.data.response?.forEach((market: any) => {
        if (market?.id && market?.domain) {
          newMarketArray.push({
            key: market?.id,
            domain: {
              [market?.domain?.host]:
                market?.domain?.localization?.alternateLocales,
            },
          });
        }
      });
      setMarkets(newMarketArray);
    }
  }, [webPresencesFetcher.data]);

  useEffect(() => {
    if (webPresencesUpdateFetcher.data?.success) {
      const errorMsg = webPresencesUpdateFetcher.data?.errorMsg;
      if (errorMsg) {
        shopify.toast.show(webPresencesUpdateFetcher.data?.errorMsg);
        const errorCode = webPresencesUpdateFetcher.data?.errorCode;
        if (errorCode == 10002) return;
      }
      publishFetcher.submit(
        {
          publishInfo: JSON.stringify({
            locale:
              webPresencesUpdateFetcher.data.response.publishedCode ||
              languageCode,
            shopLocale: {
              published: true,
            },
          }),
        },
        {
          method: "POST",
          action: "/app/language",
        },
      );
    }
  }, [webPresencesUpdateFetcher.data]);

  useEffect(() => {
    if (publishFetcher.data) {
      if (publishFetcher.data.success) {
        const response = publishFetcher.data.response;
        dispatch(
          setPublishLoadingState({ locale: response?.locale, loading: false }),
        );
        dispatch(
          setPublishState({
            locale: response?.locale,
            published: response?.published,
          }),
        );
        shopify.toast.show(
          t("{{ locale }} is published", { locale: response?.name || "" }),
        );
        setIsModalOpen(false);
        fetcher.submit(
          {
            log: `${shop} 发布语言${response?.locale}`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      } else {
        shopify.toast.show(t("Publish failed"));
      }
    }
  }, [publishFetcher.data]);

  useEffect(() => {
    setDataSource(
      markets.flatMap((market) =>
        Object.entries(market.domain).map(([host, locales]) => ({
          key: market.key,
          domain: host,
          published: (locales as string[]).includes(languageCode),
        })),
      ),
    );
  }, [markets, languageCode]);

  const columns = [
    {
      title: t("Domain"),
      dataIndex: "domain",
      key: "domain",
    },
    {
      title: t("Publish"),
      dataIndex: "publish",
      key: "publish",
      render: (_: any, record: any) => (
        <Switch
          checked={record.published}
          onChange={(checked) => {
            setDataSource(
              dataSource.map((item) =>
                item.key === record.key
                  ? { ...item, published: checked }
                  : item,
              ),
            );
          }}
        />
      ),
    },
  ];

  const handlePublish = () => {
    const webPresencesData = dataSource.map((item) => {
      // 找到对应的 market
      const market = markets.find((m) => m.key === item.key);
      // 找到 domain 的 value（数组）
      let locales: string[] = [];
      if (market) {
        // 取出 domain 的第一个键值对（因为你的结构是 { [host]: string[] }，通常只有一个 host）
        const domainLocales = Object.values(market.domain)[0] || [];
        locales = [...domainLocales];
      }

      if (item.published) {
        // published 为 true，确保 languageCode 存在且去重
        if (!locales.includes(languageCode)) {
          locales.push(languageCode);
        }
        // 去重（其实上面已保证唯一，但更保险）
        locales = Array.from(new Set(locales));
      } else {
        // published 为 false，确保 languageCode 不存在
        locales = locales.filter((l) => l !== languageCode);
      }

      return {
        id: item.key,
        alternateLocales: locales,
        publishedCode: languageCode,
      };
    });
    webPresencesUpdateFetcher.submit(
      {
        webPresencesUpdate: JSON.stringify(webPresencesData),
      },
      {
        method: "POST",
        action: "/app/language",
      },
    );
  };

  return (
    <Modal
      title={t("publishModal.title", { languageName })}
      open={isVisible}
      onCancel={() => setIsModalOpen(false)}
      footer={
        <Space>
          <Button onClick={() => setIsModalOpen(false)}>{t("Cancel")}</Button>
          <Button
            type="primary"
            disabled={dataSource.every((item) => !item.published)}
            loading={
              webPresencesUpdateFetcher.state == "submitting" ||
              publishFetcher.state == "submitting"
            }
            onClick={handlePublish}
          >
            {t("Save")}
          </Button>
        </Space>
      }
      style={{
        top: "40%",
      }}
    >
      <Table dataSource={dataSource} columns={columns} pagination={false} />
    </Modal>
  );
};

export default PublishModal;
