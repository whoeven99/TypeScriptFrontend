import { FetcherWithComponents, useFetcher } from "@remix-run/react";
import { Button, Flex, Modal, Space, Switch, Table, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { LanguagesDataType, MarketType } from "../route";
import styles from "../styles.module.css";

const { Text } = Typography;

interface MarketDataType {
  key: string;
  domain: string;
  published: boolean;
}

interface PublishModalProps {
  publishLangaugeCode: string;
  markets: MarketType[];
  setMarkets: (e: MarketType[]) => void;
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  publishFetcher: FetcherWithComponents<any>;
}

const PublishModal: React.FC<PublishModalProps> = ({
  publishLangaugeCode,
  markets,
  setMarkets,
  isVisible,
  setIsModalOpen,
  publishFetcher,
}) => {
  const languageData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );
  const selectedLanguage = useMemo(() => {
    return languageData.find((item) => item.locale == publishLangaugeCode);
  }, [languageData, publishLangaugeCode]);
  const [published, setPublished] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<MarketDataType[]>([]);
  const { t } = useTranslation();

  // 2. 用一个 ref 缓存上一次的值
  const webPresencesUpdateFetcher = useFetcher<any>();

  useEffect(() => {
    if (webPresencesUpdateFetcher.data?.success) {
      const errorMsg = webPresencesUpdateFetcher.data?.errorMsg;
      if (errorMsg) {
        shopify.toast.show(webPresencesUpdateFetcher.data?.errorMsg);
        const errorCode = webPresencesUpdateFetcher.data?.errorCode;
        if (errorCode == 10002) return;
      }
      const updatedMarkets = [...markets];

      webPresencesUpdateFetcher.data.response?.webPresences?.forEach(
        (market: any) => {
          const webpresenceId =
            market?.value?.data?.webPresenceUpdate?.webPresence?.id;
          const host =
            market?.value?.data?.webPresenceUpdate?.webPresence?.domain?.host;
          const locales =
            market?.value?.data?.webPresenceUpdate?.webPresence?.domain
              ?.localization?.alternateLocales;

          if (webpresenceId && locales && host) {
            const existingIndex = updatedMarkets.findIndex(
              (m) => m.key === webpresenceId,
            );

            if (existingIndex >= 0) {
              updatedMarkets[existingIndex] = {
                ...updatedMarkets[existingIndex],
                domain: {
                  ...updatedMarkets[existingIndex].domain,
                  [host]: locales,
                },
              };
            } else {
              updatedMarkets.push({
                key: webpresenceId,
                domain: {
                  [host]: locales,
                },
              });
            }
          }
        },
      );

      setMarkets(updatedMarkets);
    }
  }, [webPresencesUpdateFetcher.data]);

  useEffect(() => {
    if (!publishLangaugeCode) return;
    setDataSource(
      markets.flatMap((market) =>
        Object.entries(market.domain).map(([host, locales]) => ({
          key: market.key,
          domain: host,
          published: (locales as string[]).includes(publishLangaugeCode),
        })),
      ),
    );
  }, [markets, publishLangaugeCode]);

  useEffect(() => {
    if (!publishLangaugeCode) return;
    setPublished(selectedLanguage?.published || false);
  }, [markets, publishLangaugeCode]);

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

  const handleWebpresenceChange = () => {
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
        if (!locales.includes(publishLangaugeCode)) {
          locales.push(publishLangaugeCode);
        }
        // 去重（其实上面已保证唯一，但更保险）
        locales = Array.from(new Set(locales));
      } else {
        // published 为 false，确保 languageCode 不存在
        locales = locales.filter((l) => l !== publishLangaugeCode);
      }

      return {
        id: item.key,
        alternateLocales: locales,
        publishedCode: publishLangaugeCode,
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

  const handlePublishChange = (checked: boolean) => {
    if (checked) {
      publishFetcher.submit(
        {
          publishInfo: JSON.stringify({
            locale: publishLangaugeCode,
            shopLocale: { published: true },
          }),
        },
        {
          method: "POST",
          action: "/app/language",
        },
      );
    } else {
      publishFetcher.submit(
        {
          unPublishInfo: JSON.stringify({
            locale: publishLangaugeCode,
            shopLocale: { published: false },
          }),
        },
        {
          method: "POST",
          action: "/app/language",
        },
      );
    }
  };

  const onSave = () => {
    if (selectedLanguage)
      if (selectedLanguage.published != published)
        handlePublishChange(published);
    if (published) {
      handleWebpresenceChange();
    }
  };

  return (
    <Modal
      title={t("publishModal.title", {
        languageName: selectedLanguage?.localeName,
      })}
      open={isVisible}
      onCancel={() => setIsModalOpen(false)}
      footer={
        <Space>
          <Button onClick={() => setIsModalOpen(false)}>{t("Cancel")}</Button>
          <Button
            type="primary"
            disabled={dataSource.every((item) => !item.published) && published}
            loading={
              webPresencesUpdateFetcher.state == "submitting" ||
              publishFetcher.state == "submitting"
            }
            onClick={onSave}
          >
            {t("Save")}
          </Button>
        </Space>
      }
      style={{
        top: "40%",
      }}
    >
      <Space
        direction="vertical"
        size={"large"}
        style={{ width: "100%", margin: "12px 0 0" }}
      >
        <Flex justify="space-between" align="center">
          <Text strong>{t("Language Publishing Status")}</Text>
          <Switch value={published} onChange={(e) => setPublished(e)} />
        </Flex>
        {published && (
          <div className={styles.publishModal_webpresence_card}>
            <Text strong>{t("Publish to Selected Domains")}</Text>
            <Table
              dataSource={dataSource}
              columns={columns}
              pagination={false}
            />
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default PublishModal;
