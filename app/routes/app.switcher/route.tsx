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

const Index = () => {
    const [isSwitcherEnabled, setIsSwitcherEnabled] = useState(false);
    const [isGeoLocationEnabled, setIsGeoLocationEnabled] = useState(false);
    const [isIncludedFlag, setIsIncludedFlag] = useState(false);
    const [switcherSelectedOption, setSwitcherSelectedOption] = useState("language");
    const [fontColor, setFontColor] = useState("#000000");
    const [backgroundColor, setBackgroundColor] = useState("#ffffff");
    const [backgroundTransparency, setBackgroundTransparency] = useState(0);
    const [switcherPosition, setSwitcherPosition] = useState("top_left");

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

    const handleSwitcherEnabledChange = (checked: boolean) => {
        setIsSwitcherEnabled(checked);
    };

    const handleOptionChange = (value: string) => {
        setSwitcherSelectedOption(value);
    };

    const handleIncludedFlagChange = (checked: boolean) => {
        setIsIncludedFlag(checked);
    };

    const handleFontColorChange = (color: string) => {
        setFontColor(color);
    };

    const handleBackgroundColorChange = (color: string) => {
        setBackgroundColor(color);
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

    const localization = {
        languages: [
            {
                iso_code: "en",
                name: "English",
            },
            {
                iso_code: "zh",
                name: "Chinese",
            }
        ]
    }
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
                                    {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Text>{t("Included flag:")}</Text>
                                        <Switch checked={isIncludedFlag} onChange={handleIncludedFlagChange} />
                                    </div> */}
                                    <div style={{ display: "flex", flexDirection: "row", gap: 20 }}>
                                        <div style={{ flex: 1, flexDirection: "column", display: "flex", justifyContent: "space-between" }}>
                                            <Text>{t("Font Color:")}</Text>
                                            <ColorPicker style={{ alignSelf: 'flex-start' }} value={fontColor} onChange={(e) => handleFontColorChange(e.toHexString())} showText />
                                        </div>
                                        <div style={{ flex: 1, flexDirection: "column", display: "flex", justifyContent: "space-between" }}>
                                            <Text>{t("Background Color:")}</Text>
                                            <ColorPicker style={{ alignSelf: 'flex-start' }} value={backgroundColor} onChange={(e) => handleBackgroundColorChange(e.toHexString())} showText />
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
                            {/* <div style={{
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
                                    }}
                                >
                                    <div
                                        id="ciwi-container"
                                        style={{
                                            width: "200px",
                                            position: "absolute", // 改为绝对定位
                                            top: switcherPosition === "top_left" || switcherPosition === "top_right" ? "43px" : (switcherSelectedOption === "language_and_currency" ? "-222px" : "-142px"),            // 位于顶部
                                            left: "50%",         // 水平居中
                                            transform: "translateX(-50%)", // 精确居中
                                            height: "auto",
                                            display: "block",
                                            zIndex: "2",
                                        }}
                                    >
                                        <div
                                            id="selector-box"
                                            style={{ background: "#fff", border: "1px solid #ccc", padding: "15px", borderRadius: "5px", marginBottom: "5px", width: "100%" }}
                                        >
                                            <div style={{
                                                display: `${switcherSelectedOption === "language" || switcherSelectedOption === "language_and_currency" ? "block" : "none"}`,
                                                marginBottom: "10px",
                                            }}>
                                                <label className={styles.language_title}>Language</label>
                                                <div className={styles.select_wrapper}>
                                                    <select id="language-switcher" className={styles.ciwi_select}>
                                                        {localization.languages.map((language) => (
                                                            <option key={language.iso_code} value={language.iso_code}>
                                                                {language.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                // <img
                                                //     id="language-arrow-icon"
                                                //     className={styles.arrow_icon}
                                                //     src="/arrow.svg"
                                                //     alt="Arrow Icon"
                                                //     width="25%"
                                                //     height="25%"
                                                // /> 
                                            </div>
                                            <div style={{ 
                                                display: `${switcherSelectedOption === "currency" || switcherSelectedOption === "language_and_currency" ? "block" : "none"}`,
                                                marginBottom: "10px",
                                            }}>
                                                <label className={styles.currency_title} id="currency-title">Currency</label>
                                                <div className={styles.select_wrapper}>
                                                    <select id="currency-switcher" className={styles.ciwi_select}>
                                                        {localization.languages.map((language) => (
                                                            <option key={language.iso_code} value={language.iso_code}>
                                                                {language.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    // <img
                                                    //     id="currency-arrow-icon"
                                                    //     className={styles.arrow_icon}
                                                    //     src="/arrow.svg"
                                                    //     alt="Arrow Icon"
                                                    //     width="25%"
                                                    //     height="25%"
                                                    // /> 
                                                </div>
                                            </div>
                                            <div className={styles.button_wrapper}>
                                                <button id="switcher-confirm" className={styles.ciwi_switcher_confirm_button}>Confirm</button>
                                                <button id="switcher-close" className={styles.ciwi_switcher_cancel_button}>Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        id="main-box"
                                        style={{
                                            position: "absolute", // 改为绝对定位
                                            // bottom: "0",         // 位于底部
                                            left: "50%",         // 水平居中
                                            transform: "translateX(-50%)", // 精确居中
                                            width: "200px",      // 设置宽度
                                            background: "#fff",  // 添加背景色
                                            padding: "10px",     // 添加内边距
                                            borderRadius: "5px", // 圆角
                                            border: "1px solid #ccc", // 边框
                                            cursor: "pointer"    // 鼠标指针
                                        }}
                                    >
                                        <span id="display-text" className={styles.main_box_text}>{localization.languages[0].name + " / " + localization.languages[1].name}</span>
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
                            </div> */}
                        </Card>
                    </div>
                </div>
            </Space >
        </Page >
    );
};

export default Index;


