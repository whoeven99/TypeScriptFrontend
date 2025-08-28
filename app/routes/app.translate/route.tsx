import { Icon, Page } from "@shopify/polaris";
import { useEffect, useRef, useState } from "react";
import {
  Affix,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Radio,
  RadioChangeEvent,
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
import {
  CaretDownOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { authenticate } from "~/shopify.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { ArrowLeftIcon, PlusIcon } from "@shopify/polaris-icons";
import styles from "./styles.module.css";
import defaultStyles from "../styles/defaultStyles.module.css";
import EasyTranslateIcon from "~/components/easyTranslateIcon";
import {
  GetGlossaryByShopName,
  GetLanguageList,
  GetLanguageLocaleInfo,
  GetUserWords,
} from "~/api/JavaServer";

const { Title, Text } = Typography;

interface LanguageDataType {
  key: number;
  src: string[];
  name: string;
  locale: string;
  localeName: string;
  status: number;
  published: boolean;
}

interface LanguageSettingType {
  primaryLanguage: string;
  primaryLanguageCode: string;
}

interface apiKeyConfiguration {
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
  console.log(`${shop} 目前在翻译设置页面`);
  return {
    shop,
    server: process.env.SERVER_URL,
  };
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();
  const [languageData, setLanguageData] = useState<LanguageDataType[]>([]);
  const [languageSetting, setLanguageSetting] = useState<LanguageSettingType>();
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string[]>(
    [],
  );
  const [translateSettings1, setTranslateSettings1] = useState<string>("2");
  const [translateSettings2, setTranslateSettings2] = useState<string[]>(["1"]);
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
  const [translateSettings5, setTranslateSettings5] = useState<boolean>(false);
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(false);
  const [brandWordOpen, setBrandWordOpen] = useState<boolean>(false);
  const [model, setModel] = useState<any>("");
  const [loadingLanguage, setLoadingLanguage] = useState<boolean>(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customApikeyData, setCustomApikeyData] =
    useState<apiKeyConfiguration[]>();
  const [needPay, setNeedPay] = useState<boolean>(false);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState<string[]>([]);
  const [languageCardWarnText, setLanguageCardWarnText] = useState<string>("");
  const [rotate, setRotate] = useState<boolean>(false);
  const [loadingArray, setLoadingArray] = useState<string[]>([]);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showWarnModal, setShowWarnModal] = useState(false);

  const dispatch = useDispatch();
  const languageCardRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [currentModal, setCurrentModal] = useState<
    "limitExceeded" | "outOfRange" | "interfaceIsOccupied"
  >("limitExceeded");
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

  const fetcher = useFetcher<any>();
  const translateFetcher = useFetcher<any>();
  const loadingLanguageFetcher = useFetcher<any>();
  const customApiKeyFetcher = useFetcher<any>();

  const handleConfigureQuota = () => {
    switch (currentModal) {
      case "limitExceeded":
        navigate("/app/apikeySetting");
        setIsApiKeyModalOpen(false);
        break;
      case "outOfRange":
        setIsApiKeyModalOpen(false);
        break;
      case "interfaceIsOccupied":
        setIsApiKeyModalOpen(false);
        break;
    }
  };

  const handleApiKeyModalClose = () => {
    setIsApiKeyModalOpen(false);
  };
  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const { plan } = useSelector((state: any) => state.userConfig);

  function checkApiKeyConfiguration(
    customApikeyData: apiKeyConfiguration[],
    apiName: 0 | 1,
  ): apiKeyConfiguration | null {
    const matchedItem = customApikeyData.find(
      (item) => item.apiName === apiName,
    );
    return matchedItem || null;
  }

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

          setLanguageData(
            data.map((item: any) => ({
              ...item, // 展开原对象
              ["src"]: languageLocaleInfo?.response
                ? languageLocaleInfo?.response[item?.locale]?.countries
                : [], // 插入新字段
              ["localeName"]: languageLocaleInfo?.response
                ? languageLocaleInfo?.response[item?.locale]?.Local
                : "", // 插入新字段
              ["status"]: languageList?.response
                ? languageList?.response.find(
                    (language: any) => language.target === item.locale,
                  )?.status
                : 0,
            })),
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

          setLoadingLanguage(false);
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
          const getUserWords = async () => {
            const data = await GetUserWords({ shop, server });
            if (data.success) {
              if (data?.response?.totalChars <= data?.response?.chars) {
                setNeedPay(true);
                setShowPaymentModal(true);
              }
            } else {
              shopify.toast.show(
                t(
                  "The query of the remaining credits failed. Please try again.",
                ),
              );
            }
          };
          getUserWords();
        }

        if (translateFetcher?.data?.errorCode === 10014) {
          setCurrentModal("outOfRange");
          setIsApiKeyModalOpen(true);
        }
        if (translateFetcher?.data?.errorCode === 10015) {
          setCurrentModal("interfaceIsOccupied");
          setIsApiKeyModalOpen(true);
        }
      }
    }
  }, [translateFetcher.data]);

  useEffect(() => {
    if (languageData.length) {
      const data = languageData.map((lang) => ({
        key: lang.key,
        language: lang.name,
        localeName: lang.localeName,
        locale: lang.locale,
        primary: false,
        status: lang.status || 0,
        auto_update_translation: false,
        published: lang.published,
        loading: false,
      }));
      dispatch(setTableData(data)); // 只在组件首次渲染时触发
    }
  }, [languageData]);

  const translateSettings1Options = [
    {
      label: t("ChatGPT 4.1"),
      description: t("translateSettings1.description1"),
      speed: 2,
      price: 5,
      value: "2",
    },
    {
      label: t("DeepL"),
      description: t("translateSettings1.description2"),
      speed: 2,
      price: 4,
      value: "3",
    },
    {
      label: t("DeepSeek"),
      description: t("translateSettings1.description3"),
      speed: 1,
      price: 2,
      value: "1",
    },
    {
      label: t("Google Translation"),
      description: t("translateSettings1.description4"),
      speed: 1,
      price: 4,
      value: "4",
    },
  ];

  const translateSettings2Options = [
    {
      label: t("General"),
      value: "1",
    },
    {
      label: t("Fashion & Apparel"),
      value: "2",
    },
    {
      label: t("Electronics & Technology"),
      value: "3",
    },
    {
      label: t("Home Goods & Daily Essentials"),
      value: "4",
    },
    {
      label: t("Pet Supplies"),
      value: "5",
    },
    {
      label: t("Beauty & Personal Care"),
      value: "6",
    },
    {
      label: t("Furniture & Gardening"),
      value: "7",
    },
    {
      label: t("Hardware & Tools"),
      value: "8",
    },
    {
      label: t("Baby & Toddler Products"),
      value: "9",
    },
    {
      label: t("Toys & Games"),
      value: "10",
    },
    {
      label: t("Luggage & Accessories"),
      value: "11",
    },
    {
      label: t("Health & Nutrition"),
      value: "12",
    },
    {
      label: t("Outdoor & Sports"),
      value: "13",
    },
    {
      label: t("Crafts & Small Goods"),
      value: "14",
    },
    {
      label: t("Home Appliances"),
      value: "15",
    },
    {
      label: t("Automotive Parts"),
      value: "16",
    },
  ];

  const translateSettings3Options = [
    {
      label: t("Products"),
      value: "products",
    },
    {
      label: t("Collections"),
      value: "collection",
    },
    {
      label: t("Articles"),
      value: "article",
    },
    {
      label: t("Blog titles"),
      value: "blog_titles",
    },
    {
      label: t("Pages"),
      value: "pages",
    },
    {
      label: t("Filters"),
      value: "filters",
    },
    {
      label: t("Metaobjects"),
      value: "metaobjects",
    },
    {
      label: t("Store metadata"),
      value: "metadata",
    },
    // {
    //   label: t("Email"),
    //   value: "notifications",
    // },
    {
      label: t("Policies"),
      value: "policies",
    },
    {
      label: t("Navigation"),
      value: "navigation",
    },
    {
      label: t("Shop"),
      value: "shop",
    },
    {
      label: t("Theme"),
      value: "theme",
    },
    {
      label: t("Delivery"),
      value: "delivery",
    },
    {
      label: t("Shipping"),
      value: "shipping",
    },
    {
      label: "Handle(URL)",
      value: "handle",
    },
  ];

  const translateSettings5Options = [
    {
      label: t("Full Translation"),
      description: t("translateSettings5.description1"),
      value: true,
    },
    {
      label: t("Update Translation"),
      description: t("translateSettings5.description2"),
      value: false,
    },
  ];

  const onChange = (e: string[]) => {
    if (languageCardRef.current) {
      languageCardRef.current.style.border = "1px solid #f0f0f0";
    }
    if (languageCardWarnText) {
      setLanguageCardWarnText("");
    }
    // if (e.length > 5) {
    //   shopify.toast.show(t("You can select up to 5 languages at once."));
    //   return;
    // }
    setSelectedLanguageCode(e);
  };

  const handleNavigate = () => {
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
    if (plan <= 2 || !plan) {
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
    const selectedItems = dataSource.find((item: LanguagesDataType) =>
      selectedLanguageCode.includes(item.locale),
    );
    const selectedTranslatingItem = dataSource.find(
      (item: LanguagesDataType) => item.status === 2,
    );

    if (selectedItems && !selectedTranslatingItem) {
      setSource(languageSetting?.primaryLanguageCode);
      setTarget(selectedLanguageCode);
      const modalSetting = translateSettings1Options.find(
        (option) => option.value === translateSettings1,
      );
      setModel(modalSetting);
      handleTranslate();
    } else {
      shopify.toast.show(
        t(
          "The translation task is in progress. Please try translating again later.",
        ),
      );
    }
  };

  const checkCanTranslate = () => {
    if (
      (translateSettings1 === "8" || translateSettings1 === "9") &&
      selectedLanguageCode.length >= 2
    ) {
      shopify.toast.show(
        t(
          "Select a private key for translation. Only one target language can be selected.",
        ),
      );
      return false;
    }
    switch (translateSettings1) {
      case "8":
        if (customApikeyData) {
          const useData = checkApiKeyConfiguration(customApikeyData, 0);

          if (useData && useData?.usedToken >= useData?.tokenLimit) {
            // 如果私有key的额度超限，弹出提示框
            setCurrentModal("limitExceeded");
            setIsApiKeyModalOpen(true);
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
            setIsApiKeyModalOpen(true);
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
    return true;
  };
  const handleTranslate = async () => {
    if (!checkCanTranslate()) {
      return;
    }
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
  };

  const handleTranslateSettings2Change = (value: string[]) => {
    setTranslateSettings2(value);
  };

  const handleTranslateSettings3Change = (value: string[]) => {
    if (!value.length) {
      shopify.toast.show(t("Select at least one translation item"));
      return;
    } else {
      setTranslateSettings3(value);
    }
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
      if (data.response.length == 0) {
        error = 2;
      } else if (data.response.every((item: any) => item?.status == 0)) {
        error = 3;
      }
      // if (data.response.length > 0 && type == "glossary") {
      //   setGlossaryOpen(!glossaryOpen);
      // } else if (data.response.length > 0 && type == "brand") {
      //   setBrandWordOpen(!brandWordOpen);
      // } else if (data.response.length == 0) {
      //   shopify.toast.show(t("No available glossary found"));
      // }
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
        <Affix offsetTop={0}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 10,
              backgroundColor: "rgb(241, 241, 241)",
              padding: "16px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Button
                type="text"
                variant="outlined"
                onClick={handleNavigate}
                style={{ padding: "4px" }}
              >
                <Icon source={ArrowLeftIcon} tone="base" />
              </Button>
              <Title
                style={{
                  margin: "0",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {t("Translate Store")}
              </Title>
            </div>
            {loadingLanguage ? (
              <Skeleton.Button active />
            ) : (
              <Button
                type="primary"
                onClick={() => checkIfNeedPay()}
                style={{
                  visibility: languageData.length != 0 ? "visible" : "hidden",
                }}
                loading={translateFetcher.state === "submitting"}
              >
                {selectedLanguageCode.length > 0 &&
                selectedLanguageCode.every(
                  (item) =>
                    languageData.find((lang) => lang.locale === item)
                      ?.status === 1,
                )
                  ? t("Update")
                  : t("Translate")}
              </Button>
            )}
          </div>
        </Affix>
        <Divider style={{ margin: "0" }} />

        {loadingLanguage ? (
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
              {languageSetting && (
                <Text strong>
                  {languageSetting?.primaryLanguage ? (
                    languageSetting?.primaryLanguage
                  ) : (
                    <Skeleton active paragraph={{ rows: 0 }} />
                  )}
                </Text>
              )}
            </div>
            <Card
              ref={languageCardRef}
              style={{
                width: "100%",
              }}
            >
              <Checkbox.Group
                value={selectedLanguageCode}
                onChange={onChange}
                style={{ width: "100%" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(289px, 1fr)",
                    gap: "16px",
                    width: "100%",
                  }}
                >
                  {languageData.map((lang) => (
                    <Checkbox
                      key={lang.locale}
                      value={lang.locale}
                      className={
                        styles.languageCheckbox +
                        " " +
                        (selectedLanguageCode.includes(lang.locale)
                          ? styles.languageCheckboxChecked
                          : "")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          width: "100%",
                        }}
                      >
                        <img
                          src={lang?.src[0]}
                          alt={lang?.name}
                          style={{
                            width: "30px",
                            height: "auto",
                            justifyContent: "center",
                            border: "1px solid #888",
                            borderRadius: "2px",
                          }}
                        />
                        <span>{lang?.name}</span>
                        <EasyTranslateIcon status={lang?.status} />
                      </div>
                    </Checkbox>
                  ))}
                </div>
              </Checkbox.Group>
              <Text
                type="danger"
                style={{ display: "block", marginTop: "12px" }}
              >
                <ExclamationCircleOutlined
                  style={{
                    display: languageCardWarnText ? "inline-block" : "none",
                    marginRight: "4px",
                  }}
                />
                {t(languageCardWarnText)}
              </Text>
            </Card>
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
            <Card
              style={{
                width: "100%",
                minHeight: "222px",
                marginBottom: "16px",
              }}
            >
              <Space
                direction="vertical"
                size="large"
                style={{ display: "flex" }}
              >
                <Space
                  direction="vertical"
                  size={16}
                  style={{ display: "flex" }}
                >
                  <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
                    {t("translateSettings3.title")}
                  </Title>
                  <Checkbox
                    indeterminate={
                      translateSettings3.length > 0 &&
                      translateSettings3.length <
                        translateSettings3Options.length
                    }
                    onChange={(e) =>
                      setTranslateSettings3(
                        e.target.checked
                          ? translateSettings3Options.map((item) => item.value)
                          : [],
                      )
                    }
                    checked={
                      translateSettings3.length ==
                      translateSettings3Options.length
                    }
                  >
                    {t("Check all")}
                  </Checkbox>
                  <Divider style={{ margin: "0" }} />
                  <Checkbox.Group
                    value={translateSettings3}
                    options={translateSettings3Options}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(200px, 1fr))",
                      width: "100%",
                    }}
                    onChange={(e) => handleTranslateSettings3Change(e)}
                  />
                </Space>
                <Space
                  direction="vertical"
                  size={16}
                  style={{ display: "flex" }}
                >
                  <Space
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
                      {t("translateSettings5.title")}
                    </Title>
                  </Space>
                  {/* <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr", // 每行只一列，自动换行
                      gap: "16px",
                      width: "100%",
                    }}
                  > */}
                  {translateSettings5Options.map((item, index) => (
                    <Flex
                      key={index}
                      style={{
                        width: "100%",
                        marginRight: 0,
                        padding: "8px 12px",
                        border: "1px solid #f0f0f0",
                        borderRadius: "4px",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => setTranslateSettings5(item.value)}
                    >
                      <Radio
                        key={index}
                        value={item.value}
                        checked={translateSettings5 === item.value}
                      />

                      <Text>{item.label}</Text>
                      {!isMobile && (
                        <Text type="secondary">: {item.description}</Text>
                      )}
                    </Flex>
                  ))}
                </Space>
                <Space
                  direction="vertical"
                  size={16}
                  style={{ display: "flex" }}
                >
                  <Space
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
                      {t("translateSettings1.title")}
                    </Title>
                    {(typeof plan === "number" && plan <= 2) ||
                    typeof plan === "undefined" ? (
                      <Flex align="center" gap="middle">
                        <Popconfirm
                          title=""
                          description={t(
                            "This feature is available only with the paid plan.",
                          )}
                          trigger="hover"
                          showCancel={false}
                          okText={t("Upgrade")}
                          onConfirm={() => navigate("/app/pricing")}
                        >
                          <InfoCircleOutlined />
                        </Popconfirm>
                        <Button
                          className={defaultStyles.Button_disable}
                          icon={<Icon source={PlusIcon} />}
                          onClick={() => handleUsePrivateApi()}
                        >
                          {t("Use private api to translate")}
                        </Button>
                      </Flex>
                    ) : (
                      <Button
                        icon={<Icon source={PlusIcon} />}
                        onClick={() => handleUsePrivateApi()}
                      >
                        {t("Use private api to translate")}
                      </Button>
                    )}
                  </Space>
                  {/* <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr", // 每行只一列，自动换行
                      gap: "16px",
                      width: "100%",
                    }}
                  > */}
                  {translateSettings1Options.map((item, index) => (
                    <Flex
                      key={index}
                      style={{
                        width: "100%",
                        marginRight: 0,
                        padding: "8px 12px",
                        border: "1px solid #f0f0f0",
                        borderRadius: "4px",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => setTranslateSettings1(item.value)}
                    >
                      <Radio
                        key={index}
                        value={item.value}
                        checked={translateSettings1 === item.value}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "95%",
                        }}
                      >
                        <div
                          style={{
                            width: !isMobile ? "65%" : "",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Text>{item.label}</Text>
                          <Popover content={item.description}>
                            {!isMobile && (
                              <Text type="secondary">: {item.description}</Text>
                            )}{" "}
                          </Popover>
                        </div>
                        <Space
                          style={{
                            justifyContent: "flex-end",
                          }}
                        >
                          <Text>
                            {t("Speed")}:{" "}
                            {item.speed === 2 ? t("Medium") : t("Fast")}
                          </Text>
                          {/* <Text>
                            |
                          </Text>
                          <Text>{t("Rates", { price: item.price })}</Text> */}
                        </Space>
                      </div>
                    </Flex>
                  ))}
                  {customApikeyData &&
                    checkApiKeyConfiguration(customApikeyData, 0) && (
                      <Badge.Ribbon
                        text={t("Private")}
                        color="red"
                        style={{ top: -2, right: -8 }}
                      >
                        <div
                          key={8}
                          style={{
                            display: "flex", // 关键
                            width: "100%",
                            marginRight: 0,
                            padding: "8px 12px",
                            border: "1px solid #f0f0f0",
                            borderRadius: "4px",
                            alignItems: "center",
                            cursor: "pointer",
                          }}
                          onClick={() => setTranslateSettings1("8")}
                        >
                          <Radio
                            key={8}
                            value={"8"}
                            checked={translateSettings1 === "8"}
                          />
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                width: "50%",
                              }}
                            >
                              <Text>{t("Google Translation")}</Text>
                            </div>
                          </div>
                        </div>
                      </Badge.Ribbon>
                    )}
                  {customApikeyData &&
                    checkApiKeyConfiguration(customApikeyData, 1) && (
                      <Badge.Ribbon
                        text={t("Private")}
                        color="red"
                        style={{ top: -2, right: -8 }}
                      >
                        <div
                          key={9}
                          style={{
                            display: "flex", // 关键
                            width: "100%",
                            marginRight: 0,
                            padding: "8px 12px",
                            border: "1px solid #f0f0f0",
                            borderRadius: "4px",
                            alignItems: "center",
                            cursor: "pointer",
                          }}
                          onClick={() => setTranslateSettings1("9")}
                        >
                          <Radio
                            key={9}
                            value={"9"}
                            checked={translateSettings1 === "9"}
                          />
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                width: "50%",
                              }}
                            >
                              <Text>{`Open AI/ChatGPT(${checkApiKeyConfiguration(customApikeyData, 1)?.apiModel.replace("gpt", "GPT")})`}</Text>
                            </div>
                          </div>
                        </div>
                      </Badge.Ribbon>
                    )}
                  {/* </div> */}
                </Space>
              </Space>
            </Card>
            {(translateSettings1 == "1" || translateSettings1 == "2") && (
              <>
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
                <Card
                  style={{
                    width: "100%",
                    minHeight: "222px",
                    marginBottom: "16px",
                  }}
                >
                  <Space
                    direction="vertical"
                    size="large"
                    style={{ display: "flex" }}
                  >
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ display: "flex" }}
                    >
                      <div>
                        <Title
                          level={5}
                          style={{ fontSize: "1rem", margin: "0" }}
                        >
                          {t("translateSettings4.title")}
                        </Title>
                        <Text type="secondary">
                          {t("translateSettings4.description")}
                        </Text>
                      </div>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <div>
                          <Text>{t("translateSettings4.title1")}</Text>
                          <Select
                            defaultActiveFirstOption={true}
                            options={[
                              {
                                label: "",
                                value: "",
                              },
                              {
                                label: t("Formal"),
                                value: "Formal",
                              },
                              {
                                label: t("Neutral"),
                                value: "Neutral",
                              },
                              {
                                label: t("Casual"),
                                value: "Casual",
                              },
                              {
                                label: t("Youthful"),
                                value: "Youthful",
                              },
                              {
                                label: t("Luxury"),
                                value: "Luxury",
                              },
                            ]}
                            style={{
                              width: "100%",
                            }}
                            onSelect={(e) =>
                              setTranslateSettings4({
                                ...translateSettings4,
                                option1: e,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Text>{t("translateSettings4.title2")}</Text>
                          <Select
                            defaultActiveFirstOption={true}
                            options={[
                              {
                                label: "",
                                value: "",
                              },
                              {
                                label: t(
                                  "Apple – Minimal & premium (Tech/design)",
                                ),
                                value:
                                  "Apple – Minimal & premium (Tech/design)",
                              },
                              {
                                label: t(
                                  "Samsung – Innovative & versatile (Electronics)",
                                ),
                                value:
                                  "Samsung – Innovative & versatile (Electronics)",
                              },
                              {
                                label: t(
                                  "Nike – Bold & empowering (Sportswear)",
                                ),
                                value: "Nike – Bold & empowering (Sportswear)",
                              },
                              {
                                label: t(
                                  "Adidas – Dynamic & inclusive (Activewear)",
                                ),
                                value:
                                  "Adidas – Dynamic & inclusive (Activewear)",
                              },
                              {
                                label: t(
                                  "Patagonia – Ethical & adventurous (Outdoor gear)",
                                ),
                                value:
                                  "Patagonia – Ethical & adventurous (Outdoor gear)",
                              },
                              {
                                label: t("Zara – Modern & chic (Womenswear)"),
                                value: "Zara – Modern & chic (Womenswear)",
                              },
                              {
                                label: t(
                                  "H&M – Trendy & casual (Fast fashion)",
                                ),
                                value: "H&M – Trendy & casual (Fast fashion)",
                              },
                              {
                                label: t(
                                  "Dior – Feminine & luxurious (High fashion)",
                                ),
                                value:
                                  "Dior – Feminine & luxurious (High fashion)",
                              },
                              {
                                label: t(
                                  "Uniqlo – Simple & comfortable (Everyday basics)",
                                ),
                                value:
                                  "Uniqlo – Simple & comfortable (Everyday basics)",
                              },
                              {
                                label: t(
                                  "Ralph Lauren – Timeless & masculine (Menswear)",
                                ),
                                value:
                                  "Ralph Lauren – Timeless & masculine (Menswear)",
                              },
                              {
                                label: t(
                                  "Uniqlo – Clean & functional (Essentials)",
                                ),
                                value:
                                  "Uniqlo – Clean & functional (Essentials)",
                              },
                              {
                                label: t(
                                  "Tommy Hilfiger – Classic & youthful (Men's fashion)",
                                ),
                                value:
                                  "Tommy Hilfiger – Classic & youthful (Men's fashion)",
                              },
                              {
                                label: t(
                                  "Tiffany – Elegant & romantic (Jewelry)",
                                ),
                                value: "Tiffany – Elegant & romantic (Jewelry)",
                              },
                              {
                                label: t(
                                  "Cartier – Luxurious & timeless (Fine jewelry)",
                                ),
                                value:
                                  "Cartier – Luxurious & timeless (Fine jewelry)",
                              },
                              {
                                label: t(
                                  "Swarovski – Sparkling & accessible (Fashion jewelry)",
                                ),
                                value:
                                  "Swarovski – Sparkling & accessible (Fashion jewelry)",
                              },
                              {
                                label: t(
                                  "L'Oréal – Confident & universal (Beauty)",
                                ),
                                value:
                                  "L'Oréal – Confident & universal (Beauty)",
                              },
                              {
                                label: t(
                                  "Estée Lauder – Elegant & premium (Skincare)",
                                ),
                                value:
                                  "Estée Lauder – Elegant & premium (Skincare)",
                              },
                              {
                                label: t(
                                  "Fenty Beauty – Bold & inclusive (Cosmetics)",
                                ),
                                value:
                                  "Fenty Beauty – Bold & inclusive (Cosmetics)",
                              },
                              {
                                label: t(
                                  "Pampers – Caring & reassuring (Baby care)",
                                ),
                                value:
                                  "Pampers – Caring & reassuring (Baby care)",
                              },
                              {
                                label: t(
                                  "Mustela – Gentle & safe (Baby skincare)",
                                ),
                                value:
                                  "Mustela – Gentle & safe (Baby skincare)",
                              },
                              {
                                label: t(
                                  "IKEA – Practical & family-friendly (Home)",
                                ),
                                value:
                                  "IKEA – Practical & family-friendly (Home)",
                              },
                              {
                                label: t(
                                  "Dyson – Innovative & sleek (Appliances)",
                                ),
                                value:
                                  "Dyson – Innovative & sleek (Appliances)",
                              },
                              {
                                label: t(
                                  "Philips – Smart & reliable (Home tech)",
                                ),
                                value: "Philips – Smart & reliable (Home tech)",
                              },
                              {
                                label: t(
                                  "Royal Canin – Scientific & premium (Pet food)",
                                ),
                                value:
                                  "Royal Canin – Scientific & premium (Pet food)",
                              },
                              {
                                label: t(
                                  "Pedigree – Friendly & caring (Pet care)",
                                ),
                                value:
                                  "Pedigree – Friendly & caring (Pet care)",
                              },
                              {
                                label: t(
                                  "Unilever – Mass-market & trusted (FMCG)",
                                ),
                                value:
                                  "Unilever – Mass-market & trusted (FMCG)",
                              },
                              {
                                label: t(
                                  "P&G – Reliable & practical (Household)",
                                ),
                                value: "P&G – Reliable & practical (Household)",
                              },
                              {
                                label: t(
                                  "Starbucks – Warm & lifestyle-driven (Coffee & culture)",
                                ),
                                value:
                                  "Starbucks – Warm & lifestyle-driven (Coffee & culture)",
                              },
                              {
                                label: t(
                                  "Red Bull – Energetic & bold (Energy drinks)",
                                ),
                                value:
                                  "Red Bull – Energetic & bold (Energy drinks)",
                              },
                              {
                                label: t(
                                  "Nestlé – Family-oriented & global (Food & beverage)",
                                ),
                                value:
                                  "Nestlé – Family-oriented & global (Food & beverage)",
                              },
                              {
                                label: t(
                                  "Centrum – Scientific & trustworthy (Supplements)",
                                ),
                                value:
                                  "Centrum – Scientific & trustworthy (Supplements)",
                              },
                            ]}
                            style={{
                              width: "100%",
                            }}
                            onSelect={(e) =>
                              setTranslateSettings4({
                                ...translateSettings4,
                                option2: e,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Text>{t("translateSettings4.title3")}</Text>
                          <Select
                            defaultActiveFirstOption={true}
                            options={[
                              {
                                label: "",
                                value: "",
                              },
                              {
                                label: t("Informational – Just the facts"),
                                value: "Informational – Just the facts",
                              },
                              {
                                label: t("Soft CTA – Gentle encouragement"),
                                value: "Soft CTA – Gentle encouragement",
                              },
                              {
                                label: t("Strong CTA – Clear call to buy"),
                                value: "Strong CTA – Clear call to buy",
                              },
                            ]}
                            style={{
                              width: "100%",
                            }}
                            onSelect={(e) =>
                              setTranslateSettings4({
                                ...translateSettings4,
                                option3: e,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Text>{t("translateSettings4.title4")}</Text>
                          <Select
                            defaultActiveFirstOption={true}
                            options={[
                              {
                                label: "",
                                value: "",
                              },
                              {
                                label: t("SEO-friendly"),
                                value: "SEO-friendly",
                              },
                              {
                                label: t("Minimalist"),
                                value: "Minimalist",
                              },
                              {
                                label: t("Storytelling"),
                                value: "Storytelling",
                              },
                              {
                                label: t("Feature-first"),
                                value: "Feature-first",
                              },
                              {
                                label: t("Call-to-action"),
                                value: "Call-to-action",
                              },
                            ]}
                            style={{
                              width: "100%",
                            }}
                            onSelect={(e) =>
                              setTranslateSettings4({
                                ...translateSettings4,
                                option4: e,
                              })
                            }
                          />
                        </div>
                        {/* <div>
                      <Text>{t("translateSettings4.title5")}</Text>
                      <Input
                        style={{ width: "100%" }}
                        value={translateSettings4.option5}
                        onChange={(e) =>
                          setTranslateSettings4({
                            ...translateSettings4,
                            option5: e.target.value,
                          })
                        }
                        placeholder={t("translateSettings4.placeholder5")}
                      />
                    </div> */}
                      </Space>
                    </Space>
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ display: "flex" }}
                    >
                      <Title
                        level={5}
                        style={{ fontSize: "1rem", margin: "0" }}
                      >
                        {t("translateSettings2.title")}
                      </Title>
                      <Checkbox.Group
                        value={translateSettings2}
                        options={translateSettings2Options}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(200px, 1fr))",
                          width: "100%",
                        }}
                        onChange={(e) => handleTranslateSettings2Change(e)}
                      />
                    </Space>
                  </Space>
                </Card>
              </>
            )}
            <Card
              title={t("Advance Setting")}
              extra={
                <Button type="text" onClick={() => setRotate(!rotate)}>
                  <CaretDownOutlined rotate={rotate ? 180 : 0} />
                </Button>
              }
              style={{
                width: "100%",
                marginBottom: "16px",
              }}
              styles={{
                body: {
                  padding: rotate ? "24px" : "0",
                },
              }}
            >
              {rotate && (
                <Space
                  direction="vertical"
                  size="large"
                  style={{ display: "flex", width: "100%" }}
                >
                  <Flex gap={8} align="center" justify="space-between">
                    <Text>{t("Glossary")}</Text>
                    <Switch
                      checked={glossaryOpen}
                      loading={loadingArray.includes("glossary")}
                      onClick={() => handleAdvanceSettingChange("glossary")}
                    />
                  </Flex>
                  {/* <Flex gap={8} align="center" justify="space-between">
                    <Text>{t("Brand-First Sentence Structure")}</Text>

                    <Switch
                      checked={brandWordOpen}
                      loading={loadingArray.includes("brand")}
                      onClick={() => handleAdvanceSettingChange("brand")}
                    />
                  </Flex> */}
                </Space>
              )}
            </Card>
          </Space>
        ) : (
          <NoLanguageSetCard />
        )}
        <Modal
          open={isApiKeyModalOpen}
          onCancel={handleApiKeyModalClose}
          title={modalTypeObject[currentModal].Title}
          centered
          footer={
            <Button type="primary" onClick={handleConfigureQuota}>
              {modalTypeObject[currentModal].Button}
            </Button>
          }
        >
          <Text>{modalTypeObject[currentModal].Body}</Text>
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
      {showPaymentModal && (
        <PaymentModal
          shop={shop}
          server={server as string}
          visible={showPaymentModal}
          setVisible={setShowPaymentModal}
          source={source}
          target={target}
          model={model}
          translateSettings3={translateSettings3 || []}
          handleTranslate={handleTranslate}
          needPay={needPay}
        />
      )}
    </Page>
  );
};

export default Index;
