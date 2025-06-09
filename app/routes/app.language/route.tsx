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
  Popconfirm,
  Checkbox,
  Skeleton,
} from "antd";
import { useEffect, useState, startTransition } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import "./styles.css";
import { authenticate } from "~/shopify.server";
import {
  mutationShopLocaleDisable,
  mutationShopLocaleEnable,
  mutationShopLocalePublish,
  mutationShopLocaleUnpublish,
  PublishInfoType,
  queryAllLanguages,
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
} from "~/api/JavaServer";
import TranslatedIcon from "~/components/translateIcon";
import { WordsType } from "../app._index/route";
import { useTranslation } from "react-i18next";
import PrimaryLanguage from "./components/primaryLanguage";
import AddLanguageModal from "./components/addLanguageModal";
import PreviewModal from "~/components/previewModal";
import ScrollNotice from "~/components/ScrollNotice";
import DeleteConfirmModal from "./components/deleteConfirmModal";
import TranslationWarnModal from "~/components/translationWarnModal";

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
  localeName?: string;
  locale: string;
  primary: boolean;
  status?: number;
  autoTranslate?: boolean;
  published: boolean;
  publishLoading?: boolean;
  autoTranslateLoading?: boolean;
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

const autoTranslationMapping = {
  1: 20,
  2: 20,
  3: 20,
  4: 20,
  5: 20,
  6: 20,
  7: 20
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  console.log(`${shop} load language`);

  return json(
    {
      server: process.env.SERVER_URL,
      shop: shop,
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
        const languageLocaleInfo = await GetLanguageLocaleInfo({
          locale: shopLocalesIndex,
        });
        const languagesLoad = await GetLanguageList({ shop, source: shopPrimaryLanguage[0].locale });
        return json({
          shop: shop,
          shopLanguagesLoad: shopLanguagesLoad,
          shopPrimaryLanguage: shopPrimaryLanguage,
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
        try {
          const data = await mutationShopLocaleEnable({
            shop,
            accessToken: accessToken as string,
            addLanguages,
          }); // 处理逻辑
          console.log("addLanguages: ", data);
          return data;
        } catch (error) {
          console.error("Error addLanguages language:", error);
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
            translateSettings3: translation.translateSettings3
          });
          return data;
        } catch (error) {
          console.error("Error translation language:", error);
          return json({ error: "Error translation language" }, { status: 500 });
        }

      case !!publishInfo:
        try {
          const response =  await mutationShopLocalePublish({
            shop,
            accessToken: accessToken as string,
            publishInfo: publishInfo,
          });
          return {
            data: response,
          };
        } catch (error) {
          console.error("Error publishInfo language:", error);
          return json({ error: "Error publishInfo language" }, { status: 500 });
        }

      case !!unPublishInfo:
        try {
          const response = await mutationShopLocaleUnpublish({
            shop,
            accessToken: accessToken as string,
            publishInfos: [unPublishInfo],
          });
          return {
            data: response,
          };
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
  const { shop, server } = useLoaderData<typeof loader>();
  const [shopLanguagesLoad, setShopLanguagesLoad] = useState<ShopLocalesType[]>([]);
  const [shopPrimaryLanguage, setShopPrimaryLanguage] = useState<ShopLocalesType[]>([]);
  const [allLanguages, setAllLanguages] = useState<AllLanguagesType[]>([]);
  // const [allMarket, setAllMarket] = useState<MarketType[]>([]);
  const [languagesLoad, setLanguagesLoad] = useState<any>(null);
  const [languageLocaleInfo, setLanguageLocaleInfo] = useState<any>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false); // 控制Modal显示的状态
  const [deleteloading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewModalVisible, setPreviewModalVisible] =
    useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [dontPromptAgain, setDontPromptAgain] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [noFirstTranslation, setNoFirstTranslation] = useState(false);
  const [noFirstTranslationLocale, setNoFirstTranslationLocale] = useState<string>("");
  const [warnModalTitle, setWarnModalTitle] = useState<string>("")
  const [warnModalContent, setWarnModalContent] = useState<string>("")
  const [showWarnModal, setShowWarnModal] = useState(false);
  const hasSelected = selectedRowKeys.length > 0;

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loadingFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const addDataFetcher = useFetcher<any>();
  const publishFetcher = useFetcher<any>();

  const { plan } = useSelector((state: any) => state.userConfig)
  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app/language",
    });
    setIsMobile(window.innerWidth < 768);
    if (localStorage.getItem("dontPromptAgain")) {
      setDontPromptAgain(true);
    }
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      // setAllMarket(loadingFetcher.data.allMarket);
      setLanguagesLoad(loadingFetcher.data.languagesLoad);
      setLanguageLocaleInfo(loadingFetcher.data.languageLocaleInfo);
      setShopLanguagesLoad(loadingFetcher.data.shopLanguagesLoad);
      setShopPrimaryLanguage(loadingFetcher.data.shopPrimaryLanguage);
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

  useEffect(() => {
    if (publishFetcher.data) {
      if (publishFetcher.data?.data?.published) {
        const response = publishFetcher.data.data;
        dispatch(setPublishLoadingState({ locale: response.locale, loading: false }));
        dispatch(setPublishState({ locale: response.locale, published: response.published }));
        shopify.toast.show(t("{{ locale }} is published", { locale: response.name }));
      } else {
        const response = publishFetcher.data.data;
        dispatch(setPublishLoadingState({ locale: response.locale, loading: false }));
        dispatch(setPublishState({ locale: response.locale, published: response.published }));
        shopify.toast.show(t("{{ locale }} is unPublished", { locale: response.name }));
      }
    }
  }, [publishFetcher.data]);

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
  }, [shopLanguagesLoad, languagesLoad]); // 依赖 shopLanguagesLoad 和 status

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
          onChange={(checked) => handleAutoUpdateTranslationChange(record.locale, checked, record.status)}
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
            onClick={() => navigate("/app/translate", { state: { from: "/app/language", selectedLanguageCode: record.locale } })}
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
          shopLocale: { published: true },
        })
      }, {
        method: "POST",
        action: "/app/language",
      });
    } else if (!checked && row) {
      dispatch(setPublishLoadingState({ locale, loading: true }));
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

  const handleAutoUpdateTranslationChange = async (locale: string, checked: boolean, status: number) => {
    if (!plan) {
      return;
    }
    if (status === 0) {
      setNoFirstTranslationLocale(locale);
      setNoFirstTranslation(true);
      return;
    }
    const items = dataSource.filter((item => item.autoTranslate)).length
    if (items <= autoTranslationMapping[plan as keyof typeof autoTranslationMapping]) {
      dispatch(setAutoTranslateLoadingState({ locale, loading: true }));
      const row = dataSource.find((item: any) => item.locale === locale);
      if (row) {
        const data = await UpdateAutoTranslateByData({ shopName: shop, source: shopPrimaryLanguage[0]?.locale, target: row.locale, autoTranslate: checked, server: server || "" });
        if (data?.success) {
          dispatch(setAutoTranslateLoadingState({ locale, loading: false }));
          dispatch(setAutoTranslateState({ locale, autoTranslate: checked }));
          shopify.toast.show(t("Auto translate updated successfully"));
        }
      }
    } else {
      shopify.toast.show(t(`The ${autoTranslationMapping[plan as keyof typeof autoTranslationMapping]} autoTranslation limit has been reached`));
    }
  };

  //表格编辑
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
            {loading
              ?
              <Space>
                <Skeleton.Button active />
                <Skeleton.Button active />
              </Space>
              :
              <Space>
                <Button type="default" onClick={PreviewClick}>
                  {t("Preview store")}
                </Button>
                <Button type="primary" onClick={handleOpenModal}>
                  {t("Add Language")}
                </Button>
              </Space>
            }
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
        languageLocaleInfo={languageLocaleInfo}
        primaryLanguage={shopPrimaryLanguage[0]}
      />
      <PreviewModal
        visible={previewModalVisible}
        setVisible={setPreviewModalVisible}
      />
      <DeleteConfirmModal
        isVisible={deleteConfirmModalVisible}
        setVisible={setDeleteConfirmModalVisible}
        setDontPromptAgain={setDontPromptAgain}
        langauges={selectedRowKeys.map((key) => dataSource.find((item: any) => item?.key === key))}
        handleDelete={handleDelete}
        text={t("Are you sure to delete this language? After deletion, the translation data will be deleted together")}
      />
      <TranslationWarnModal
        title={t("The 20 language limit has been reached")}
        content={t("Based on Shopify's language limit, you can only add up to 20 languages.Please delete some languages and then continue.")}
        show={showWarnModal}
        setShow={setShowWarnModal}
      />
      <Modal
        open={noFirstTranslation}
        onCancel={() => setNoFirstTranslation(false)}
        // title={t("The 20 language limit has been reached")}
        footer={
          <Space>
            <Button onClick={() => setNoFirstTranslation(false)}>
              {t("Cancel")}
            </Button>
            <Button type="primary" onClick={() => navigate("/app/translate", { state: { from: "/app/language", selectedLanguageCode: noFirstTranslationLocale } })}>
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
          {t("Please manually start a translation task first. You can then use the automatic translation function.")}
        </Text>
      </Modal>
    </Page>
  );
};

export default Index;
