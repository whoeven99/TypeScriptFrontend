import { Page } from "@shopify/polaris";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Flex,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Typography,
} from "antd";
import { useTranslation } from "react-i18next";
import {
  Link,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
} from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { LanguagesDataType } from "../app.language/route";
import { setTableData } from "~/store/modules/languageTableData";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import PaymentModal from "~/components/paymentModal";
import ScrollNotice from "~/components/ScrollNotice";
import { CaretDownOutlined } from "@ant-design/icons";
import { authenticate } from "~/shopify.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import {
  GetGlossaryByShopName,
  GetLanguageList,
  GetLanguageLocaleInfo,
} from "~/api/JavaServer";
import useReport from "scripts/eventReport";
import FirstTranslationModal from "~/components/firstTranslationModal";
import TranslateAffix from "./components/translateAffix";
import LanguageSelectorCard from "./components/languageSelectorCard";
import TransalteSettingCard from "./components/transalteSettingCard";
import ToneSettingCard from "./components/toneSettingCard";
import AdvanceSettingCard from "./components/advanceSettingCard";

const { Title, Text } = Typography;

interface LanguageSettingType {
  primaryLanguage: string;
  primaryLanguageCode: string;
}

export interface apiKeyConfiguration {
  apiModel: string;
  apiName: Number;
  apiStatus: boolean;
  isSelected: boolean;
  promptWord: string;
  shopName: string;
  tokenLimit: Number;
  usedToken: Number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  return {
    shop,
    server: process.env.SERVER_URL,
  };
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();
  const dispatch = useDispatch();
  const languageCardRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher<any>();
  const translateFetcher = useFetcher<any>();
  const loadingLanguageFetcher = useFetcher<any>();
  const customApiKeyFetcher = useFetcher<any>();
  //用户语言数据
  const languageData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  //用户基础数据
  const { plan, isNew } = useSelector((state: any) => state.userConfig);

  //默认语言数据
  const [languageSetting, setLanguageSetting] = useState<LanguageSettingType>();

  //选择的语言数据
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string[]>(
    [],
  );

  //选择的配置数据
  //模型配置
  const [translateSettings1, setTranslateSettings1] = useState<string>("2");
  //语言包配置
  const [translateSettings2, setTranslateSettings2] = useState<string[]>(["1"]);
  //翻译项配置
  const [translateSettings3, setTranslateSettings3] = useState<string[]>([
    "products",
    "collection",
    "article",
    "blog_titles",
    "pages",
    "filters",
    "metaobjects",
    "metadata",
    "navigation",
    "shop",
    "theme",
    "delivery",
    "shipping",
  ]);
  //翻译提示词配置
  const [translateSettings4, setTranslateSettings4] = useState<{
    option1: string;
    option2: string;
    option3: string;
    option4: string;
    option5: string;
  }>({
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    option5: "",
  });
  //术语表配置
  const [translateSettings5, setTranslateSettings5] = useState<boolean>(false);
  //术语表card开关
  const [rotate, setRotate] = useState<boolean>(false);
  //术语表switch开关
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(false);
  //私有key数据
  const [customApikeyData, setCustomApikeyData] =
    useState<apiKeyConfiguration[]>();
  //选择语言卡片报错信息
  const [languageCardWarnText, setLanguageCardWarnText] = useState<string>("");
  //暂时不使用,品牌词switch开关
  const [brandWordOpen, setBrandWordOpen] = useState<boolean>(false);
  //付费表单开关
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  //免费计划使用私有key表单开关
  const [showWarnModal, setShowWarnModal] = useState(false);
  //新人表单开关
  const [firstTranslationModalShow, setFirstTranslationModalShow] =
    useState(false);
  //移动端配置
  const [isMobile, setIsMobile] = useState<boolean>(false);
  //加载状态管理
  const [loadingArray, setLoadingArray] = useState<string[]>(["loading"]);
  //私有key相关报错管理以及开关管理
  const [currentModal, setCurrentModal] = useState<
    "limitExceeded" | "outOfRange" | "interfaceIsOccupied" | ""
  >("");

  const modalTypeObject = {
    limitExceeded: {
      Title: `${t("Insufficient private API quota")}`,
      Body: `${t("The usage has exceeded your configured quota. Please update your settings.")}`,
      Button: `${t("Configure now")}`,
    },
    outOfRange: {
      Title: `${t("Unsupported language")}`,
      Body: `${t("This language is not supported by Google Translate. Check the supported list in Google or switch to another model.")}`,
      Button: `${t("OK")}`,
    },
    interfaceIsOccupied: {
      Title: `${t("Task in progress")}`,
      Body: `${t("Your private API can run only one translation at a time. Please wait until the current task is finished.")}`,
      Button: `${t("OK")}`,
    },
  };

  const toneSettingCardShow = useMemo(() => {
    return translateSettings1 == "1" || translateSettings1 == "2";
  }, [translateSettings1]);

  const { report, trackExposure, fetcherState } = useReport();

  const handleConfigureQuota = () => {
    switch (currentModal) {
      case "limitExceeded":
        navigate("/app/apikeySetting");
        setCurrentModal("");
        break;
      case "outOfRange":
        setCurrentModal("");
        break;
      case "interfaceIsOccupied":
        setCurrentModal("");
        break;
    }
  };

  const checkApiKeyConfiguration = (
    customApikeyData: apiKeyConfiguration[],
    apiName: 0 | 1,
  ): apiKeyConfiguration | null => {
    const matchedItem = customApikeyData.find(
      (item) => item.apiName === apiName,
    );
    return matchedItem || null;
  };

  useEffect(() => {
    loadingLanguageFetcher.submit(
      { languageData: JSON.stringify(true) },
      {
        method: "post",
        action: "/app",
      },
    );
    customApiKeyFetcher.submit(
      {
        customApikeyData: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app",
      },
    );
    fetcher.submit(
      {
        log: `${shop} 目前在翻译设置页面`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    if (location) {
      setSelectedLanguageCode(location?.state?.selectedLanguageCode || "");
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
    if (loadingLanguageFetcher.data) {
      if (loadingLanguageFetcher.data.success) {
        const shopLanguages = loadingLanguageFetcher.data.response;
        const shopPrimaryLanguage = shopLanguages?.filter(
          (language: any) => language?.primary,
        );
        const shopLanguagesWithoutPrimaryIndex = shopLanguages?.filter(
          (language: any) => !language?.primary,
        );
        const shopLocalesIndex = shopLanguagesWithoutPrimaryIndex?.map(
          (item: any) => item?.locale,
        );
        setLanguageSetting({
          primaryLanguage: shopPrimaryLanguage[0]?.name || "",
          primaryLanguageCode: shopPrimaryLanguage[0]?.locale || "",
        });

        let data = shopLanguagesWithoutPrimaryIndex.map(
          (lang: any, index: number) => ({
            key: index,
            name: lang?.name,
            locale: lang?.locale,
            published: lang.published,
          }),
        );
        const GetLanguageDataFront = async () => {
          const languageLocaleInfo = await GetLanguageLocaleInfo({
            server: server as string,
            locale: shopLocalesIndex,
          });
          const languageList = await GetLanguageList({
            shop,
            server: server as string,
            source: shopPrimaryLanguage[0]?.locale,
          });

          dispatch(
            setTableData(
              data.map((item: any) => ({
                ...item, // 展开原对象
                language: item.name,
                src: languageLocaleInfo?.response
                  ? languageLocaleInfo?.response[item?.locale]?.countries
                  : [], // 插入新字段
                localeName: languageLocaleInfo?.response
                  ? languageLocaleInfo?.response[item?.locale]?.Local
                  : "", // 插入新字段
                status: languageList?.response
                  ? languageList?.response.find(
                      (language: any) => language.target === item.locale,
                    )?.status
                  : 0,
              })),
            ),
          );

          fetcher.submit(
            {
              log: `${shop} 翻译设置页面数据加载完毕`,
            },
            {
              method: "POST",
              action: "/log",
            },
          );

          setLoadingArray((prev) => prev.filter((item) => item !== "loading"));
        };
        GetLanguageDataFront();
      }
    }
  }, [loadingLanguageFetcher.data]);

  useEffect(() => {
    if (customApiKeyFetcher.data && customApiKeyFetcher.data.customApikeyData) {
      // 过滤 success 为 true 且 response 中有非空 apiKey 的条目
      const filteredData = customApiKeyFetcher.data.customApikeyData
        .filter((item: any) => item.success && item.response)
        .map((item: any) => ({
          apiModel: item.response.apiModel,
          apiName: item.response.apiName,
          apiStatus: item.response.apiStatus,
          isSelected: item.response.isSelected,
          promptWord: item.response.promptWord,
          shopName: item.response.shopName,
          tokenLimit: item.response.tokenLimit,
          usedToken: item.response.usedToken,
        }));
      setCustomApikeyData(filteredData);
    }
  }, [customApiKeyFetcher.data]);

  useEffect(() => {
    if (translateFetcher.data) {
      if (translateFetcher.data?.success) {
        shopify.toast.show(t("The translation task is in progress."));
        navigate("/app");
        fetcher.submit(
          {
            log: `${shop} 翻译成功, 正在跳转至主页面`,
          },
          {
            method: "POST",
            action: "/log",
          },
        );
      } else if (!translateFetcher.data?.success) {
        if (
          translateFetcher.data?.response?.translateSettings1 !== "8" &&
          translateFetcher.data?.response?.translateSettings1 !== "9"
        ) {
          if (isNew) {
            setFirstTranslationModalShow(true);
          } else {
            setShowPaymentModal(true);
          }
        }
        if (translateFetcher?.data?.errorCode === 10014) {
          setCurrentModal("outOfRange");
        }
        if (translateFetcher?.data?.errorCode === 10015) {
          setCurrentModal("interfaceIsOccupied");
        }
      }
    }
  }, [translateFetcher.data]);

  const onChange = (e: string[]) => {
    if (languageCardRef.current) {
      languageCardRef.current.style.border = "1px solid #f0f0f0";
    }
    if (languageCardWarnText) {
      setLanguageCardWarnText("");
    }

    setSelectedLanguageCode(e);
  };

  const handleNavigateBack = () => {
    try {
      // 尝试获取浏览历史长度
      if (location.state.from) {
        // 如果有历史记录，则返回上一页
        navigate(location.state.from);
      } else {
        // 如果没有历史记录，则导航到 /app
        navigate("/app");
      }
    } catch (error) {
      // 如果出现任何错误，默认导航到 /app
      navigate("/app");
    }
  };

  const handleUsePrivateApi = () => {
    if (plan?.id <= 2 || !plan?.id) {
      setShowWarnModal(true);
      return;
    }
    navigate("/app/apikeySetting");
    fetcher.submit(
      {
        log: `${shop} 前往私有key页面, 从翻译设置页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    report(
      {},
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "translate_setting_api",
    );
  };

  const checkIfNeedPay = async () => {
    if (!languageSetting?.primaryLanguageCode) {
      shopify.toast.show(t("Please set the primary language first."));
      return;
    }
    if (!selectedLanguageCode?.length) {
      if (languageCardRef.current) {
        languageCardRef.current.style.border = "1px solid red";
      }
      setLanguageCardWarnText("Please select a language to translate first.");
      return;
    }
    if (translateSettings3.every((item) => item === "handle")) {
      shopify.toast.show(
        t("Handle needs to be used with 'Products item' or other items."),
      );
      return;
    }
    if (
      (translateSettings1 === "8" || translateSettings1 === "9") &&
      selectedLanguageCode.length >= 2
    ) {
      shopify.toast.show(
        t(
          "Select a private key for translation. Only one target language can be selected.",
        ),
      );
      return;
    }
    switch (translateSettings1) {
      case "8":
        if (customApikeyData) {
          const useData = checkApiKeyConfiguration(customApikeyData, 0);

          if (useData && useData?.usedToken >= useData?.tokenLimit) {
            // 如果私有key的额度超限，弹出提示框
            setCurrentModal("limitExceeded");
            return false;
          }
        }
        break;
      case "9":
        if (customApikeyData) {
          const useData = checkApiKeyConfiguration(customApikeyData, 1);
          if (useData && useData?.usedToken >= useData?.tokenLimit) {
            // 如果私有key的额度超限，弹出提示框
            setCurrentModal("limitExceeded");
            return false;
          }
        }
        break;
      default:
        console.log(
          `Unsupported translateSettings1 value: ${translateSettings1}`,
        );
        break;
    }
    // if (!checkCanTranslate()) {
    //   return;
    // }
    const selectedItems = languageData.find((item: LanguagesDataType) =>
      selectedLanguageCode.includes(item.locale),
    );
    const selectedTranslatingItem = languageData.find(
      (item: LanguagesDataType) => item.status === 2,
    );

    if (selectedItems && !selectedTranslatingItem) {
      handleTranslate();
    } else {
      shopify.toast.show(
        t(
          "The translation task is in progress. Please try translating again later.",
        ),
      );
      // setCurrentModal("interfaceIsOccupied");
      // setIsApiKeyModalOpen(true);
    }
  };

  const handleTranslate = async () => {
    const customKey = `${translateSettings4.option2 && `in the style of ${translateSettings4.option2}, `}${translateSettings4.option1 && `with a ${translateSettings4.option1} tone, `}${translateSettings4.option4 && `with a ${translateSettings4.option4} format, `}${translateSettings4.option3 && `with a ${translateSettings4.option3} focus. `}`;
    translateFetcher.submit(
      {
        translation: JSON.stringify({
          primaryLanguage: languageSetting?.primaryLanguageCode,
          selectedLanguage: selectedLanguageCode,
          translateSettings1: translateSettings1,
          translateSettings2: ["1"],
          translateSettings3: translateSettings3,
          customKey: customKey,
          translateSettings5: translateSettings5,
        }),
      },
      {
        method: "post",
        action: "/app/language",
      },
    );
    localStorage.setItem(
      "translateSettings4",
      JSON.stringify(translateSettings4),
    );
    report(
      {
        primaryLanguage: languageSetting?.primaryLanguageCode,
        selectedLanguage: selectedLanguageCode,
        translateSettings1: translateSettings1,
        translateSettings2: ["1"],
        translateSettings3: translateSettings3,
        customKey: customKey,
        translateSettings5: translateSettings5,
      },
      { method: "post", action: "/app", eventType: "click" },
      "translate_navi_translate",
    );
  };

  const handleAdvanceSettingChange = async (type: "glossary" | "brand") => {
    if (loadingArray.some((item) => ["glossary", "brand"].includes(item)))
      return;

    setLoadingArray([...loadingArray, type]);

    let error;

    const data = await GetGlossaryByShopName({
      shop,
      server: server as string,
    });

    if (data?.success) {
      if (data.response?.length == 0) {
        error = 2;
      } else if (data.response?.every((item: any) => item?.status == 0)) {
        error = 3;
      }
    } else {
      error = 1;
    }
    switch (true) {
      case error == 1 || error == 2:
        shopify.toast.show(t("No available glossary found"));
        break;
      case error == 3:
        shopify.toast.show(t("You don’t have any glossary active right now"));
        break;
      default:
        if (type == "glossary") {
          setGlossaryOpen(!glossaryOpen);
        } else if (type == "brand") {
          setBrandWordOpen(!brandWordOpen);
        }
    }
    const newArray = loadingArray.filter((item) => item == type);
    setLoadingArray(newArray);
  };

  return (
    <Page>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space
        direction="vertical"
        size="middle"
        style={{
          display: "flex",
        }}
      >
        <TranslateAffix
          loading={loadingArray.includes("loading")}
          languageData={languageData}
          selectedLanguageCode={selectedLanguageCode}
          translateFetcher={translateFetcher}
          handleNavigateBack={handleNavigateBack}
          checkIfNeedPay={checkIfNeedPay}
        />

        <Divider style={{ margin: "0" }} />

        {loadingArray.includes("loading") ? (
          <Skeleton.Button active style={{ height: 600 }} block />
        ) : languageData.length != 0 ? (
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <Title
              style={{
                margin: "0",
                fontSize: "1.25rem",
                fontWeight: 700,
                paddingLeft: "8px",
              }}
            >
              {t("translateSettings.title1")}
            </Title>
            <div style={{ paddingLeft: "8px" }}>
              <Text>{t("Your store's default language:")}</Text>{" "}
              <Text strong>
                {languageSetting?.primaryLanguage ? (
                  languageSetting?.primaryLanguage
                ) : (
                  <Skeleton active paragraph={{ rows: 0 }} />
                )}
              </Text>
            </div>
            <LanguageSelectorCard
              ref={languageCardRef}
              selectedLanguageCode={selectedLanguageCode}
              onChange={onChange}
              languageData={languageData}
              languageCardWarnText={languageCardWarnText}
            />
            <Link to={"/app/language"} style={{ paddingLeft: "8px" }}>
              {t(
                "Can't find the language you want to translate into? Click here to add a language.",
              )}
            </Link>
            <div style={{ paddingLeft: "8px" }}>
              <Title
                style={{
                  margin: "0",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {t("translateSettings.title2")}
              </Title>
            </div>
            <TransalteSettingCard
              translateSettings1={translateSettings1}
              setTranslateSettings1={setTranslateSettings1}
              customApikeyData={customApikeyData}
              checkApiKeyConfiguration={checkApiKeyConfiguration}
              translateSettings3={translateSettings3}
              setTranslateSettings3={setTranslateSettings3}
              translateSettings5={translateSettings5}
              setTranslateSettings5={setTranslateSettings5}
              handleUsePrivateApi={handleUsePrivateApi}
              isMobile={isMobile}
              plan={plan}
            />
            {toneSettingCardShow && (
              <div
                style={{
                  paddingLeft: "8px",
                }}
              >
                <Title
                  style={{
                    margin: "0",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                  }}
                >
                  {t("translateSettings.title3")}
                </Title>
              </div>
            )}
            <ToneSettingCard
              toneSettingCardShow={toneSettingCardShow}
              translateSettings2={translateSettings2}
              setTranslateSettings2={setTranslateSettings2}
              translateSettings4={translateSettings4}
              setTranslateSettings4={setTranslateSettings4}
            />
            <AdvanceSettingCard
              rotate={rotate}
              setRotate={setRotate}
              glossaryOpen={glossaryOpen}
              loadingArray={loadingArray}
              handleAdvanceSettingChange={handleAdvanceSettingChange}
            />
          </Space>
        ) : (
          <NoLanguageSetCard />
        )}
        <FirstTranslationModal
          show={firstTranslationModalShow}
          setShow={setFirstTranslationModalShow}
        />
        <Modal
          open={!!currentModal}
          onCancel={() => setCurrentModal("")}
          title={currentModal && modalTypeObject[currentModal].Title}
          centered
          footer={
            <Button type="primary" onClick={handleConfigureQuota}>
              {currentModal && modalTypeObject[currentModal].Button}
            </Button>
          }
        >
          <Text>{currentModal && modalTypeObject[currentModal].Body}</Text>
        </Modal>
        <Modal
          title={t("Feature Unavailable")}
          open={showWarnModal}
          onCancel={() => setShowWarnModal(false)}
          centered
          width={700}
          footer={
            <Button type="primary" onClick={() => navigate("/app/pricing")}>
              {t("Upgrade")}
            </Button>
          }
        >
          <Text>{t("This feature is available only with the paid plan.")}</Text>
        </Modal>
      </Space>
      <PaymentModal
        visible={showPaymentModal}
        setVisible={setShowPaymentModal}
      />
    </Page>
  );
};

export default Index;
