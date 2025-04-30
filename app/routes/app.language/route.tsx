import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Typography,
  Button,
  Space,
  Flex,
  Table,
  Switch,
  Skeleton,
  message,
  Modal,
} from "antd";
import { lazy, Suspense, useEffect, useState, startTransition } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useLocation, useNavigate, useSubmit } from "@remix-run/react";
import "./styles.css";
import { authenticate } from "~/shopify.server";
import {
  mutationShopLocaleDisable,
  mutationShopLocaleEnable,
  mutationShopLocalePublish,
  mutationShopLocaleUnpublish,
  PublishInfoType,
  queryAllLanguages,
  queryAllMarket,
  queryProductsCount,
  queryShopLanguages,
  UnpublishInfoType,
} from "~/api/admin";
import { useDispatch, useSelector } from "react-redux";
import {
  setAutoTranslateLoadingState,
  setAutoTranslateState,
  setPublishLoadingState,
  setPublishState,
  setStatusState,
  setTableData,
} from "~/store/modules/languageTableData";
import {
  GetLanguageList,
  GetLanguageLocaleInfo,
  GetTranslate,
  GetUserData,
  GetUserWords,
  UpdateAutoTranslateByData,
} from "~/api/serve";
import TranslatedIcon from "~/components/translateIcon";
import { WordsType } from "../app._index/route";
import { useTranslation } from "react-i18next";
import PrimaryLanguage from "./components/primaryLanguage";
import AddLanguageModal from "./components/addLanguageModal";
import PreviewModal from "~/components/previewModal";
import ScrollNotice from "~/components/ScrollNotice";

const { Title, Text } = Typography;

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
  language: string;
  localeName: string;
  locale: string;
  primary: boolean;
  status: number;
  autoTranslate: boolean;
  published: boolean;
  publishLoading: boolean;
  autoTranslateLoading: boolean;
}

export interface MarketType {
  name: string;
  primary: boolean;
  webPresences: {
    nodes: [
      {
        id: string;
      },
    ];
  };
}

interface FetchType {
  allCountryCode: string[];
  allLanguages: AllLanguagesType[];
  allMarket: MarketType[];
  languageLocaleInfo: any;
  languagesLoad: any;
  shop: string;
  shopLanguagesLoad: ShopLocalesType[];
  words: WordsType;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
    shop: shop,
    accessToken: accessToken as string,
  });

  const shopPrimaryLanguage = shopLanguagesLoad.filter(
    (language) => language.primary,
  );
  const shopLocalesIndex = shopLanguagesLoad.filter(
    (language) => !language.primary,
  ).map((item) => item.locale);

  console.log(`${shop} load language`);

  return json(
    {
      sever: process.env.SERVER_URL,
      shop: shop,
      shopLanguagesLoad,
      shopPrimaryLanguage,
      shopLocalesIndex,
    },
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const addData = JSON.parse(formData.get("addData") as string);
    const addLanguages = JSON.parse(formData.get("addLanguages") as string); // 获取语言数组
    const translation = JSON.parse(formData.get("translation") as string);
    const publishInfo: PublishInfoType = JSON.parse(
      formData.get("publishInfo") as string,
    );
    const unPublishInfo: UnpublishInfoType = JSON.parse(
      formData.get("unPublishInfo") as string,
    );
    const deleteData = JSON.parse(formData.get("deleteData") as string);

    switch (true) {
      case !!loading:
        const shopLocalesIndex = loading.shopLocalesIndex;
        const shopPrimaryLanguage = loading.shopPrimaryLanguage;
        const allMarket: MarketType[] = await queryAllMarket({
          shop,
          accessToken: accessToken as string,
        });
        const languageLocaleInfo = await GetLanguageLocaleInfo({
          locale: shopLocalesIndex,
        });
        const languagesLoad = await GetLanguageList({ shop, source: shopPrimaryLanguage[0].locale });
        return json({
          shop: shop,
          allMarket: allMarket,
          languagesLoad: languagesLoad,
          languageLocaleInfo: languageLocaleInfo,
        });

      case !!addData:
        try {
          let allLanguages: AllLanguagesType[] = await queryAllLanguages({
            shop,
            accessToken: accessToken as string,
          });
          allLanguages = allLanguages.map((language, index) => ({
            ...language,
            key: index,
          }));

          const allCountryCode = allLanguages.map((item) => item.isoCode);
          const languageLocaleInfo = await GetLanguageLocaleInfo({
            locale: allCountryCode,
          });
          return json({
            success: true,
            data: { allLanguages: allLanguages, languageLocaleInfo: languageLocaleInfo, }
          });
        } catch (error) {
          console.error("Error addData language:", error);
          return json({ error: "Error addData language" }, { status: 500 });
        }

      case !!addLanguages:
        const data = await mutationShopLocaleEnable({
          shop,
          accessToken: accessToken as string,
          addLanguages,
        }); // 处理逻辑
        return json({ data: data });

      case !!translation:
        try {
          // 如果是机器翻译(translateSettings1 === "8")，直接调用翻译接口          
          if (translation.translateSettings1 === "8") {
            const words = await GetUserData({ shop });
            if (!words || !words.success) {
              return json({
                success: false,
                message: "words get error",
                data: {
                  shop,
                  accessToken: accessToken as string,
                  source: translation.primaryLanguage,
                  target: translation.selectedLanguage.locale,
                  translateSettings1: translation.translateSettings1,
                  translateSettings2: translation.translateSettings2,
                  translateSettings3: translation.translateSettings3,
                }
              }, { status: 200 });
            }

            if (typeof words.response?.usedAmount === "number" && words.response.usedAmount >= words.response.amount) {
              return json({
                success: false,
                message: "words limit reached",
                data: {
                  shop,
                  accessToken: accessToken as string,
                  source: translation.primaryLanguage,
                  target: translation.selectedLanguage.locale,
                  translateSettings1: translation.translateSettings1,
                  translateSettings2: translation.translateSettings2,
                  translateSettings3: translation.translateSettings3,
                }
              }, { status: 200 });
            }

            const data = await GetTranslate({
              shop,
              accessToken: accessToken as string,
              source: translation.primaryLanguage,
              target: translation.selectedLanguage.locale,
              translateSettings1: translation.translateSettings1,
              translateSettings2: translation.translateSettings2,
              translateSettings3: translation.translateSettings3
            });
            return data;
          }

          // 非机器翻译模式才需要检查字符数限制
          const words = await GetUserWords({ shop });

          if (!words) {
            return json({
              success: false,
              message: "words get error",
              data: {
                source: translation.primaryLanguage,
                target: translation.selectedLanguage.locale,
                translateSettings1: translation.translateSettings1,
                translateSettings2: translation.translateSettings2,
                translateSettings3: translation.translateSettings3,
              }
            }, { status: 200 });
          }

          if (typeof words?.totalChars === "number" && words?.totalChars === 200000) {
            const productsCount = await queryProductsCount({ shop, accessToken: accessToken as string })
            if (productsCount >= 5000) {
              return json({
                success: false,
                message: "products count limit reached 5000",
                data: {
                  source: translation.primaryLanguage,
                  target: translation.selectedLanguage.locale,
                  translateSettings1: translation.translateSettings1,
                  translateSettings2: translation.translateSettings2,
                  translateSettings3: translation.translateSettings3,
                }
              }, { status: 200 });
            }
          }

          // 检查字符数是否超限
          if (words.chars >= words.totalChars) {
            return json({
              success: false,
              message: "user words limit",
              data: {
                source: translation.primaryLanguage,
                target: translation.selectedLanguage.locale,
                translateSettings1: translation.translateSettings1,
                translateSettings2: translation.translateSettings2,
                translateSettings3: translation.translateSettings3,
              }
            }, { status: 200 });
          }

          // 字符数未超限，调用翻译接口
          const data = await GetTranslate({
            shop,
            accessToken: accessToken as string,
            source: translation.primaryLanguage,
            target: translation.selectedLanguage.locale,
            translateSettings1: translation.translateSettings1,
            translateSettings2: translation.translateSettings2,
            translateSettings3: translation.translateSettings3
          });
          return data;
        } catch (error) {
          console.error("Error translation language:", error);
          return json({ error: "Error translation language" }, { status: 500 });
        }

      case !!publishInfo:
        try {
          await mutationShopLocalePublish({
            shop,
            accessToken: accessToken as string,
            publishInfo: publishInfo,
          });
          return null;
        } catch (error) {
          console.error("Error publishInfo language:", error);
          return json({ error: "Error publishInfo language" }, { status: 500 });
        }

      case !!unPublishInfo:
        try {
          await mutationShopLocaleUnpublish({
            shop,
            accessToken: accessToken as string,
            publishInfos: [unPublishInfo],
          });
          return null;
        } catch (error) {
          console.error("Error unPublishInfo language:", error);
          return json({ error: "Error unPublishInfo language" }, { status: 500 });
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
            data.forEach((result) => {
              if (result.status === "fulfilled") {
                console.log("Request successful:", result.value);
              } else {
                console.error("Request failed:", result.reason);
              }
            });
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
  } catch (error) {
    console.error("Error action language:", error);
    return json({ error: "Error action language" }, { status: 500 });
  }
};

const Index = () => {
  const { shop, shopLanguagesLoad, shopPrimaryLanguage, shopLocalesIndex, sever } = useLoaderData<typeof loader>();
  const [allLanguages, setAllLanguages] = useState<AllLanguagesType[]>([]);
  const [allMarket, setAllMarket] = useState<MarketType[]>([]);
  const [languagesLoad, setLanguagesLoad] = useState<any>(null);
  const [languageLocaleInfo, setLanguageLocaleInfo] = useState<any>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false); // 控制Modal显示的状态
  const [deleteloading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] =
    useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const hasSelected = selectedRowKeys.length > 0;

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loadingFetcher = useFetcher<FetchType>();
  const deleteFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const addDataFetcher = useFetcher<any>();
  const publishFetcher = useFetcher<any>();

  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify({
      shopPrimaryLanguage: shopPrimaryLanguage,
      shopLocalesIndex: shopLocalesIndex,
    }));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app/language",
    });
    setIsMobile(window.innerWidth < 768);
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      setAllMarket(loadingFetcher.data.allMarket);
      setLanguagesLoad(loadingFetcher.data.languagesLoad);
      setLanguageLocaleInfo(loadingFetcher.data.languageLocaleInfo);
      shopify.loading(false);
      setLoading(false);
    }
  }, [loadingFetcher.data]);

  useEffect(() => {
    if (addDataFetcher.data) {
      if (addDataFetcher.data.success) {
        setAllLanguages(addDataFetcher.data.data.allLanguages);
        setLanguageLocaleInfo(addDataFetcher.data.data.languageLocaleInfo);
      }
    }
  }, [addDataFetcher.data]);

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
      const newData = dataSource.filter((item) => !deleteData.includes(item.locale));

      // 更新表格数据
      dispatch(setTableData(newData));
      // 清空已选中项
      setSelectedRowKeys([]);
      // 结束加载状态
      setDeleteLoading(false);
      shopify.toast.show(t("Delete successfully"));
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    if (statusFetcher.data?.data) {
      console.log("statusFetcher.data?.data: ", statusFetcher.data?.data);
      const items = statusFetcher.data?.data.map((item: any) => {
        if (item?.status === 2) {
          return item;
        } else {
          dispatch(
            setStatusState({ target: item.target, status: item.status }),
          );
        }
      });
      if (items[0] !== undefined && items[0].status === 2) {
        // 加入10秒的延时
        const delayTimeout = setTimeout(() => {
          const formData = new FormData();
          formData.append(
            "statusData",
            JSON.stringify({
              source: shopPrimaryLanguage[0].locale,
              target: [items[0].target],
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
  }, [statusFetcher.data]);

  // useEffect(() => {
  //   if (words && words.chars > words.totalChars) setDisable(true);
  // }, [words]);

  useEffect(() => {
    if (!shopLanguagesLoad || !languagesLoad || !languageLocaleInfo) return; // 确保数据加载完成后再执行
    let data = shopLanguagesLoad.filter((language) => !language.primary).map((lang, i) => ({
      key: i,
      language: lang.name,
      localeName: "",
      locale: lang.locale,
      primary: lang.primary,
      status: 0,
      autoTranslate: false,
      published: lang.published,
      publishLoading: false,
      autoTranslateLoading: false,
    }));
    data = data.map((lang, i) => ({
      ...lang,
      status: languagesLoad.find((language: any) => language.target === lang.locale)?.status || 0,
      autoTranslate: languagesLoad.find((language: any) => language.target === lang.locale)?.autoTranslate || false,
    }));
    const findItem = data.find((data: any) => data.status === 2);
    if (findItem && shopPrimaryLanguage) {
      const formData = new FormData();
      formData.append(
        "statusData",
        JSON.stringify({
          source: shopPrimaryLanguage[0]?.locale,
          target: [findItem.locale],
        }),
      );
      statusFetcher.submit(formData, {
        method: "post",
        action: "/app",
      });
    }
    data = data.map((lang, i) => ({
      ...lang,
      localeName: languageLocaleInfo[lang.locale]?.Local || "",
    }));
    dispatch(setTableData(data));
    // if (location.state?.publishLanguageCode && !data.find((item: any) => item.locale === location.state?.publishLanguageCode)?.published) {
    //   setSelectedRow(data.find((item: any) => item.locale === location.state?.publishLanguageCode) || dataSource.find((item: any) => item.locale === location.state?.publishLanguageCode));
    // }
  }, [shopLanguagesLoad, languagesLoad, languageLocaleInfo]); // 依赖 shopLanguagesLoad 和 status

  useEffect(() => {
    if (dataSource && dataSource.find((item: any) => item.status === 2)) {
      if (shopPrimaryLanguage) {
        const formData = new FormData();
        formData.append(
          "statusData",
          JSON.stringify({
            source: shopPrimaryLanguage[0]?.locale,
            target: [dataSource.find((item: any) => item.status === 2)?.locale],
          }),
        );
        const timeoutId = setTimeout(() => {
          statusFetcher.submit(formData, {
            method: "post",
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
            {record.language}({record.localeName})
          </Text>
        );
      },
    },
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      width: "15%",
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
        // onClick={() => handleConfirmPublishModal()}
        />
      ),
    },
    {
      title: t("Auto translate"),
      dataIndex: "autoTranslate",
      key: "autoTranslate",
      width: "20%",
      render: (_: any, record: any) => (
        <Switch
          checked={record.autoTranslate}
          onChange={(checked) => handleAutoUpdateTranslationChange(record.locale, checked)}
          loading={record.autoTranslateLoading} // 使用每个项的 loading 状态
        // onClick={() => handleConfirmPublishModal()}
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
            onClick={() => handleTranslate(record.locale)}
            style={{ width: "100px" }}
            type="primary"
          >
            {t("Translate")}
          </Button>
          <Button
            onClick={() => {
              navigate("/app/manage_translation", {
                state: { key: record.locale },
              });
            }}
          >
            {t("Manage")}
          </Button>
        </Space>
      ),
    },
  ];

  const handleOpenModal = () => {
    if (dataSource.length === 20) {
      setShowWarnModal(true);
      return;
    }
    startTransition(() => {
      setIsLanguageModalOpen((prev) => !prev); // 你的状态更新逻辑
    });
    addDataFetcher.submit({
      addData: JSON.stringify(true),
    }, {
      method: "post",
      action: "/app/language",
    });
  };

  const handlePublishChange = (locale: string, checked: boolean) => {
    const row = dataSource.find((item: any) => item.locale === locale);
    if (checked && row) {
      dispatch(setPublishLoadingState({ locale, loading: true }));
      publishFetcher.submit({
        publishInfo: JSON.stringify({
          locale: row.locale,
          shopLocale: { published: true, marketWebPresenceIds: allMarket.find((item: any) => item.primary === true)?.webPresences.nodes[0].id },
        })
      }, {
        method: "POST",
        action: "/app/language",
      });
    } else if (!checked && row) {
      dispatch(setPublishState({ locale, published: checked }));
      publishFetcher.submit({
        unPublishInfo: JSON.stringify({
          locale: row.locale,
          shopLocale: { published: false },
        })
      }, {
        method: "POST",
        action: "/app/language",
      });
    }
  };

  const handleAutoUpdateTranslationChange = async (locale: string, checked: boolean) => {
    dispatch(setAutoTranslateLoadingState({ locale, loading: true }));
    const row = dataSource.find((item: any) => item.locale === locale);
    if (row) {
      const data = await UpdateAutoTranslateByData({ shopName: shop, source: shopPrimaryLanguage[0]?.locale, target: row.locale, autoTranslate: checked, sever: sever || "" });
      if (data?.success) {
        dispatch(setAutoTranslateLoadingState({ locale, loading: false }));
        dispatch(setAutoTranslateState({ locale, autoTranslate: checked }));
        setLanguagesLoad(languagesLoad.map((item: any) =>
          item.target === locale ? { ...item, autoTranslate: checked } : { ...item, autoTranslate: false }
        ));
        shopify.toast.show(t("Auto translate updated successfully"));
      }
    }
  };

  const handleTranslate = async (locale: string) => {
    navigate("/app/translate", { state: { from: "/app/language", selectedLanguageCode: locale } });
  };

  //表格编辑
  const handleDelete = () => {
    const targets = dataSource.filter((item: LanguagesDataType) =>
      selectedRowKeys.includes(item.key),
    );

    const formData = new FormData();
    formData.append(
      "deleteData",
      JSON.stringify({
        targets: targets,
        primaryLanguage: shopPrimaryLanguage[0]?.locale,
      }),
    ); // 将选中的语言作为字符串发送
    deleteFetcher.submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
    setDeleteLoading(true);
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
  };

  return (
    <Page>
      <TitleBar title={t("Language")} />
      <ScrollNotice text={t("Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.")} />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div>
          <Title style={{ fontSize: "1.25rem", display: "inline" }}>
            {t("Languages")}
          </Title>
          <PrimaryLanguage shopLanguages={shopLanguagesLoad} />
        </div>
        <div className="languageTable_action">
          <Flex
            align="center"
            justify="space-between" // 使按钮左右分布
            style={{ width: "100%", marginBottom: "16px" }}
          >
            <Flex align="center" gap="middle">
              <Button
                onClick={handleDelete}
                disabled={!hasSelected}
                loading={deleteloading}
              >
                {t("Delete")}
              </Button>
              <Text style={{ color: "#007F61" }}>
                {hasSelected
                  ? `${t("Selected")} ${selectedRowKeys.length} ${t("items")}`
                  : null}
              </Text>
            </Flex>
            <div>
              <Space>
                <Button type="default" onClick={PreviewClick}>
                  {t("Preview store")}
                </Button>
                <Button type="primary" onClick={handleOpenModal}>
                  {t("Add Language")}
                </Button>
              </Space>
            </div>
          </Flex>
          <Table
            virtual={isMobile}
            scroll={isMobile ? { x: 900 } : {}}
            rowSelection={rowSelection}
            columns={columns}
            dataSource={dataSource}
            style={{ width: "100%" }}
            loading={deleteloading || loading}
          />
        </div>
      </Space>
      <AddLanguageModal
        isVisible={isLanguageModalOpen}
        setIsModalOpen={setIsLanguageModalOpen}
        allLanguages={allLanguages}
        languageLocaleInfo={languageLocaleInfo}
        primaryLanguage={shopPrimaryLanguage[0]}
      />
      <PreviewModal
        visible={previewModalVisible}
        setVisible={setPreviewModalVisible}
      />
      {showWarnModal && (
        <Modal
          open={showWarnModal}
          onCancel={() => setShowWarnModal(false)}
          title={t("The 20 language limit has been reached")}
          footer={
            <Button onClick={() => setShowWarnModal(false)}>
              {t("Cancel")}
            </Button>
          }
          style={{
            top: "40%",
          }}
        >
          <Text>
            {t("Based on Shopify's language limit, you can only add up to 20 languages.Please delete some languages and then continue.")}
          </Text>
        </Modal>
      )}
    </Page>
  );
};

export default Index;
