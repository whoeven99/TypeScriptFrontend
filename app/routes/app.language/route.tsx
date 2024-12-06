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
import { lazy, Suspense, useEffect, useState } from "react";
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
  setStatuState,
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

const PrimaryLanguage = lazy(() => import("./components/primaryLanguage"));
const AddLanguageModal = lazy(() => import("./components/addLanguageModal"));
const PublishModal = lazy(() => import("./components/publishModal"));

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
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
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
          shop,
          accessToken,
        });
        const allMarket: MarketType[] = await queryAllMarket({ request });
        let allLanguages: AllLanguagesType[] = await queryAllLanguages({
          request,
        });
        allLanguages = allLanguages.map((language, index) => ({
          ...language,
          key: index,
        }));
        const allCountryCode = allLanguages.map((item) => item.isoCode);
        const languageLocaleInfo = await GetLanguageLocaleInfo({
          locale: allCountryCode,
        });

        const words = await GetUserWords({ shop });
        const languagesLoad = await GetLanguageList({ shop, accessToken });

        return json({
          shop: shop,
          allCountryCode: allCountryCode,
          shopLanguagesLoad: shopLanguagesLoad,
          allLanguages: allLanguages,
          allMarket: allMarket,
          languagesLoad: languagesLoad,
          languageLocaleInfo: languageLocaleInfo,
          words: words,
        });
      case !!addLanguages:
        const data = await mutationShopLocaleEnable({
          request,
          addLanguages,
        }); // 处理逻辑
        return json({ data: data });
      case !!translation:
        console.log(translation);
        const source = translation.primaryLanguage.locale;
        const target = translation.selectedLanguage.locale;
        const status = await GetTranslate({ request, source, target });
        return json({ status: status });

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
        await mutationShopLocaleDisable({
          request,
          languages: deleteData.deleteData,
          primaryLanguageCode: deleteData.primaryLanguageCode,
        });
        return null;

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
  const [allCountryCode, setAllCountryCode] = useState<string[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState<ShopLocalesType>();
  const [shopLanguagesLoad, setShopLanguagesLoad] = useState<ShopLocalesType[]>(
    [],
  );
  const [allLanguages, setAllLanguages] = useState<AllLanguagesType[]>([]);
  const [allMarket, setAllMarket] = useState<MarketType[]>([]);
  const [languagesLoad, setLanguagesLoad] = useState<any>();
  const [languageLocaleInfo, setLanguageLocaleInfo] = useState<any>();
  const [words, setWords] = useState<WordsType>();
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
  const [disable, setDisable] = useState<boolean>(false);
  const [data, setData] = useState<LanguagesDataType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const dispatch = useDispatch();
  const fetcher = useFetcher<FetchType>();
  const addFetcher = useFetcher<any>();
  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const translateFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();

  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    fetcher.submit(formData, {
      method: "post",
      action: "/app/language",
    });
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setShop(fetcher.data.shop);
      setAllCountryCode(fetcher.data.allCountryCode);
      setShopLanguagesLoad(fetcher.data.shopLanguagesLoad);
      setAllLanguages(fetcher.data.allLanguages);
      setAllMarket(fetcher.data.allMarket);
      setLanguagesLoad(fetcher.data.languagesLoad);
      setLanguageLocaleInfo(fetcher.data.languageLocaleInfo);
      setWords(fetcher.data.words);
      shopify.loading(false);
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (shopLanguagesLoad) {
      setPrimaryLanguage(
        shopLanguagesLoad?.find((lang) => lang.primary === true),
      );
    }
  }, [shopLanguagesLoad]);

  useEffect(() => {
    if (translateFetcher.data && translateFetcher.data.status) {
      if (translateFetcher.data.status.success) {
      } else {
        console.log(translateFetcher.data);
        message.error(translateFetcher.data.status.errorMsg);
        dispatch(
          setStatuState({
            target: translateFetcher.data.status.target,
            status: 3,
          }),
        );
      }
    }
  }, [translateFetcher.data]);

  useEffect(() => {
    if (statusFetcher.data) {
      const items = statusFetcher.data.data.map((item: any) => {
        console.log(item);
        if (item?.status === 2) {
          return item;
        } else {
          dispatch(setStatuState({ target: item.target, status: item.status }));
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

  useEffect(() => {
    if (words && words.chars > words.totalChars) setDisable(true);
  }, [words]);

  useEffect(() => {
    if (!shopLanguagesLoad || !languagesLoad) return; // 确保数据加载完成后再执行
    const newdata = shopLanguagesLoad.filter((language) => !language.primary);
    const data = newdata.map((lang, i) => ({
      key: i,
      language: lang.name,
      localeName: languageLocaleInfo[newdata[i].locale].Local,
      locale: lang.locale,
      primary: lang.primary,
      status:
        languagesLoad.find((language: any) => language.target === lang.locale)
          ?.status || 0,
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
    setData(dataSource);
  }, [dataSource]);

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

  const columns = [
    {
      title: "Language",
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
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: "20%",
      render: (_: any, record: any) => {
        return <TranslatedIcon status={record.status} />;
      },
    },
    {
      title: "Publish",
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
      title: "Action",
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
            Translate
          </Button>
          <Button
            onClick={() => {
              navigate("/app/manage_translation", {
                state: { key: record.locale },
              });
            }}
          >
            Manage
          </Button>
        </Space>
      ),
    },
  ];

  const handleOpenModal = () => {
    setIsLanguageModalOpen(true); // 打开Modal
  };

  const handlePublishChange = (locale: string, checked: boolean) => {
    const row = data.find((item: any) => item.locale === locale);

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
    const selectedItem = data.find(
      (item: LanguagesDataType) => item.locale === locale,
    );
    const selectedTranslatingItem = data.find(
      (item: LanguagesDataType) => item.status === 2,
    );
    if (selectedItem && !selectedTranslatingItem) {
      const formData = new FormData();
      formData.append(
        "translation",
        JSON.stringify({
          primaryLanguage: primaryLanguage,
          selectedLanguage: selectedItem,
        }),
      ); // 将选中的语言作为字符串发送
      translateFetcher.submit(formData, {
        method: "post",
        action: "/app/language",
      }); // 提交表单请求

      message.success("The translation task is in progress.");
      dispatch(
        setStatuState({
          target: selectedItem.locale,
          status: 2,
        }),
      );
    } else {
      message.error("The translation task is in progress. Please try translating again later.");
    }
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
    const newData = data.filter(
      (item: LanguagesDataType) => !selectedRowKeys.includes(item.key),
    );
    const deleteData = data.filter((item: LanguagesDataType) =>
      selectedRowKeys.includes(item.key),
    );

    const formData = new FormData();
    formData.append(
      "deleteData",
      JSON.stringify({
        deleteData: deleteData,
        primaryLanguage: primaryLanguage?.locale,
      }),
    ); // 将选中的语言作为字符串发送
    submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求

    dispatch(setTableData(newData)); // 更新表格数据
    setSelectedRowKeys([]); // 清空已选中项
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
    <Page>
      <TitleBar title="Language" />
      {loading ? (
        <div>loading...</div>
      ) : (
        <div>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div>
              <Title style={{ fontSize: "1.25rem", display: "inline" }}>
                Languages
              </Title>
              <PrimaryLanguage shopLanguages={shopLanguagesLoad} />
            </div>
            <AttentionCard
              title="Translation word credits have been exhausted."
              content="The translation cannot be completed due to exhausted credits."
              buttonContent="Get more word credits"
              show={disable}
            />
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
                    Delete
                  </Button>
                  {hasSelected
                    ? `Selected ${selectedRowKeys.length} items`
                    : null}
                </Flex>
                <div>
                  <Space>
                    <Button type="default" onClick={PreviewClick}>
                      Preview store
                    </Button>
                    <Button type="primary" onClick={handleOpenModal}>
                      Add Language
                    </Button>
                  </Space>
                </div>
              </Flex>
              <Suspense fallback={<Skeleton active />}>
                <Table
                  rowSelection={rowSelection}
                  columns={columns}
                  dataSource={data}
                  style={{ width: "100%" }}
                />
              </Suspense>
            </div>
          </Space>
          <Suspense>
            <AddLanguageModal
              isVisible={isLanguageModalOpen}
              setIsModalOpen={setIsLanguageModalOpen}
              allLanguages={allLanguages}
              addFetcher={addFetcher}
              languageLocaleInfo={languageLocaleInfo}
              primaryLanguage={primaryLanguage}
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
        </div>
      )}
    </Page>
  );
};

export default Index;
