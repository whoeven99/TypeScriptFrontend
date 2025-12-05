import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Typography,
  Button,
  Space,
  Flex,
  Table,
  Switch,
  Modal,
  Skeleton,
  Card,
  Checkbox,
} from "antd";
import { useEffect, useState, startTransition, useMemo, useRef } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import {
  mutationShopLocaleDisable,
  mutationShopLocaleEnable,
  queryAllLanguages,
  queryPrimaryMarket,
  queryShopLanguages,
} from "~/api/admin";
import { useDispatch, useSelector } from "react-redux";
import {
  setAutoTranslateLoadingState,
  setAutoTranslateState,
  setStatusState,
  setLanguageTableData,
} from "~/store/modules/languageTableData";
import {
  GetLanguageList,
  GetTranslate,
  UpdateAutoTranslateByData,
} from "~/api/JavaServer";
import TranslatedIcon from "~/components/translateIcon";
import { useTranslation } from "react-i18next";
import PrimaryLanguage from "./components/primaryLanguage";
import AddLanguageModal from "./components/addLanguageModal";
import ScrollNotice from "~/components/ScrollNotice";
import DeleteConfirmModal from "./components/deleteConfirmModal";
import PublishModal from "./components/publishModal";
import useReport from "scripts/eventReport";
import isEqual from "lodash/isEqual";
import styles from "./styles.module.css";
import languageLocaleData from "~/utils/language-locale-data";

const { Title, Text } = Typography;

export interface MarketType {
  key: string;
  domain: {
    [key: string]: string[];
  };
}

export interface ShopLocalesType {
  locale: string;
  name: string;
  primary: boolean;
  published: boolean;
}

export interface AllLanguagesType {
  key: number;
  isoCode: string;
  name: string;
}

export interface LanguagesDataType {
  key: number;
  name: string;
  src?: string[];
  localeName?: string;
  locale: string;
  primary: boolean;
  status?: number;
  autoTranslate?: boolean;
  published: boolean;
  publishLoading?: boolean;
  autoTranslateLoading?: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  const isMobile = request.headers.get("user-agent")?.includes("Mobile");

  return json({
    server: process.env.SERVER_URL,
    mobile: isMobile as boolean,
    shop: shop,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;
  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const loading = JSON.parse(formData.get("loading") as string);
  const primaryMarket = JSON.parse(formData.get("primaryMarket") as string);
  const webPresences = JSON.parse(formData.get("webPresences") as string);
  const addLanguages = JSON.parse(formData.get("addLanguages") as string); // 获取语言数组
  const translation = JSON.parse(formData.get("translation") as string);
  const deleteData = JSON.parse(formData.get("deleteData") as string);

  switch (true) {
    case !!loading:
      try {
        const data: ShopLocalesType[] = await queryShopLanguages({
          shop: shop,
          accessToken: accessToken as string,
        });
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: data,
        };
      } catch (error) {
        console.error("Error loading language:", error);
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: [],
        };
      }

    case !!primaryMarket:
      try {
        const response = await queryPrimaryMarket({
          shop,
          accessToken: accessToken as string,
        });
        return json({
          success: true,
          errorCode: 0,
          errorMsg: "",
          response,
        });
      } catch (error) {
        console.error("Error primaryMarket language:", error);
      }

    case !!webPresences:
      try {
        const response = await admin.graphql(
          `#graphql
            query {
              webPresences(first: 10) {
                nodes {
                  id
                  domain {
                    id
                    host
                    localization {
                      alternateLocales
                    }           
                  }
                }
              }
            }`,
        );

        const data = await response.json();

        console.log(`${shop} marketsData: `, data.data?.webPresences?.nodes);

        return json({
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: data.data?.webPresences?.nodes,
        });
      } catch (error) {
        console.error("Error webPresences language:", error);
        return {
          success: false,
          errorCode: 0,
          errorMsg: "",
          dresponse: [],
        };
      }

    case !!addLanguages:
      try {
        const data = await mutationShopLocaleEnable({
          shop,
          accessToken: accessToken as string,
          source: addLanguages?.primaryLanguage || "",
          targets: addLanguages?.selectedLanguages || [],
        }); // 处理逻辑

        if (data?.length > 0) {
          const successItems = data.map((item) => {
            if (item.status === "fulfilled" && item?.value) {
              return item?.value;
            }
          });

          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: successItems,
          };
        } else {
          return {
            success: false,
            errorCode: 0,
            errorMsg: "",
            response: [],
          };
        }
      } catch (error) {
        console.error("Error addLanguages language:", error);
        return {
          success: false,
          errorCode: 0,
          errorMsg: "",
          response: [],
        };
      }

    case !!translation:
      try {
        // 字符数未超限，调用翻译接口
        const data = await GetTranslate({
          shop,
          accessToken: accessToken as string,
          source: translation.primaryLanguage,
          target: translation.selectedLanguage,
          translateSettings1: translation.translateSettings1,
          translateSettings2: translation.translateSettings2,
          translateSettings3: translation.translateSettings3,
          customKey: translation.customKey,
          translateSettings5: translation.translateSettings5,
        });
        return data;
      } catch (error) {
        console.error("Error translation language:", error);
        return json({ error: "Error translation language" }, { status: 500 });
      }

    case !!deleteData:
      try {
        if (deleteData.targets.length > 0) {
          const promise = deleteData.targets.map(
            async (item: LanguagesDataType) => {
              return mutationShopLocaleDisable({
                shop,
                accessToken: accessToken as string,
                language: item,
                primaryLanguageCode: deleteData.primaryLanguageCode,
              });
            },
          );
          const data = await Promise.allSettled(promise);

          return json({ data: data });
        }
      } catch (error) {
        console.error("Error deleteData language:", error);
        return json({ error: "Error deleteData language" }, { status: 500 });
      }
    default:
      // 你可以在这里处理一个默认的情况，如果没有符合的条件
      return json({ success: false, message: "Invalid data" });
  }
};

const Index = () => {
  const { shop, mobile, server } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { plan } = useSelector((state: any) => state.userConfig);

  //用户默认语言数据
  const { source } = useSelector((state: any) => state.userConfig);

  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const languageTableDataLocale = useMemo(() => {
    return dataSource?.map((item: any) => item?.locale) || [];
  }, [dataSource]);

  const prevLocaleDataRef = useRef<string[]>();
  const [markets, setMarkets] = useState<MarketType[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false); // 控制Modal显示的状态
  const [deleteloading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(mobile);
  const [dontPromptAgain, setDontPromptAgain] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] =
    useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishModalLanguageCode, setPublishModalLanguageCode] =
    useState<string>("");
  const [noFirstTranslation, setNoFirstTranslation] = useState(false);
  const [noFirstTranslationLocale, setNoFirstTranslationLocale] =
    useState<string>("");
  const [showWarnModal, setShowWarnModal] = useState(false);
  const hasSelected = useMemo(
    () => selectedRowKeys.length > 0,
    [selectedRowKeys],
  );
  const someCurrentPageSelected = useMemo(
    () => selectedRowKeys.some((key) => selectedRowKeys.includes(key)),
    [selectedRowKeys],
  );
  const allCurrentPageSelected = useMemo(
    () => dataSource.every((item: any) => selectedRowKeys.includes(item.key)),
    [dataSource, selectedRowKeys],
  );

  const fetcher = useFetcher<any>();
  const loadingFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const webPresencesFetcher = useFetcher<any>();
  const { reportClick, report } = useReport();

  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app/language",
    });
    webPresencesFetcher.submit(
      {
        webPresences: JSON.stringify(true),
      },
      {
        method: "POST",
        action: "/app/language",
      },
    );
    fetcher.submit(
      {
        log: `${shop} 目前在语言页面`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    if (localStorage.getItem("dontPromptAgain")) {
      setDontPromptAgain(true);
    }
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
    // 如果数据和上一次完全一样，就不触发
    if (
      isEqual(prevLocaleDataRef.current, languageTableDataLocale) ||
      !dataSource?.length
    ) {
      return;
    }

    prevLocaleDataRef.current = languageTableDataLocale;

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
    if (loadingFetcher.data) {
      if (loadingFetcher.data.success) {
        const shopLanguages = loadingFetcher.data.response;
        const shopPrimaryLanguageData = shopLanguages?.filter(
          (language: any) => language?.primary,
        );
        const shopLanguagesWithoutPrimaryIndex = shopLanguages?.filter(
          (language: any) => !language?.primary,
        );
        let data = shopLanguagesWithoutPrimaryIndex.map((lang: any) => ({
          key: lang?.locale,
          name: lang?.name,
          locale: lang?.locale,
          published: lang.published,
          localeName: "",
          status: 0,
          countries: [],
          autoTranslate: false,
          publishLoading: false,
          autoTranslateLoading: false,
        }));
        const GetLanguageLocaleInfoFront = async () => {
          const languageList = await GetLanguageList({
            shop,
            server: server as string,
            source: shopPrimaryLanguageData[0]?.locale,
          });

          data = data.map((lang: any) => ({
            ...lang,
            status:
              languageList.response?.find(
                (language: any) => language.target === lang.locale,
              )?.status || 0,
            autoTranslate:
              languageList.response?.find(
                (language: any) => language.target === lang.locale,
              )?.autoTranslate || false,
            localeName:
              languageLocaleData[
                lang?.locale as keyof typeof languageLocaleData
              ]?.Local,
          }));
          const findItem = data.find((data: any) => data.status === 2);
          if (findItem && shopPrimaryLanguageData) {
            const formData = new FormData();
            formData.append(
              "statusData",
              JSON.stringify({
                source: shopPrimaryLanguageData[0]?.locale,
                target: [findItem.locale],
              }),
            );
            statusFetcher.submit(formData, {
              method: "post",
              action: "/app",
            });
          }
          dispatch(setLanguageTableData(data));
          setLoading(false);
        };

        GetLanguageLocaleInfoFront();
      }
    }
  }, [loadingFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.data) {
      const deleteData = deleteFetcher.data.data.reduce(
        (acc: any[], item: any) => {
          if (item.status === "fulfilled") {
            acc.push(item.value);
          } else {
            shopify.toast.show(`Deletion failed for "${item.value}"`);
          }
          return acc;
        },
        [],
      );
      // 从 data 中过滤掉成功删除的数据
      const newData = dataSource.filter(
        (item) => !deleteData.includes(item.locale),
      );
      // 更新表格数据
      dispatch(setLanguageTableData(newData));
      // 清空已选中项
      setSelectedRowKeys([]);
      // 结束加载状态
      setDeleteLoading(false);
      shopify.toast.show(t("Delete successfully"));
      fetcher.submit(
        {
          log: `${shop} 删除语言${deleteData}`,
        },
        {
          method: "POST",
          action: "/log",
        },
      );
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    if (statusFetcher.data) {
      if (statusFetcher.data?.success) {
        const items = statusFetcher.data?.response?.translatesDOResult?.map(
          (item: any) => {
            if (item?.status === 2) {
              return item;
            } else {
              dispatch(
                setStatusState({ target: item?.target, status: item?.status }),
              );
            }
          },
        );
        if (items[0] !== undefined && items[0].status === 2) {
          // 加入10秒的延时
          const delayTimeout = setTimeout(() => {
            const formData = new FormData();
            formData.append(
              "statusData",
              JSON.stringify({
                source: source.code,
                target: [items[0]?.target],
              }),
            );

            statusFetcher.submit(formData, {
              method: "post",
              action: "/app",
            });
          }, 10000); // 10秒延时（10000毫秒）

          // 清除超时定时器，以防组件卸载后仍然尝试执行
          return () => clearTimeout(delayTimeout);
        }
      }
    }
  }, [statusFetcher.data]);

  useEffect(() => {
    if (dataSource && dataSource.find((item: any) => item.status === 2)) {
      if (source?.code) {
        const formData = new FormData();
        formData.append(
          "statusData",
          JSON.stringify({
            source: source?.code,
            target: [dataSource.find((item: any) => item.status === 2)?.locale],
          }),
        );
        const timeoutId = setTimeout(() => {
          statusFetcher.submit(formData, {
            method: "POST",
            action: "/app",
          });
        }, 2000); // 2秒延时
        // 在组件卸载时清除定时器
        return () => clearTimeout(timeoutId);
      }
    }
  }, [dataSource]);

  const columns = [
    {
      title: t("Language"),
      dataIndex: "language",
      key: "language",
      width: "30%",
      render: (_: any, record: any) => {
        return (
          <Text>
            {record.name}({record.localeName})
          </Text>
        );
      },
    },
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      width: "20%",
      render: (_: any, record: any) => {
        return <TranslatedIcon status={record.status} />;
      },
    },
    {
      title: t("Publish"),
      dataIndex: "published",
      key: "published",
      width: "10%",
      render: (_: any, record: any) => (
        <Switch
          checked={record.published}
          onChange={(checked) => handlePublishChange(record.locale, checked)}
          loading={record.publishLoading} // 使用每个项的 loading 状态
        />
      ),
    },
    {
      title: t("Auto translation"),
      dataIndex: "autoTranslate",
      key: "autoTranslate",
      width: "15%",
      render: (_: any, record: any) => (
        <Switch
          checked={record.autoTranslate}
          onChange={(checked) =>
            handleAutoUpdateTranslationChange(
              record.locale,
              checked,
              record.status,
            )
          }
          loading={record.autoTranslateLoading} // 使用每个项的 loading 状态
        />
      ),
    },
    {
      title: t("Action"),
      dataIndex: "action",
      key: "action",
      width: "25%",
      render: (_: any, record: any) => (
        <Space>
          <Button
            onClick={() => navigateToTranslate([record.locale])}
            style={{ width: "100px" }}
            type="primary"
          >
            {record?.status === 1 ? t("Update") : t("Translate")}
          </Button>
          <Button onClick={() => navigateToManage(record.locale)}>
            {t("Manage")}
          </Button>
        </Space>
      ),
    },
  ];

  const navigateToTranslate = (selectedLanguageCode: string[]) => {
    navigate("/app/translate", {
      state: {
        from: "/app/language",
        selectedLanguageCode: selectedLanguageCode,
      },
    });
    fetcher.submit(
      {
        log: `${shop} 前往翻译${selectedLanguageCode?.join(",")}, 从语言页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    reportClick("language_list_translate");
  };

  const navigateToManage = (selectedLanguageCode: string) => {
    navigate("/app/manage_translation", {
      state: { key: selectedLanguageCode },
    });
    fetcher.submit(
      {
        log: `${shop} 前往管理${selectedLanguageCode}, 从语言页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    reportClick("language_list_manage");
  };

  const handleOpenModal = () => {
    reportClick("language_navi_add");
    if (dataSource.length === 20) {
      setShowWarnModal(true);
      return;
    }
    startTransition(() => {
      setIsLanguageModalOpen((prev) => !prev); // 你的状态更新逻辑
    });
  };

  const handlePublishChange = (locale: string, checked: boolean) => {
    const row = dataSource.find((item: any) => item.locale === locale);
    if (row) {
      setPublishModalLanguageCode(row?.locale);
      setIsPublishModalOpen(true);
    }
    report(
      {
        status: checked ? 1 : 0,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "language_list_publish",
    );
  };

  const handleAutoUpdateTranslationChange = async (
    locale: string,
    checked: boolean,
    status: number,
  ) => {
    if (!plan) {
      return;
    }
    if (status === 0) {
      setNoFirstTranslationLocale(locale);
      setNoFirstTranslation(true);
      return;
    }
    dispatch(setAutoTranslateLoadingState({ locale, loading: true }));
    const row = dataSource.find((item: any) => item.locale === locale);
    if (row) {
      const data = await UpdateAutoTranslateByData({
        shopName: shop,
        source: source?.code,
        target: row.locale,
        autoTranslate: checked,
        server: server || "",
      });
      if (data?.success) {
        dispatch(setAutoTranslateLoadingState({ locale, loading: false }));
        dispatch(setAutoTranslateState({ locale, autoTranslate: checked }));
        shopify.toast.show(t("Auto translate updated successfully"));
        fetcher.submit(
          {
            log: `${shop} 自动翻译${checked ? "开启" : "关闭"}${row?.locale}`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      }
    }
    report(
      {
        status: checked ? 1 : 0,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "language_list_auto_translate",
    );
  };

  const handleDelete = () => {
    setDeleteConfirmModalVisible(false);
    if (dontPromptAgain) {
      localStorage.setItem("dontPromptAgain", "true");
    }
    const targets = dataSource.filter((item: LanguagesDataType) =>
      selectedRowKeys.includes(item.key),
    );

    const formData = new FormData();
    formData.append(
      "deleteData",
      JSON.stringify({
        targets: targets,
        primaryLanguage: source?.code,
      }),
    ); // 将选中的语言作为字符串发送
    deleteFetcher.submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
    setDeleteLoading(true);
    reportClick("language_list_delete");
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (e: any) => {
      setSelectedRowKeys(e);
    },
  };

  const PreviewClick = () => {
    const shopUrl = `https://${shop}`;
    window.open(shopUrl, "_blank", "noopener,noreferrer");
    reportClick("language_list_preview_store");
  };

  return (
    <Page>
      <TitleBar title={t("Language")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div>
          <Title style={{ fontSize: "1.25rem", display: "inline" }}>
            {t("Languages")}
          </Title>
          <PrimaryLanguage />
        </div>
        <div className={styles.languageTable_action}>
          <Flex
            align="center"
            justify="space-between" // 使按钮左右分布
            style={{ width: "100%", marginBottom: "16px" }}
          >
            <Flex align="center" gap="middle">
              <Button
                disabled={!hasSelected}
                loading={deleteloading}
                onClick={() => {
                  if (dontPromptAgain) {
                    handleDelete();
                  } else {
                    setDeleteConfirmModalVisible(true);
                  }
                }}
              >
                {t("Delete")}
              </Button>
              <Text style={{ color: "#007F61" }}>
                {hasSelected
                  ? `${t("Selected")} ${selectedRowKeys.length} ${t("items")}`
                  : null}
              </Text>
            </Flex>
            {loading ? (
              <Space>
                <Skeleton.Button active />
                <Skeleton.Button active />
              </Space>
            ) : (
              <Space>
                {!isMobile && (
                  <Button type="default" onClick={PreviewClick}>
                    {t("Preview store")}
                  </Button>
                )}
                <Button type="primary" onClick={handleOpenModal}>
                  {t("Add Language")}
                </Button>
              </Space>
            )}
          </Flex>
          {isMobile ? (
            <Card
              title={
                <Checkbox
                  checked={allCurrentPageSelected && !loading}
                  indeterminate={
                    someCurrentPageSelected && !allCurrentPageSelected
                  }
                  onChange={(e: any) =>
                    setSelectedRowKeys(
                      e.target.checked
                        ? dataSource.map((item) => item.key)
                        : [],
                    )
                  }
                >
                  {t("Languages")}
                </Checkbox>
              }
              loading={loading}
            >
              {dataSource.map((item: any) => (
                <Card.Grid key={item.key} style={{ width: "100%" }}>
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    <Checkbox
                      checked={selectedRowKeys.includes(item.key)}
                      onChange={(e: any) => {
                        setSelectedRowKeys(
                          e.target.checked
                            ? [...selectedRowKeys, item.key]
                            : selectedRowKeys.filter((key) => key !== item.key),
                        );
                      }}
                    >
                      {item.name}
                    </Checkbox>
                    <TranslatedIcon status={item.status} />
                    <Flex justify="space-between">
                      <Text>{t("Publish")}</Text>
                      <Switch
                        checked={item.published}
                        onChange={(checked) =>
                          handlePublishChange(item.locale, checked)
                        }
                      />
                    </Flex>
                    <Flex justify="space-between">
                      <Text>{t("Auto translation")}</Text>
                      <Switch
                        checked={item.autoTranslate}
                        onChange={(checked) =>
                          handleAutoUpdateTranslationChange(
                            item.locale,
                            checked,
                            item.status,
                          )
                        }
                      />
                    </Flex>
                    <Button
                      type="primary"
                      style={{ width: "100%" }}
                      onClick={() => {
                        navigate("/app/translate", {
                          state: {
                            from: "/app/language",
                            selectedLanguageCode: [item.locale],
                          },
                        });
                      }}
                    >
                      {t("Translate")}
                    </Button>
                    <Button
                      style={{ width: "100%" }}
                      onClick={() => {
                        navigate("/app/manage_translation", {
                          state: { key: item.locale },
                        });
                      }}
                    >
                      {t("Manage")}
                    </Button>
                  </Space>
                </Card.Grid>
              ))}
            </Card>
          ) : (
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={dataSource}
              loading={deleteloading || loading}
            />
          )}
        </div>
      </Space>
      <AddLanguageModal
        shop={shop}
        isVisible={isLanguageModalOpen}
        setIsModalOpen={setIsLanguageModalOpen}
        languageLocaleData={languageLocaleData}
      />
      <DeleteConfirmModal
        isVisible={deleteConfirmModalVisible}
        setVisible={setDeleteConfirmModalVisible}
        setDontPromptAgain={setDontPromptAgain}
        langauges={selectedRowKeys.map((key) =>
          dataSource.find((item: any) => item?.key === key),
        )}
        handleDelete={handleDelete}
        text={t(
          "Are you sure to delete this language? After deletion, the translation data will be deleted together",
        )}
      />
      <Modal
        title={t("The 20 language limit has been reached")}
        open={showWarnModal}
        onCancel={() => setShowWarnModal(false)}
        centered
        width={700}
        footer={
          <Space>
            <Button onClick={() => setShowWarnModal(false)}>{t("OK")}</Button>
          </Space>
        }
      >
        <Text>
          {t(
            "Based on Shopify's language limit, you can only add up to 20 languages.Please delete some languages and then continue.",
          )}
        </Text>
      </Modal>
      <PublishModal
        markets={markets}
        setMarkets={setMarkets}
        isVisible={isPublishModalOpen}
        setIsModalOpen={setIsPublishModalOpen}
        publishLangaugeCode={publishModalLanguageCode}
      />
      <Modal
        open={noFirstTranslation}
        onCancel={() => setNoFirstTranslation(false)}
        footer={
          <Space>
            <Button onClick={() => setNoFirstTranslation(false)}>
              {t("Cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() =>
                navigate("/app/translate", {
                  state: {
                    from: "/app/language",
                    selectedLanguageCode: [noFirstTranslationLocale],
                  },
                })
              }
            >
              {t("Translate")}
            </Button>
          </Space>
        }
        style={{
          top: "40%",
          zIndex: 1001,
        }}
        width={700}
      >
        <Text>
          {t(
            "Please manually start a translation task first. You can then use the automatic translation function.",
          )}
        </Text>
      </Modal>
    </Page>
  );
};

export default Index;
