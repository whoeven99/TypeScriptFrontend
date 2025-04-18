import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Space, Card, Typography, Switch, Select, ColorPicker, Slider } from "antd";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import styles from "./styles.module.css";
import { useEffect, useState } from "react";
import { ActionFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";

const { Text, Title } = Typography;

export const action = async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const loading = formData.get("loading") as string;
    try {
        switch (true) {
            case !!loading:
                return {
                    switcherEnabled: true,
                    switcherSelectedOption: "language",
                }
            default:
                return null;
        }
    } catch (error) {
        console.error("Error switcher action:", error);
    }
};

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
    ]
}

const Index = () => {
    const [isSwitcherEnabled, setIsSwitcherEnabled] = useState(false);
    const [isGeoLocationEnabled, setIsGeoLocationEnabled] = useState(false);
    const [isIncludedFlag, setIsIncludedFlag] = useState(false);
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [switcherSelectedOption, setSwitcherSelectedOption] = useState("language");
    const [fontColor, setFontColor] = useState("#000000");
    const [backgroundColor, setBackgroundColor] = useState("#ffffff");
    const [buttonColor, setButtonColor] = useState("#ffffff");
    const [buttonBackgroundColor, setButtonBackgroundColor] = useState("#000000");
    const [optionBorderColor, setOptionBorderColor] = useState("#ccc");
    const [backgroundTransparency, setBackgroundTransparency] = useState(0);
    const [switcherPosition, setSwitcherPosition] = useState("top_left");
    const [localization, setLocalization] = useState(initialLocalization);

    const { t } = useTranslation();
    const fetcher = useFetcher<any>();

    useEffect(() => {
        fetcher.submit({
            loadSwitcher: JSON.stringify(true),
        }, {
            method: "POST",
            action: "/app/switcher",
        });
    }, []);

    useEffect(() => {
        if (fetcher.data) {
            setIsSwitcherEnabled(fetcher.data.switcherEnabled);
            setSwitcherSelectedOption(fetcher.data.switcherSelectedOption);
            // setIsGeoLocationEnabled(fetcher.data.geoLocationEnabled);
        }
    }, [fetcher.data]);

    useEffect(() => {
        console.log(localization);
    }, [localization]);

    const handleSwitcherEnabledChange = (checked: boolean) => {
        setIsSwitcherEnabled(checked);
    };

    const handleOptionChange = (value: string) => {
        setSwitcherSelectedOption(value);
    };

    const handleIncludedFlagChange = (checked: boolean) => {
        setIsIncludedFlag(checked);
    };

    const handleBackgroundTransparencyChange = (value: number) => {
        setBackgroundTransparency(value);
    };

    const handleSwitcherPositionChange = (value: string) => {
        setSwitcherPosition(value);
    };

    const handleGeoLocationEnabledChange = (checked: boolean) => {
        setIsGeoLocationEnabled(checked);
    };

    const handleLanguageClick = () => {
        setIsLanguageOpen(!isLanguageOpen);
    };

    const handleCurrencyClick = () => {
        setIsCurrencyOpen(!isCurrencyOpen);
    };

    const handleSelectorClick = () => {
        setIsSelectorOpen(!isSelectorOpen);
        setIsLanguageOpen(false);
        setIsCurrencyOpen(false);
    };

    const handleOptionClick = (value: string) => {
        setIsLanguageOpen(false);
        setIsCurrencyOpen(false);

        if (localization.languages.find(language => language.iso_code === value)) {
            localization.languages.forEach(language => {
                if (language.iso_code !== value) {
                    language.selected = false;
                } else {
                    language.selected = true;
                }
            });
            setLocalization({ ...localization });
        } else if (localization.currencies.find(currency => currency.iso_code === value)) {
            localization.currencies.forEach(currency => {
                if (currency.iso_code !== value) {
                    currency.selected = false;
                } else {
                    currency.selected = true;
                }
            });
            setLocalization({ ...localization });
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
        }
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
        }
    ];

    return (
        <Page>
            <TitleBar title={t("Switcher")} />
            <ScrollNotice text={t("Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.")} />
            <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                <div className={styles.switcher_container}>
                    <div className={styles.switcher_editor}>
                        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                            {/* <Card>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Text>{isSwitcherEnabled ? t("Switcher has been enabled") : t("Switcher has been disabled")}</Text>
                                    <Switch checked={isSwitcherEnabled} onChange={handleSwitcherEnabledChange} />
                                </div>
                            </Card> */}
                            <Card>
                                <Title level={5}>{t("Selector type configuration:")}</Title>
                                <Select options={switcherOptions} style={{ width: "100%" }} value={switcherSelectedOption} onChange={handleOptionChange} />
                            </Card>
                            <Card>
                                <Space direction="vertical" size="middle" style={{ display: "flex" }}>
                                    <Title level={5}>{t("Selector style configuration:")}</Title>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Text>{t("Included flag:")}</Text>
                                        <Switch checked={isIncludedFlag} onChange={handleIncludedFlagChange} />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                        <div style={{ flex: 1, flexDirection: "column", display: "flex", justifyContent: "space-between" }}>
                                            <Text>{t("Font Color:")}</Text>
                                            <ColorPicker style={{ alignSelf: 'flex-start' }} value={fontColor} onChange={(e) => setFontColor(e.toHexString())} showText />
                                        </div>
                                        <div style={{ flex: 1, flexDirection: "column", display: "flex", justifyContent: "space-between" }}>
                                            <Text>{t("Background Color:")}</Text>
                                            <ColorPicker style={{ alignSelf: 'flex-start' }} value={backgroundColor} onChange={(e) => setBackgroundColor(e.toHexString())} showText />
                                        </div>
                                        <div style={{ flex: 1, flexDirection: "column", display: "flex", justifyContent: "space-between" }}>
                                            <Text>{t("Button Color:")}</Text>
                                            <ColorPicker style={{ alignSelf: 'flex-start' }} value={buttonColor} onChange={(e) => setButtonColor(e.toHexString())} showText />
                                        </div>
                                        <div style={{ flex: 1, flexDirection: "column", display: "flex", justifyContent: "space-between" }}>
                                            <Text>{t("Button Background Color:")}</Text>
                                            <ColorPicker style={{ alignSelf: 'flex-start' }} value={buttonBackgroundColor} onChange={(e) => setButtonBackgroundColor(e.toHexString())} showText />
                                        </div>
                                        <div style={{ flex: 1, flexDirection: "column", display: "flex", justifyContent: "space-between" }}>
                                            <Text>{t("Option Border Color:")}</Text>
                                            <ColorPicker style={{ alignSelf: 'flex-start' }} value={optionBorderColor} onChange={(e) => setOptionBorderColor(e.toHexString())} showText />
                                        </div>
                                    </div>
                                    <div>
                                        <Text style={{ display: "block" }}>{t("Background transparency:")}</Text>
                                        <Slider value={backgroundTransparency} onChange={(e) => handleBackgroundTransparencyChange(e)} />
                                    </div>
                                    <div>
                                        <Text style={{ display: "block" }}>{t("Selector position:")}</Text>
                                        <Select options={switcherPositionOptions} style={{ width: "100%" }} value={switcherPosition} onChange={handleSwitcherPositionChange} />
                                    </div>
                                </Space>
                            </Card>
                            <Card>
                                <Title level={5}>{t("Selector IP position configuration:")}</Title>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Text> {t("Geolocation: ")}</Text>
                                    <Switch checked={isGeoLocationEnabled} onChange={handleGeoLocationEnabledChange} />
                                </div>
                            </Card>
                        </Space>
                    </div>
                    <div className={styles.switcher_preview}>
                        <Card>
                            <Title level={4}>{t("Preview")}</Title>
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                height: '400px',
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                background: '#f5f5f5',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '32px',
                                    background: '#e8e8e8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 12px',
                                    gap: '6px'
                                }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57' }} />
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e' }} />
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
                                </div>
                                <div
                                    style={{
                                        width: "200px",
                                        position: "relative",
                                        top: switcherPosition === "top_left" || switcherPosition === "top_right" ? "40px" : "calc(100% - 80px)",
                                        left: switcherPosition === "top_left" || switcherPosition === "bottom_left" ? "0" : "calc(100% - 200px)",
                                        height: "auto",
                                        display: "block",
                                        zIndex: "9999",
                                        color: fontColor,
                                    }}
                                >
                                    <div
                                        id="ciwi-container"
                                        style={{
                                            width: "200px",
                                            position: "absolute", // 改为绝对定位
                                            top: switcherPosition === "top_left" || switcherPosition === "top_right" ? "40px" : (switcherSelectedOption === "language_and_currency" ? "-170px" : "-120px"),            // 位于顶部
                                            left: "50%",         // 水平居中
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
                                                width: "100%"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: `${switcherSelectedOption === "language" || switcherSelectedOption === "language_and_currency" ? "block" : "none"}`,
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
                                                        }}>
                                                        <div className={styles.selected_option} data-type="language">
                                                            {isIncludedFlag && <img
                                                                className={styles.country_flag}
                                                                src={localization.languages.find(language => language.selected)?.flag}
                                                                alt=""
                                                                width="25%"
                                                                height="25%"
                                                            />}
                                                            <span className={styles.selected_text} data-type="language">
                                                                {localization.languages.find(language => language.selected)?.localeName}
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
                                                        }}>
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
                                                                    onClick={() => handleOptionClick(language.iso_code)}
                                                                    key={language.iso_code}
                                                                >
                                                                    {isIncludedFlag && <img
                                                                        className={styles.country_flag}
                                                                        src={language.flag}
                                                                        alt=""
                                                                        width="25%"
                                                                        height="25%"
                                                                    />}
                                                                    <span className={styles.option_text}>{language.localeName}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{
                                                display: `${switcherSelectedOption === "currency" || switcherSelectedOption === "language_and_currency" ? "block" : "none"}`,
                                                marginBottom: "10px",
                                            }}>
                                                <div className={styles.custom_selector} data-type="currency" onClick={handleCurrencyClick}>
                                                    <div
                                                        className={styles.selector_header}
                                                        data-type="currency"
                                                        style={{
                                                            backgroundColor: backgroundColor,
                                                            border: `1px solid ${optionBorderColor}`,
                                                        }}
                                                    >
                                                        <div className={styles.selected_option} data-type="currency">
                                                            <span className={styles.selected_text} data-type="currency">{localization.currencies.find(currency => currency.selected)?.localeName}({localization.currencies.find(currency => currency.selected)?.symbol})</span>
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

                                                    <div className={styles.options_container} data-type="currency" style={{ display: isCurrencyOpen ? "block" : "none" }}>
                                                        <div
                                                            className={styles.options_list}
                                                            style={{
                                                                backgroundColor: backgroundColor,
                                                                border: `1px solid ${optionBorderColor}`,
                                                            }}
                                                        >
                                                            {localization.currencies.map((currency) => (
                                                                <div className={styles.option_item} data-value={currency.iso_code} data-type="currency" key={currency.iso_code} onClick={() => handleOptionClick(currency.iso_code)}>
                                                                    <span className={styles.option_text}>{currency.localeName}</span>
                                                                    <span className={styles.currency_code}>({currency.symbol})</span>
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
                                                >Confirm</button>
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
                                            alignItems: "center", /* 垂直居中 */
                                            justifyContent: isIncludedFlag ? "" : "center",
                                            gap: "8px",
                                            height: "40px", /* 明确设置高度 */
                                        }}
                                        onClick={handleSelectorClick}
                                    >
                                        {isIncludedFlag && <img
                                            className={styles.country_flag}
                                            src={localization.languages.find(language => language.selected)?.flag}
                                            alt=""
                                            width="25%"
                                            height="25%"
                                        />}
                                        <span id="display-text" className={styles.main_box_text}>{localization.languages.find(language => language.selected)?.localeName + " / " + localization.currencies.find(currency => currency.selected)?.localeName}</span>
                                        <img
                                            id="mainbox-arrow-icon"
                                            className={styles.mainarrow_icon}
                                            src="/arrow.svg"
                                            alt="Arrow Icon"
                                            width="25%"
                                            height="25%"
                                        />
                                        <img
                                            className={styles.mobile_trans_img}
                                            src="/trans.png"
                                            alt="Button Image"
                                            width="50px"
                                            height="50px"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </Space >
        </Page >
    );
};

export default Index;


