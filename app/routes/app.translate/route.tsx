import { Icon, Page } from "@shopify/polaris";
import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Flex,
  Input,
  Radio,
  RadioChangeEvent,
  Select,
  Skeleton,
  Space,
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
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { authenticate } from "~/shopify.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { ArrowLeftIcon, PlusIcon } from "@shopify/polaris-icons";
import axios from "axios";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log(`${shop} load translate`);
  return {
    shop,
    server: process.env.SERVER_URL,
  };
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();
  const [languageData, setLanguageData] = useState<LanguageDataType[]>([]);
  const [languageSetting, setLanguageSetting] = useState<LanguageSettingType>();
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>("");
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
    "notifications",
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
  const [model, setModel] = useState<any>("");
  const [loadingLanguage, setLoadingLanguage] = useState<boolean>(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customApikeyData, setCustomApikeyData] = useState<boolean>(false);
  const [needPay, setNeedPay] = useState<boolean>(false);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [languageCardWarnText, setLanguageCardWarnText] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const dispatch = useDispatch();
  const languageCardRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const loadingLanguageFetcher = useFetcher<any>();
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher<any>();
  const customApiKeyFetcher = useFetcher<any>();

  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  useEffect(() => {
    const languageFormData = new FormData();
    languageFormData.append("languageData", JSON.stringify(true));
    loadingLanguageFetcher.submit(languageFormData, {
      method: "post",
      action: "/app",
    });
    const customApiKeyFormData = new FormData();
    customApiKeyFormData.append("customApikeyData", JSON.stringify(true));
    customApiKeyFetcher.submit(customApiKeyFormData, {
      method: "post",
      action: "/app",
    });
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
      setLanguageData(loadingLanguageFetcher.data?.data);
      setLanguageSetting(loadingLanguageFetcher.data?.languageSetting);
      // const translateSettings4 = localStorage.getItem("translateSettings4");
      // if (translateSettings4) {
      //   setTranslateSettings4(JSON.parse(translateSettings4));
      // }
      setLoadingLanguage(false);
    }
  }, [loadingLanguageFetcher.data]);

  useEffect(() => {
    if (customApiKeyFetcher.data) {
      setCustomApikeyData(customApiKeyFetcher.data.customApikeyData);
    }
  }, [customApiKeyFetcher.data]);

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data?.success) {
        shopify.toast.show(t("The translation task is in progress."));
        navigate("/app");
      } else if (fetcher.data?.message === "words get error") {
        shopify.toast.show(
          t("The query of the remaining credits failed. Please try again."),
        );
      }
    }
  }, [fetcher.data]);

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
  }, [dispatch, languageData]);

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
    {
      label: t("Email"),
      value: "notifications",
    },
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
      label: "handle",
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

  const onChange = (e: RadioChangeEvent) => {
    if (languageCardRef.current) {
      languageCardRef.current.style.border = "1px solid #f0f0f0";
    }
    if (languageCardWarnText) {
      setLanguageCardWarnText("");
    }
    setSelectedLanguageCode(e.target.value);
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

  const checkIfNeedPay = async () => {
    if (!languageSetting?.primaryLanguageCode) {
      shopify.toast.show(t("Please set the primary language first."));
      return;
    }
    if (!selectedLanguageCode) {
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
    const selectedItem = dataSource.find(
      (item: LanguagesDataType) => item.locale === selectedLanguageCode,
    );
    const selectedTranslatingItem = dataSource.find(
      (item: LanguagesDataType) => item.status === 2,
    );
    if (selectedItem && !selectedTranslatingItem) {
      setSource(languageSetting?.primaryLanguageCode);
      setTarget(selectedLanguageCode);
      const response = await axios({
        url: `${server}/shopify/getUserLimitChars?shopName=${shop}`,
        method: "GET",
      });
      const words = response.data.response;
      if (words?.totalChars <= words?.chars) {
        setNeedPay(true);
        setShowPaymentModal(true);
      } else {
        setNeedPay(false);
        handleTranslate();
      }
      const modalSetting = translateSettings1Options.find(
        (option) => option.value === translateSettings1,
      );
      setModel(modalSetting);
    } else {
      shopify.toast.show(
        t(
          "The translation task is in progress. Please try translating again later.",
        ),
      );
    }
  };

  const handleTranslate = async () => {
    const customKey = `${translateSettings4.option2 && `in the style of ${translateSettings4.option2}, `}${translateSettings4.option1 && `with a ${translateSettings4.option1} tone, `}${translateSettings4.option4 && `with a ${translateSettings4.option4} format, `}${translateSettings4.option3 && `with a ${translateSettings4.option3} focus. `}`;
    console.log(customKey);
    const formData = new FormData();
    formData.append(
      "translation",
      JSON.stringify({
        primaryLanguage: languageSetting?.primaryLanguageCode,
        selectedLanguage: selectedLanguageCode,
        translateSettings1: translateSettings1,
        translateSettings2: translateSettings2,
        translateSettings3: translateSettings3,
        customKey: customKey,
        translateSettings5: translateSettings5,
      }),
    ); // 将选中的语言作为字符串发送
    fetcher.submit(formData, {
      method: "post",
      action: "/app/language",
    });
    // localStorage.setItem(
    //   "translateSettings4",
    //   JSON.stringify(translateSettings4),
    // );
  };

  const handleTranslateSettings2Change = (value: string[]) => {
    if (!value.length) {
      shopify.toast.show(t("Select at least one language pack"));
      return;
    } else {
      setTranslateSettings2(value);
    }
  };

  const handleTranslateSettings3Change = (value: string[]) => {
    if (!value.length) {
      shopify.toast.show(t("Select at least one translation item"));
      return;
    } else {
      setTranslateSettings3(value);
    }
  };

  return (
    <Page>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
          {languageSetting?.primaryLanguageCode ? (
            <Button
              type="primary"
              onClick={() => checkIfNeedPay()}
              style={{
                visibility: languageData.length != 0 ? "visible" : "hidden",
              }}
              loading={fetcher.state === "submitting"}
            >
              {t("Translate")}
            </Button>
          ) : (
            <Skeleton.Button active />
          )}
        </div>
        <Divider style={{ margin: "0" }} />
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
        {loadingLanguage ? (
          <Skeleton.Button active style={{ height: 600 }} block />
        ) : languageData.length != 0 ? (
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div style={{ paddingLeft: "8px" }}>
              <Title
                style={{
                  margin: "0",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {t("translateSettings.title1")}
              </Title>
            </div>
            <Card
              ref={languageCardRef}
              style={{
                width: "100%",
              }}
            >
              <Radio.Group
                value={selectedLanguageCode}
                onChange={onChange}
                style={{ width: "100%" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "16px",
                    width: "100%",
                  }}
                >
                  {languageData.map((lang) => (
                    <Radio
                      key={lang.locale}
                      value={lang.locale}
                      style={{
                        width: "100%",
                        marginRight: 0,
                        padding: "8px 12px",
                        border: "1px solid #f0f0f0",
                        borderRadius: "4px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <img
                          src={lang.src[0]}
                          alt={lang.name}
                          style={{
                            width: "30px",
                            height: "auto",
                            justifyContent: "center",
                            border: "1px solid #888",
                            borderRadius: "2px",
                            marginRight: "8px",
                          }}
                        />
                        <span>{lang.name}</span>
                      </div>
                    </Radio>
                  ))}
                </div>
              </Radio.Group>
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
              <Space direction="vertical" size={24} style={{ display: "flex" }}>
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
                    <Button
                      icon={<Icon source={PlusIcon} />}
                      onClick={() => navigate("/app/apikeySetting")}
                    >
                      {t("Use private api to translate")}
                    </Button>
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
                          {!isMobile && (
                            <Text type="secondary">: {item.description}</Text>
                          )}
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
                  {customApikeyData && (
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
                  {/* </div> */}
                </Space>
                <Space
                  direction="vertical"
                  size={16}
                  style={{ display: "flex" }}
                >
                  <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
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
                      alignItems: "center", // 关键：让每个格子内容垂直居中
                    }}
                    onChange={(e) => handleTranslateSettings2Change(e)}
                  />
                </Space>
                <Space
                  direction="vertical"
                  size={16}
                  style={{ display: "flex" }}
                >
                  <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
                    {t("translateSettings3.title")}
                  </Title>
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
                  ></Checkbox.Group>
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
                  <div>
                    <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
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
                            label: t("Apple – Minimal & premium (Tech/design)"),
                            value: "Apple – Minimal & premium (Tech/design)",
                          },
                          {
                            label: t(
                              "Samsung – Innovative & versatile (Electronics)",
                            ),
                            value:
                              "Samsung – Innovative & versatile (Electronics)",
                          },
                          {
                            label: t("Nike – Bold & empowering (Sportswear)"),
                            value: "Nike – Bold & empowering (Sportswear)",
                          },
                          {
                            label: t(
                              "Adidas – Dynamic & inclusive (Activewear)",
                            ),
                            value: "Adidas – Dynamic & inclusive (Activewear)",
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
                            label: t("H&M – Trendy & casual (Fast fashion)"),
                            value: "H&M – Trendy & casual (Fast fashion)",
                          },
                          {
                            label: t(
                              "Dior – Feminine & luxurious (High fashion)",
                            ),
                            value: "Dior – Feminine & luxurious (High fashion)",
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
                            value: "Uniqlo – Clean & functional (Essentials)",
                          },
                          {
                            label: t(
                              "Tommy Hilfiger – Classic & youthful (Men's fashion)",
                            ),
                            value:
                              "Tommy Hilfiger – Classic & youthful (Men's fashion)",
                          },
                          {
                            label: t("Tiffany – Elegant & romantic (Jewelry)"),
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
                            value: "L'Oréal – Confident & universal (Beauty)",
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
                            value: "Pampers – Caring & reassuring (Baby care)",
                          },
                          {
                            label: t("Mustela – Gentle & safe (Baby skincare)"),
                            value: "Mustela – Gentle & safe (Baby skincare)",
                          },
                          {
                            label: t(
                              "IKEA – Practical & family-friendly (Home)",
                            ),
                            value: "IKEA – Practical & family-friendly (Home)",
                          },
                          {
                            label: t("Dyson – Innovative & sleek (Appliances)"),
                            value: "Dyson – Innovative & sleek (Appliances)",
                          },
                          {
                            label: t("Philips – Smart & reliable (Home tech)"),
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
                            label: t("Pedigree – Friendly & caring (Pet care)"),
                            value: "Pedigree – Friendly & caring (Pet care)",
                          },
                          {
                            label: t("Unilever – Mass-market & trusted (FMCG)"),
                            value: "Unilever – Mass-market & trusted (FMCG)",
                          },
                          {
                            label: t("P&G – Reliable & practical (Household)"),
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
              </Space>
            </Card>
          </Space>
        ) : (
          <NoLanguageSetCard />
        )}
      </Space>
      {showPaymentModal && (
        <PaymentModal
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
