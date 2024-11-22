import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Typography, Button, Space, Flex, Table, Switch, Skeleton } from "antd";
import { lazy, Suspense, useEffect, useState } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react";
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
  GetLanguageData,
  GetTranslate,
  GetUserWords,
} from "~/api/serve";
import TranslatedIcon from "~/components/translateIcon";
import { WordsType } from "../app._index/route";

const PrimaryLanguage = lazy(() => import("./components/primaryLanguage"));
const AddLanguageModal = lazy(() => import("./components/addLanguageModal"));
const PublishModal = lazy(() => import("./components/publishModal"));

const { Title } = Typography;

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
  languageData: any;
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
    const loading = JSON.parse(formData.get("loading") as string); // 获取语言数组
    const selectedLanguages: string[] = JSON.parse(formData.get("selectedLanguages") as string); // 获取语言数组
    const translation = JSON.parse(formData.get("translation") as string);
    const publishInfo: PublishInfoType = JSON.parse(
      formData.get("publishInfo") as string,
    );
    const unPublishInfo: UnpublishInfoType = JSON.parse(
      formData.get("unPublishInfo") as string,
    );
    const deleteData: LanguagesDataType[] = JSON.parse(
      formData.get("deleteData") as string,
    );

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
        const languageData = await GetLanguageData({ locale: allCountryCode });

        const words = await GetUserWords({ shop });
        const languagesLoad = await GetLanguageList({ shop, accessToken });

        return json({
          shop: shop,
          allCountryCode: allCountryCode,
          shopLanguagesLoad: shopLanguagesLoad,
          allLanguages: allLanguages,
          allMarket: allMarket,
          languagesLoad: languagesLoad,
          languageData: languageData,
          words: words,
        });
      case !!selectedLanguages:
        await mutationShopLocaleEnable({ request, selectedLanguages }); // 处理逻辑
        const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
        return json({ success: true, shopLanguages });

      case !!translation:
        const source = translation.primaryLanguage.locale;
        const target = translation.selectedLanguage.locale;
        const statu = await GetTranslate({ request, source, target });
        return statu;

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
        await mutationShopLocaleDisable({ request, languages: deleteData });
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
  const [shopLanguagesLoad, setShopLanguagesLoad] = useState<ShopLocalesType[]>(
    [],
  );
  const [allLanguages, setAllLanguages] = useState<AllLanguagesType[]>([]);
  const [allMarket, setAllMarket] = useState<MarketType[]>([]);
  const [languagesLoad, setLanguagesLoad] = useState<any>();
  const [languageData, setLanguageData] = useState<any>();
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
  const submit = useSubmit(); // 使用 useSubmit 钩子

  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const primaryLanguage: ShopLocalesType | undefined = shopLanguagesLoad?.find(
    (lang) => lang.primary,
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
      setLanguageData(fetcher.data.languageData);
      setWords(fetcher.data.words);
      shopify.loading(false);
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (words && words.chars > words.totalChars) setDisable(true);
  }, [words]);

  useEffect(() => {
    if (!shopLanguagesLoad || !languagesLoad) return; // 确保数据加载完成后再执行
    const newdata = shopLanguagesLoad.filter((language) => !language.primary);
    const data = newdata.map((lang, i) => ({
      key: i,
      language: `${lang.name}(${languageData[newdata[i].locale].Local})`,
      locale: lang.locale,
      primary: lang.primary,
      status:
        languagesLoad.find((statu: any) => statu.target === lang.locale)
          ?.status || 0,
      auto_update_translation: false,
      published: lang.published,
      loading: false,
    }));

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
          onChange={(checked) => handlePublishChange(record.key, checked)}
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
          {record.status === 2 ? (
            <Button disabled style={{ width: "100px" }}>
              Translating
            </Button>
          ) : record.status ? (
            <Button disabled style={{ width: "100px" }}>
              Translated
            </Button>
          ) : (
            <Button
              onClick={() => handleTranslate(record.key)}
              style={{ width: "100px" }}
              type="primary"
            >
              Translate
            </Button>
          )}
          <Button>
            <Link to={`/app/manage_translation?language=${record.locale}`}>
              Manage
            </Link>
          </Button>
        </Space>
      ),
    },
  ];

  const handleOpenModal = () => {
    setIsLanguageModalOpen(true); // 打开Modal
  };

  const handlePublishChange = (key: number, checked: boolean) => {
    const row = data.find((item: any) => item.key === key);

    if (checked) {
      dispatch(setPublishLoadingState({ key, loading: checked }));
      setSelectedRow(row);
      setIsPublishModalOpen(true);
    } else {
      dispatch(setPublishState({ key, published: checked }));
      if (row)
        setUnpublishInfo({
          locale: row.locale,
          shopLocale: { published: false },
        });
    }
  };

  const handleTranslate = async (key: number) => {
    const selectedKey = data.find((item: { key: number }) => item.key === key);
    if (selectedKey && shopLanguagesLoad) {
      const selectedLanguage = shopLanguagesLoad.find(
        (item) => item.name === selectedKey.language,
      );
      if (selectedLanguage) {
        // const formData = new FormData();
        // formData.append(
        //   "translation",
        //   JSON.stringify({
        //     primaryLanguage: primaryLanguage,
        //     selectedLanguage: selectedLanguage,
        //   }),
        // ); // 将选中的语言作为字符串发送
        // submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
        // dispatch(setStatuState({ key, status: 2 }));
      }
    }
  };

  const handleConfirmPublishModal = () => {
    if (selectedRow) {
      dispatch(
        setPublishConfirmState({
          key: selectedRow?.key,
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
        setPublishLoadingState({ key: selectedRow?.key, loading: false }),
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
    formData.append("deleteData", JSON.stringify(deleteData)); // 将选中的语言作为字符串发送
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
              <PrimaryLanguage shopLanguages={shopLanguagesLoad} />{" "}
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
          <Suspense fallback={<Skeleton active />}>
            <AddLanguageModal
              isVisible={isLanguageModalOpen}
              setIsModalOpen={setIsLanguageModalOpen}
              allLanguages={allLanguages}
              submit={submit}
              languageData={languageData}
            />
          </Suspense>
          <Suspense fallback={<Skeleton active />}>
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
