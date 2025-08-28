import { useFetcher } from "@remix-run/react";
import { Button, Modal, Space, Switch, Table } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import {
  setPublishLoadingState,
  setPublishState,
} from "~/store/modules/languageTableData";

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
  const [primaryMarketId, setPrimaryMarketId] = useState<any>([]);
  const [markets, setMarkets] = useState<MarketType[]>([]);
  const [dataSource, setDataSource] = useState<MarketDataType[]>([]);
  const [publishedLoading, setPublishedLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const fetcher = useFetcher<any>();
  const primaryMarketFetcher = useFetcher<any>();
  const webPresencesFetcher = useFetcher<any>();
  const webPresencesUpdateFetcher = useFetcher<any>();
  const publishFetcher = useFetcher<any>();

  useEffect(() => {
    primaryMarketFetcher.submit(
      {
        primaryMarket: JSON.stringify(true),
      },
      {
        method: "POST",
        action: "/app/language",
      },
    );
    webPresencesFetcher.submit(
      {
        webPresences: JSON.stringify(true),
      },
      {
        method: "POST",
        action: "/app/language",
      },
    );
  }, []);

  useEffect(() => {
    if (primaryMarketFetcher.data?.success) {
      setPrimaryMarketId(
        primaryMarketFetcher.data.response?.map((item: any) => item.id),
      );
    }
  }, [primaryMarketFetcher.data]);

  useEffect(() => {
    if (webPresencesFetcher.data?.success) {
      webPresencesFetcher.data.response?.forEach((market: any) => {
        if (market?.id && market?.domain) {
          setMarkets((prevMarkets) => {
            // 判断 key 是否已存在
            if (prevMarkets.some((m) => m?.key === market?.id)) {
              return prevMarkets; // 已存在则不添加
            }
            return [
              ...prevMarkets,
              {
                key: market?.id,
                domain: {
                  [market?.domain?.host]:
                    market?.domain?.localization?.alternateLocales,
                },
              },
            ];
          });
        }
      });
    }
  }, [webPresencesFetcher.data]);

  useEffect(() => {
    if (webPresencesUpdateFetcher.data?.success) {
      publishFetcher.submit(
        {
          publishInfo: JSON.stringify({
            locale:
              webPresencesUpdateFetcher.data.response.publishedCode ||
              languageCode,
            shopLocale: {
              marketWebPresenceIds: primaryMarketId,
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
      setPublishedLoading(false);
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
  }, [markets, languageCode, isVisible]);

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
    setPublishedLoading(true);
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
            disabled={
              dataSource.every((item) => !item.published) ||
              primaryMarketFetcher.data?.response.length === 0
            }
            loading={publishedLoading}
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
