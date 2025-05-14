import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Space,
  Card,
  Typography,
  Switch,
  Select,
  ColorPicker,
  Slider,
  Button,
  message,
} from "antd";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import styles from "./styles.module.css";
import { useEffect, useState } from "react";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { SaveAndUpdateData, WidgetConfigurations } from "~/api/serve";
import { authenticate } from "~/shopify.server";
import { useSelector } from "react-redux";
import TranslationWarnModal from "~/components/translationWarnModal";
const { Text, Title } = Typography;

interface EditData {
  shopName: string;
  includedFlag: boolean;
  languageSelector: boolean;
  currencySelector: boolean;
  ipOpen: boolean;
  fontColor: string;
  backgroundColor: string;
  buttonColor: string;
  buttonBackgroundColor: string;
  optionBorderColor: string;
  selectorPosition: string;
  positionData: string;
}

const initialLocalization = {
  languages: [
    {
      iso_code: "zh",
      name: "Chinese",
      localeName: "简体中文",
      flag: "/flags/CN.webp",
      selected: true,
    },
    {
      iso_code: "kr",
      name: "Korean",
      localeName: "한국어",
      flag: "/flags/KR.webp",
      selected: false,
    },
    {
      iso_code: "fr",
      name: "French",
      localeName: "Français",
      flag: "/flags/FR.webp",
      selected: false,
    },
  ],
  currencies: [
    {
      iso_code: "USD",
      symbol: "$",
      localeName: "USD",
      selected: true,
    },
    {
      iso_code: "EUR",
      symbol: "€",
      localeName: "EUR",
      selected: false,
    },
    {
      iso_code: "CNY",
      symbol: "¥",
      localeName: "CNY",
      selected: false,
    },
  ],
};

const planMapping = {
  1: "Free",
  2: "Free",
  3: "Starter",
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log(`${shop} load switcher`);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const editData = JSON.parse(formData.get("editData") as string);
    switch (true) {
      case !!loading:
        try {
          const data = await WidgetConfigurations({
            shop: shop,
          });
          const initData = {
            shopName: shop,
            includedFlag: true,
            languageSelector: true,
            currencySelector: true,
            ipOpen: false,
            fontColor: "#000000",
            backgroundColor: "#ffffff",
            buttonColor: "#ffffff",
            buttonBackgroundColor: "#000000",
            optionBorderColor: "#ccc",
            selectorPosition: "bottom_left",
            positionData: 10,
          };
          if (
            data.success &&
            typeof data.response === "object" &&
            data.response !== null
          ) {
            const filteredResponse = Object.fromEntries(
              Object.entries(data.response).filter(
                ([_, value]) => value !== null,
              ),
            );
            const res = {
              ...initData,
              ...filteredResponse,
            };
            return res;
          } else {
            return initData;
          }
        } catch (error) {
          console.error("Error switcher loading:", error);
        }
      case !!editData:
        try {
          const data = SaveAndUpdateData(editData);
          return data;
        } catch (error) {
          console.error("Error switcher editData:", error);
        }
      default:
        return null;
    }
  } catch (error) {
    console.error("Error switcher action:", error);
  }
};



const Index = () => {
  // const [isSwitcherEnabled, setIsSwitcherEnabled] = useState(false);
  const [isGeoLocationEnabled, setIsGeoLocationEnabled] = useState(false);
  const [isIncludedFlag, setIsIncludedFlag] = useState(false);
  const [languageSelector, setLanguageSelector] = useState(true);
  const [currencySelector, setCurrencySelector] = useState(true);
  const [fontColor, setFontColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [buttonColor, setButtonColor] = useState("#ffffff");
  const [buttonBackgroundColor, setButtonBackgroundColor] = useState("#000000");
  const [optionBorderColor, setOptionBorderColor] = useState("#ccc");
  const [selectorPosition, setSelectorPosition] = useState("top_left");
  const [positionData, setPositionData] = useState<string>("0");
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [mainBoxText, setMainBoxText] = useState("");
  const [localization, setLocalization] = useState(initialLocalization);
  const [originalData, setOriginalData] = useState<EditData>();
  const [editData, setEditData] = useState<EditData>({
    shopName: "",
    includedFlag: false,
    languageSelector: false,
    currencySelector: false,
    ipOpen: false,
    fontColor: "",
    backgroundColor: "",
    buttonColor: "",
    buttonBackgroundColor: "",
    optionBorderColor: "",
    selectorPosition: "",
    positionData: "0",
  });
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarnModal, setShowWarnModal] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan } = useSelector((state: any) => state.userConfig);
  const fetcher = useFetcher<any>();
  const editFetcher = useFetcher<any>();

  useEffect(() => {
    fetcher.submit(
      {
        loading: JSON.stringify(true),
      },
      {
        method: "POST",
        action: "/app/switcher",
      },
    );
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setOriginalData(fetcher.data);
      setIsIncludedFlag(fetcher.data.includedFlag);
      setLanguageSelector(fetcher.data.languageSelector);
      setCurrencySelector(fetcher.data.currencySelector);
      setIsGeoLocationEnabled(fetcher.data.ipOpen);
      setFontColor(fetcher.data.fontColor);
      setBackgroundColor(fetcher.data.backgroundColor);
      setButtonColor(fetcher.data.buttonColor);
      setButtonBackgroundColor(fetcher.data.buttonBackgroundColor);
      setOptionBorderColor(fetcher.data.optionBorderColor);
      setSelectorPosition(fetcher.data.selectorPosition);
      setPositionData(fetcher.data.positionData);
      setEditData(fetcher.data);
      setIsLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (editFetcher.data) {
      if (editFetcher.data.success) {
        setOriginalData(editFetcher.data.response);
        setEditData(editFetcher.data.response);
        shopify.toast.show(t("Switcher configuration updated successfully"));
      } else {
        shopify.toast.show(t("Switcher configuration update failed"));
      }
    }
  }, [editFetcher.data]);

  useEffect(() => {
    if (languageSelector && !currencySelector) {
      setMainBoxText(
        localization.languages.find((language) => language.selected)
          ?.localeName as string,
      );
    } else if (!languageSelector && currencySelector) {
      setMainBoxText(
        localization.currencies.find((currency) => currency.selected)
          ?.localeName as string,
      );
    } else if (languageSelector && currencySelector) {
      setMainBoxText(
        localization.languages.find((language) => language.selected)
          ?.localeName +
        " / " +
        localization.currencies.find((currency) => currency.selected)
          ?.localeName,
      );
    }
  }, [languageSelector, currencySelector, localization]);

  useEffect(() => {
    if (
      originalData &&
      editData.shopName &&
      JSON.stringify(editData) !== JSON.stringify(originalData)
    ) {
      setIsEdit(true);
    } else {
      setIsEdit(false);
    }
  }, [editData, originalData]);

  const handleEditData = (updates: Partial<EditData>) => {
    // 更新对应的状态
    Object.entries(updates).forEach(([key, value]) => {
      switch (key) {
        case "includedFlag":
          setIsIncludedFlag(value as boolean);
          break;
        case "languageSelector":
          setLanguageSelector(value as boolean);
          break;
        case "currencySelector":
          setCurrencySelector(value as boolean);
          break;
        case "fontColor":
          setFontColor(value as string);
          break;
        case "backgroundColor":
          setBackgroundColor(value as string);
          break;
        case "buttonColor":
          setButtonColor(value as string);
          break;
        case "buttonBackgroundColor":
          setButtonBackgroundColor(value as string);
          break;
        case "optionBorderColor":
          setOptionBorderColor(value as string);
          break;
        case "selectorPosition":
          setSelectorPosition(value as string);
          break;
        case "positionData":
          setPositionData(value as string);
          break;
      }
    });

    // 更新 editData
    setEditData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleOptionChange = (value: string) => {
    switch (value) {
      case "language_and_currency":
        handleEditData({
          languageSelector: true,
          currencySelector: true,
        });
        break;
      case "language":
        handleEditData({
          languageSelector: true,
          currencySelector: false,
        });
        break;
      case "currency":
        handleEditData({
          languageSelector: false,
          currencySelector: true,
        });
        setIsIncludedFlag(false);
        handleEditData({
          includedFlag: false,
        });
        break;
    }
  };

  const handleLanguageClick = () => {
    setIsLanguageOpen(!isLanguageOpen);
    setIsCurrencyOpen(false);
  };

  const handleCurrencyClick = () => {
    setIsCurrencyOpen(!isCurrencyOpen);
    setIsLanguageOpen(false);
  };

  const handleSelectorClick = () => {
    setIsSelectorOpen(!isSelectorOpen);
    setIsLanguageOpen(false);
    setIsCurrencyOpen(false);
  };

  const handleOptionClick = (value: string) => {
    setIsLanguageOpen(false);
    setIsCurrencyOpen(false);

    if (
      localization.languages.find((language) => language.iso_code === value)
    ) {
      localization.languages.forEach((language) => {
        if (language.iso_code !== value) {
          language.selected = false;
        } else {
          language.selected = true;
        }
      });
      setLocalization({ ...localization });
    } else if (
      localization.currencies.find((currency) => currency.iso_code === value)
    ) {
      localization.currencies.forEach((currency) => {
        if (currency.iso_code !== value) {
          currency.selected = false;
        } else {
          currency.selected = true;
        }
      });
      setLocalization({ ...localization });
    }
  };

  const handleIpOpenChange = (checked: boolean) => {
    if (plan > 3) {
      setIsGeoLocationEnabled(checked);
      setEditData((prev) => ({
        ...prev,
        ipOpen: checked,
      }));
    } else {
      setIsGeoLocationEnabled(false);
      setShowWarnModal(true);
    }
  };

  const handleSave = () => {
    editFetcher.submit(
      {
        editData: JSON.stringify(editData),
      },
      {
        method: "POST",
      },
    );
  };

  const handleCancel = () => {
    if (originalData) {
      setIsIncludedFlag(originalData.includedFlag);
      setLanguageSelector(originalData.languageSelector);
      setCurrencySelector(originalData.currencySelector);
      setIsGeoLocationEnabled(originalData.ipOpen);
      setFontColor(originalData.fontColor);
      setBackgroundColor(originalData.backgroundColor);
      setButtonColor(originalData.buttonColor);
      setButtonBackgroundColor(originalData.buttonBackgroundColor);
      setOptionBorderColor(originalData.optionBorderColor);
      setSelectorPosition(originalData.selectorPosition);
      setPositionData(originalData.positionData);
      setEditData(originalData);
    }
  };

  const switcherOptions = [
    {
      label: t("Language Switcher"),
      value: "language",
    },
    {
      label: t("Currency Switcher"),
      value: "currency",
    },
    {
      label: t("Language and Currency Switcher"),
      value: "language_and_currency",
    },
  ];

  const switcherPositionOptions = [
    {
      label: t("Top Left"),
      value: "top_left",
    },
    {
      label: t("Top Right"),
      value: "top_right",
    },
    {
      label: t("Bottom Left"),
      value: "bottom_left",
    },
    {
      label: t("Bottom Right"),
      value: "bottom_right",
    },
  ];

  return (
    <Page>
      <TitleBar title={t("Switcher")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <Card styles={{ body: { padding: "12px" } }}>
          <Space
            style={{
              display: "flex",
              flexDirection: "row-reverse",
              alignItems: "center",
            }}
          >
            <Button
              disabled={!isEdit}
              type="primary"
              onClick={handleSave}
              loading={editFetcher.state === "submitting"}
            >
              {t("Save")}
            </Button>
            <Button disabled={!isEdit} type="default" onClick={handleCancel}>
              {t("Cancel")}
            </Button>
          </Space>
        </Card>
        <div className={styles.switcher_container}>
          <div className={styles.switcher_editor}>
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <Card loading={isLoading}>
                <Title level={5}>{t("Selector type configuration:")}</Title>
                <Select
                  options={switcherOptions}
                  style={{ width: "100%" }}
                  value={
                    languageSelector && currencySelector
                      ? "language_and_currency"
                      : languageSelector
                        ? "language"
                        : "currency"
                  }
                  onChange={handleOptionChange}
                />
              </Card>
              <Card loading={isLoading}>
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ display: "flex" }}
                >
                  <Title level={5}>{t("Selector style configuration:")}</Title>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text>{t("Included flag:")}</Text>
                    <Switch
                      disabled={!languageSelector}
                      checked={isIncludedFlag}
                      onChange={(checked) =>
                        handleEditData({ includedFlag: checked })
                      }
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>{t("Font Color:")}</Text>
                      <ColorPicker
                        style={{ alignSelf: "flex-start" }}
                        value={fontColor}
                        onChange={(e) =>
                          handleEditData({ fontColor: e.toHexString() })
                        }
                        showText
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>{t("Background Color:")}</Text>
                      <ColorPicker
                        style={{ alignSelf: "flex-start" }}
                        value={backgroundColor}
                        onChange={(e) =>
                          handleEditData({ backgroundColor: e.toHexString() })
                        }
                        showText
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>{t("Button Color:")}</Text>
                      <ColorPicker
                        style={{ alignSelf: "flex-start" }}
                        value={buttonColor}
                        onChange={(e) =>
                          handleEditData({ buttonColor: e.toHexString() })
                        }
                        showText
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>{t("Button Background Color:")}</Text>
                      <ColorPicker
                        style={{ alignSelf: "flex-start" }}
                        value={buttonBackgroundColor}
                        onChange={(e) =>
                          handleEditData({
                            buttonBackgroundColor: e.toHexString(),
                          })
                        }
                        showText
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>{t("Option Border Color:")}</Text>
                      <ColorPicker
                        style={{ alignSelf: "flex-start" }}
                        value={optionBorderColor}
                        onChange={(e) =>
                          handleEditData({ optionBorderColor: e.toHexString() })
                        }
                        showText
                      />
                    </div>
                  </div>
                  <div>
                    <Text style={{ display: "block" }}>
                      {t("Selector position:")}
                    </Text>
                    <Select
                      options={switcherPositionOptions}
                      style={{ width: "100%" }}
                      value={selectorPosition}
                      onChange={(value) =>
                        handleEditData({ selectorPosition: value })
                      }
                    />
                  </div>
                  <div>
                    <Text style={{ display: "block" }}>
                      {t("Selector position data:")}
                    </Text>
                    <Slider
                      value={Number(positionData)}
                      onChange={(e) =>
                        handleEditData({ positionData: e.toString() })
                      }
                    />
                  </div>
                </Space>
              </Card>
              <Card loading={isLoading}>
                <Title level={5}>
                  {t("Selector Auto IP position configuration:")}
                </Title>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text>Geolocation: </Text>
                  <Switch
                    checked={isGeoLocationEnabled}
                    onChange={handleIpOpenChange}
                  />
                </div>
              </Card>
            </Space>
          </div>
          <div className={styles.switcher_preview}>
            <Card loading={isLoading}>
              <Title level={4}>{t("Preview")}</Title>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "400px",
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  background: "#f5f5f5",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "32px",
                    background: "#e8e8e8",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "#ff5f57",
                    }}
                  />
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "#febc2e",
                    }}
                  />
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "#28c840",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "200px",
                    position: "relative",
                    top:
                      selectorPosition === "top_left" ||
                        selectorPosition === "top_right"
                        ? ((Number(positionData) * 82) / 100).toString() + "%"
                        : (
                          ((100 - Number(positionData)) * 82) /
                          100
                        ).toString() + "%",
                    left:
                      selectorPosition === "top_left" ||
                        selectorPosition === "bottom_left"
                        ? "0"
                        : "calc(100% - 200px)",
                    height: "auto",
                    display: "block",
                    zIndex: "1000",
                    color: fontColor,
                  }}
                >
                  <div
                    id="ciwi-container"
                    style={{
                      width: "200px",
                      position: "absolute", // 改为绝对定位
                      top:
                        selectorPosition === "top_left" ||
                          selectorPosition === "top_right"
                          ? "40px"
                          : languageSelector && currencySelector
                            ? "-170px"
                            : "-120px", // 位于顶部
                      left: "50%", // 水平居中
                      transform: "translateX(-50%)", // 精确居中
                      height: "auto",
                      display: isSelectorOpen ? "block" : "none",
                      zIndex: "2",
                    }}
                  >
                    <div
                      id="selector-box"
                      style={{
                        background: backgroundColor,
                        border: "1px solid #ccc",
                        padding: "15px",
                        borderRadius: "5px",
                        marginBottom: "5px",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: `${languageSelector ? "block" : "none"}`,
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          className={styles.custom_selector}
                          data-type="language"
                          onClick={handleLanguageClick}
                        >
                          <div
                            className={styles.selector_header}
                            data-type="language"
                            style={{
                              backgroundColor: backgroundColor,
                              border: `1px solid ${optionBorderColor}`,
                            }}
                          >
                            <div
                              className={styles.selected_option}
                              data-type="language"
                            >
                              {isIncludedFlag && (
                                <img
                                  className={styles.country_flag}
                                  src={
                                    localization.languages.find(
                                      (language) => language.selected,
                                    )?.flag
                                  }
                                  alt=""
                                  width="25%"
                                  height="25%"
                                />
                              )}
                              <span
                                className={styles.selected_text}
                                data-type="language"
                              >
                                {
                                  localization.languages.find(
                                    (language) => language.selected,
                                  )?.localeName
                                }
                              </span>
                            </div>
                            <img
                              id="currency-arrow-icon"
                              className={styles.arrow_icon}
                              src="/arrow.svg"
                              alt="Arrow Icon"
                              width="25%"
                              height="25%"
                            />
                          </div>
                          <div
                            className={styles.options_container}
                            data-type="language"
                            style={{
                              display: isLanguageOpen ? "block" : "none",
                              backgroundColor: backgroundColor,
                              zIndex: "2000",
                            }}
                          >
                            <div
                              className={styles.options_list}
                              style={{
                                border: `1px solid ${optionBorderColor}`,
                              }}
                            >
                              {localization.languages.map((language) => (
                                <div
                                  className={styles.option_item}
                                  data-value={language.iso_code}
                                  data-type="language"
                                  onClick={() =>
                                    handleOptionClick(language.iso_code)
                                  }
                                  key={language.iso_code}
                                >
                                  {isIncludedFlag && (
                                    <img
                                      className={styles.country_flag}
                                      src={language.flag}
                                      alt=""
                                      width="25%"
                                      height="25%"
                                    />
                                  )}
                                  <span className={styles.option_text}>
                                    {language.localeName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: `${currencySelector ? "block" : "none"}`,
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          className={styles.custom_selector}
                          data-type="currency"
                          onClick={handleCurrencyClick}
                        >
                          <div
                            className={styles.selector_header}
                            data-type="currency"
                            style={{
                              backgroundColor: backgroundColor,
                              border: `1px solid ${optionBorderColor}`,
                            }}
                          >
                            <div
                              className={styles.selected_option}
                              data-type="currency"
                            >
                              <span
                                className={styles.selected_text}
                                data-type="currency"
                              >
                                {
                                  localization.currencies.find(
                                    (currency) => currency.selected,
                                  )?.localeName
                                }
                                (
                                {
                                  localization.currencies.find(
                                    (currency) => currency.selected,
                                  )?.symbol
                                }
                                )
                              </span>
                            </div>
                            <img
                              id="currency-arrow-icon"
                              className={styles.arrow_icon}
                              src="/arrow.svg"
                              alt="Arrow Icon"
                              width="25%"
                              height="25%"
                            />
                          </div>

                          <div
                            className={styles.options_container}
                            data-type="currency"
                            style={{
                              display: isCurrencyOpen ? "block" : "none",
                            }}
                          >
                            <div
                              className={styles.options_list}
                              style={{
                                backgroundColor: backgroundColor,
                                border: `1px solid ${optionBorderColor}`,
                              }}
                            >
                              {localization.currencies.map((currency) => (
                                <div
                                  className={styles.option_item}
                                  data-value={currency.iso_code}
                                  data-type="currency"
                                  key={currency.iso_code}
                                  onClick={() =>
                                    handleOptionClick(currency.iso_code)
                                  }
                                >
                                  <span className={styles.option_text}>
                                    {currency.localeName}
                                  </span>
                                  <span className={styles.currency_code}>
                                    ({currency.symbol})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={styles.button_wrapper}>
                        <button
                          id="switcher-confirm"
                          className={styles.ciwi_switcher_confirm_button}
                          style={{
                            backgroundColor: buttonBackgroundColor,
                            color: buttonColor,
                          }}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                  <div
                    id="main-box"
                    style={{
                      position: "relative",
                      background: backgroundColor,
                      padding: "10px",
                      borderRadius: "5px",
                      border: "1px solid rgb(217, 217, 217)",
                      cursor: "pointer",
                      userSelect: "none",
                      display: "flex",
                      alignItems: "center" /* 垂直居中 */,
                      justifyContent: isIncludedFlag ? "" : "center",
                      gap: "8px",
                      height: "40px" /* 明确设置高度 */,
                    }}
                    onClick={handleSelectorClick}
                  >
                    {isIncludedFlag && (
                      <img
                        className={styles.country_flag}
                        src={
                          localization.languages.find(
                            (language) => language.selected,
                          )?.flag
                        }
                        alt=""
                        width="25%"
                        height="25%"
                      />
                    )}
                    <span id="display-text" className={styles.main_box_text}>
                      {mainBoxText}
                    </span>
                    <img
                      id="mainbox-arrow-icon"
                      className={styles.mainarrow_icon}
                      src="/arrow.svg"
                      alt="Arrow Icon"
                      width="25%"
                      height="25%"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <TranslationWarnModal
          title={t("The Auto IP position has been limited due to your plan (Current plan: {{plan}})", { plan: planMapping[plan as keyof typeof planMapping] })}
          content={t("Please upgrade to a higher plan to unlock the Auto IP position")}
          action={() => {
            navigate("/app/pricing");
          }}
          actionText={t("Upgrade")}
          show={showWarnModal}
          setShow={setShowWarnModal}
        />
      </Space>
    </Page>
  );
};

export default Index;
