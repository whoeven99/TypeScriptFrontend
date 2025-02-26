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
} from "antd";
import { lazy, Suspense, useEffect, useState, startTransition } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useNavigate, useSubmit } from "@remix-run/react";
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
  queryShopLanguages,
  UnpublishInfoType,
} from "~/api/admin";
import { useDispatch, useSelector } from "react-redux";
import {
  setPublishConfirmState,
  setPublishLoadingState,
  setPublishState,
  setStatusState,
  setTableData,
} from "~/store/modules/languageTableData";
import AttentionCard from "~/components/attentionCard";
import {
  GetLanguageList,
  GetLanguageLocaleInfo,
  GetTranslate,
  GetUserWords,
} from "~/api/serve";
import TranslatedIcon from "~/components/translateIcon";
import { WordsType } from "../app._index/route";
import { useTranslation } from "react-i18next";
import PrimaryLanguage from "./components/primaryLanguage";
import PublishModal from "./components/publishModal";
import AddLanguageModal from "./components/addLanguageModal";
import TranslationWarnModal from "~/components/translationWarnModal";
// import ProgressingCard from "~/components/progressingCard";
import { updateState } from "~/store/modules/translatingResourceType";
import PreviewModal from "~/components/previewModal";

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
  auto_update_translation: boolean;
  published: boolean;
  loading: boolean;
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
  return null;
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
    console.log("deleteData: ", deleteData);
    console.log("true: ", !!deleteData);

    switch (true) {
      case !!loading:
        const Acreatetime = new Date()
        const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
        const Aendtime = new Date();

        console.log("Acreatetime: ", Acreatetime);
        console.log("Aendtime: ", Aendtime);
        console.log("Atiming: ", Aendtime.getTime() - Acreatetime.getTime());
        const shopPrimaryLanguage = shopLanguagesLoad.filter(
          (language) => language.primary,
        );
        const shopLocalesIndex = shopLanguagesLoad.filter(
          (language) => !language.primary,
        ).map((item) => item.locale);
        console.log("shopPrimaryLanguage: ", shopPrimaryLanguage);
        const Bcreatetime = new Date()
        const allMarket: MarketType[] = await queryAllMarket({ request });
        const Bendtime = new Date();

        console.log("Bcreatetime: ", Bcreatetime);
        console.log("Bendtime: ", Bendtime);
        console.log("Btiming: ", Bendtime.getTime() - Bcreatetime.getTime());

        const Ccreatetime = new Date()
        const languageLocaleInfo = await GetLanguageLocaleInfo({
          locale: shopLocalesIndex,
        });
        const Cendtime = new Date();
        console.log("Ccreatetime: ", Ccreatetime);
        console.log("Cendtime: ", Cendtime);
        console.log("Ctiming: ", Cendtime.getTime() - Ccreatetime.getTime());

        const Ecreatetime = new Date()
        const languagesLoad = await GetLanguageList({ shop, source: shopPrimaryLanguage[0].locale });
        const Eendtime = new Date();
        console.log("Ecreatetime: ", Ecreatetime);
        console.log("Eendtime: ", Eendtime);
        console.log("Etiming: ", Eendtime.getTime() - Ecreatetime.getTime());


        return json({
          shop: shop,
          shopLanguagesLoad: shopLanguagesLoad,
          allMarket: allMarket,
          languagesLoad: languagesLoad,
          languageLocaleInfo: languageLocaleInfo,
        });

      case !!addData:
        try {
          const Ccreatetime = new Date()
          let allLanguages: AllLanguagesType[] = await queryAllLanguages({
            request,
          });
          allLanguages = allLanguages.map((language, index) => ({
            ...language,
            key: index,
          }));
          const Cendtime = new Date();
          console.log("Ccreatetime: ", Ccreatetime);
          console.log("Cendtime: ", Cendtime);
          console.log("Ctiming: ", Cendtime.getTime() - Ccreatetime.getTime());

          const Dcreatetime = new Date()
          const allCountryCode = allLanguages.map((item) => item.isoCode);
          const languageLocaleInfo = await GetLanguageLocaleInfo({
            locale: allCountryCode,
          });
          const Dendtime = new Date();
          console.log("Dcreatetime: ", Dcreatetime);
          console.log("Dendtime: ", Dendtime);
          console.log("Dtiming: ", Dendtime.getTime() - Dcreatetime.getTime());
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
          request,
          addLanguages,
        }); // 处理逻辑
        return json({ data: data });

      case !!translation:
        try {
          const words = await GetUserWords({ shop });
          if (words) {
            if (words.chars > words.totalChars) {
              return json({ success: false, message: "user words limit" }, { status: 200 });
            } else {
              console.log(translation);
              const source = translation.primaryLanguage;
              const target = translation.selectedLanguage.locale;
              const data = await GetTranslate({ request, source, target });
              return json({ success: true, data: data });
            }
          }
          return json({ success: false, message: "words get error" }, { status: 200 });
        } catch (error) {
          console.error("Error translation language:", error);
          return json({ error: "Error translation language" }, { status: 500 });
        }

      case !!publishInfo:
        await mutationShopLocalePublish({
          request,
          publishInfos: [publishInfo],
        });
        return null;

      case !!unPublishInfo:
        await mutationShopLocaleUnpublish({
          request,
          publishInfos: [unPublishInfo],
        });
        return null;

      case !!deleteData:
        try {
          if (deleteData.targets.length > 0) {
            const promise = deleteData.targets.map(
              async (item: LanguagesDataType) => {
                return mutationShopLocaleDisable({
                  shop,
                  accessToken,
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
            console.log("deleteData: ", data);
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
  const [shop, setShop] = useState<string>("");
  const [primaryLanguage, setPrimaryLanguage] = useState<ShopLocalesType>();
  const [shopLanguagesLoad, setShopLanguagesLoad] = useState<ShopLocalesType[]>(
    [],
  );
  const [allLanguages, setAllLanguages] = useState<AllLanguagesType[]>([]);
  const [allMarket, setAllMarket] = useState<MarketType[]>([]);
  const [languagesLoad, setLanguagesLoad] = useState<any>();
  const [languageLocaleInfo, setLanguageLocaleInfo] = useState<any>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false); // 控制Modal显示的状态
  const [selectedRow, setSelectedRow] = useState<
    LanguagesDataType | undefined
  >();
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false); // 控制Modal显示的状态
  const [deleteloading, setDeleteLoading] = useState(false);
  const [publishMarket, setPublishMarket] = useState<string>();
  const [publishInfo, setPublishInfo] = useState<PublishInfoType>();
  const [unPublishInfo, setUnpublishInfo] = useState<UnpublishInfoType>();
  // const [disable, setDisable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] =
    useState<boolean>(false);

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const loadingFetcher = useFetcher<FetchType>();
  const deleteFetcher = useFetcher<any>();
  const translateFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const addDataFetcher = useFetcher<any>();

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
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      setShop(loadingFetcher.data.shop);
      setShopLanguagesLoad(loadingFetcher.data.shopLanguagesLoad);
      setAllMarket(loadingFetcher.data.allMarket);
      setLanguagesLoad(loadingFetcher.data.languagesLoad);
      setLanguageLocaleInfo(loadingFetcher.data.languageLocaleInfo);
      setPrimaryLanguage(
        loadingFetcher.data.shopLanguagesLoad?.find(
          (lang) => lang.primary === true,
        ),
      );
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
    if (translateFetcher.data) {
      if (translateFetcher.data.success) {
        message.success(t("The translation task is in progress."));
        dispatch(
          setStatusState({
            target: translateFetcher.data.data.target,
            status: 2,
          }),
        );
      } else {
        setShowWarnModal(true);
      }
    }
  }, [translateFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.data) {
      const deleteData = deleteFetcher.data.data.reduce(
        (acc: any[], item: any) => {
          if (item.status === "fulfilled") {
            acc.push(item.value);
          } else {
            message.error(`Deletion failed for "${item.value}"`);
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
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    if (statusFetcher.data) {
      const items = statusFetcher.data?.data.map((item: any) => {
        if (item?.status === 2) {
          return item;
        } else {
          dispatch(
            setStatusState({ target: item.target, status: item.status }),
          );
        }
      });
      if (items[0] !== undefined) {
        // 加入10秒的延时
        const delayTimeout = setTimeout(() => {
          const formData = new FormData();
          formData.append(
            "statusData",
            JSON.stringify({
              source: primaryLanguage?.locale,
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
    if (!shopLanguagesLoad) return; // 确保数据加载完成后再执行
    const newdata = shopLanguagesLoad.filter((language) => !language.primary);
    const data = newdata.map((lang, i) => ({
      key: i,
      language: lang.name,
      localeName: languageLocaleInfo[newdata[i].locale].Local || "",
      locale: lang.locale,
      primary: lang.primary,
      status:
        languagesLoad ? languagesLoad.find((language: any) => language.target === lang.locale)
          ?.status : 0,
      auto_update_translation: false,
      published: lang.published,
      loading: false,
    }));

    const findItem = data.find((data: any) => data.status === 2);
    if (findItem && primaryLanguage) {
      const formData = new FormData();
      formData.append(
        "statusData",
        JSON.stringify({
          source: primaryLanguage?.locale,
          target: [findItem.locale],
        }),
      );
      statusFetcher.submit(formData, {
        method: "post",
        action: "/app",
      });
    }
    dispatch(setTableData(data));
  }, [shopLanguagesLoad, languagesLoad]); // 依赖 shopLanguagesLoad 和 status

  useEffect(() => {
    if (publishInfo) {
      const formData = new FormData();
      formData.append("publishInfo", JSON.stringify(publishInfo)); // 将选中的语言作为字符串发送
      submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
    }
  }, [publishInfo]);

  useEffect(() => {
    if (unPublishInfo) {
      const formData = new FormData();
      formData.append("unPublishInfo", JSON.stringify(unPublishInfo)); // 将选中的语言作为字符串发送
      submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
    }
  }, [unPublishInfo]);

  useEffect(() => {
    if (dataSource && dataSource.find((item: any) => item.status === 2)) {
      if (primaryLanguage) {
        const formData = new FormData();
        formData.append(
          "statusData",
          JSON.stringify({
            source: primaryLanguage?.locale,
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
      width: "20%",
      render: (_: any, record: any) => {
        return <TranslatedIcon status={record.status} />;
      },
    },
    {
      title: t("Publish"),
      dataIndex: "published",
      key: "published",
      width: "20%",
      render: (_: any, record: any) => (
        <Switch
          checked={record.published}
          onChange={(checked) => handlePublishChange(record.locale, checked)}
          loading={record.loading} // 使用每个项的 loading 状态
        />
      ),
    },
    {
      title: t("Action"),
      dataIndex: "action",
      key: "action",
      width: "30%",
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

    if (checked) {
      dispatch(setPublishLoadingState({ locale, loading: checked }));
      setSelectedRow(row);
      setIsPublishModalOpen(true);
    } else {
      dispatch(setPublishState({ locale, published: checked }));
      if (row)
        setUnpublishInfo({
          locale: row.locale,
          shopLocale: { published: false },
        });
    }
  };

  const handleTranslate = async (locale: string) => {
    navigate("/app/translate", { state: { from: "/app/language", selectedLanguageCode: locale } });
    // const selectedItem = dataSource.find(
    //   (item: LanguagesDataType) => item.locale === locale,
    // );
    // const selectedTranslatingItem = dataSource.find(
    //   (item: LanguagesDataType) => item.status === 2,
    // );
    // if (selectedItem && !selectedTranslatingItem) {
    //   const formData = new FormData();
    //   formData.append(
    //     "translation",
    //     JSON.stringify({
    //       primaryLanguage: primaryLanguage,
    //       selectedLanguage: selectedItem,
    //     }),
    //   ); // 将选中的语言作为字符串发送
    //   translateFetcher.submit(formData, {
    //     method: "post",
    //     action: "/app/language",
    //   }); // 提交表单请求
    //   const installTime = localStorage.getItem('installTime')
    //   if (!installTime) {
    //     localStorage.setItem('installTime', new Date().toISOString());
    //   } else {
    //     const createTime = new Date(installTime);
    //     const currentTime = new Date();

    //     // 计算时间差（毫秒）
    //     const timeDifference = currentTime.getTime() - createTime.getTime();

    //     // 转换为天数（1天 = 24 * 60 * 60 * 1000 毫秒）
    //     const daysDifference = Math.floor(timeDifference / (24 * 60 * 60 * 1000));

    //     // 如果超过3天，显示评分弹窗
    //     if (daysDifference >= 3) {
    //       // 检查localStorage是否已经显示过
    //       const hasShownRating = localStorage.getItem('hasShownRating');
    //       if (!hasShownRating) {
    //         setPreviewModalVisible(true);
    //         // 标记已经显示过
    //         localStorage.setItem('hasShownRating', 'true');
    //       }
    //     }
    //   }
    // } else {
    //   message.error(
    //     t(
    //       "The translation task is in progress. Please try translating again later.",
    //     ),
    //   );
    // }
  };

  const handleConfirmPublishModal = () => {
    if (selectedRow) {
      dispatch(
        setPublishConfirmState({
          locale: selectedRow?.locale,
          published: true,
          loading: false,
        }),
      );
      if (selectedRow.locale && publishMarket) {
        setPublishInfo({
          locale: selectedRow.locale,
          shopLocale: { published: true, marketWebPresenceIds: publishMarket },
        });
      }
    }
    setIsPublishModalOpen(false); // 关闭Modal
  };

  const handleClosePublishModal = () => {
    if (selectedRow) {
      dispatch(
        setPublishLoadingState({ locale: selectedRow?.locale, loading: false }),
        setSelectedRow(undefined),
      );
    }
    setIsPublishModalOpen(false); // 关闭Modal
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
        primaryLanguage: primaryLanguage?.locale,
      }),
    ); // 将选中的语言作为字符串发送
    deleteFetcher.submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
    setDeleteLoading(true);
  };

  const onSelectChange = (newSelectedRowKeys: any) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const PreviewClick = () => {
    const shopUrl = `https://${shop}`;
    window.open(shopUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {showWarnModal && (
        <TranslationWarnModal show={showWarnModal} setShow={setShowWarnModal} />
      )}
      <Page>
        <TitleBar title={t("Language")} />
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <div>
            <Title style={{ fontSize: "1.25rem", display: "inline" }}>
              {t("Languages")}
            </Title>
            <Suspense fallback={<Skeleton active paragraph={{ rows: 0 }} />}>
              <PrimaryLanguage shopLanguages={shopLanguagesLoad} />
            </Suspense>
          </div>
          {/* <ProgressingCard /> */}
          {/* <Suspense fallback={<Skeleton active />}>
            <AttentionCard
              title={t("Translation word credits have been exhausted.")}
              content={t(
                "The translation cannot be completed due to exhausted credits.",
              )}
              show={disable}
            />
          </Suspense> */}
          <div className="languageTable_action">
            <Flex
              align="center"
              justify="space-between" // 使按钮左右分布
              style={{ width: "100%", marginBottom: "16px" }}
            >
              <Flex align="center" gap="middle">
                <Button
                  type="primary"
                  onClick={handleDelete}
                  disabled={!hasSelected}
                  loading={deleteloading}
                >
                  {t("Delete")}
                </Button>
                {hasSelected
                  ? `${t("Selected")} ${selectedRowKeys.length} ${t("items")}`
                  : null}
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
            <Suspense fallback={<Skeleton active />}>
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={dataSource}
                style={{ width: "100%" }}
                loading={deleteloading || loading}
              />
            </Suspense>
          </div>
        </Space>
        <Suspense>
          <AddLanguageModal
            isVisible={isLanguageModalOpen}
            setIsModalOpen={setIsLanguageModalOpen}
            allLanguages={allLanguages}
            languageLocaleInfo={languageLocaleInfo}
            primaryLanguage={primaryLanguage}
          />
        </Suspense>
        <Suspense>
          <PreviewModal
            visible={previewModalVisible}
            setVisible={setPreviewModalVisible}
          />
        </Suspense>
        <Suspense>
          <PublishModal
            isVisible={isPublishModalOpen} // 父组件控制是否显示
            onOk={() => handleConfirmPublishModal()}
            onCancel={() => handleClosePublishModal()}
            setPublishMarket={setPublishMarket}
            selectedRow={selectedRow}
            allMarket={allMarket}
          />
        </Suspense>
      </Page>
    </>
  );
};

export default Index;
