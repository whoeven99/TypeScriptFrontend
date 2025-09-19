import React, { useEffect, useState } from "react";
import {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { GetRealTimeQuotaData, GetStoreLanguage } from "../../api/JavaServer";
import {
  Card,
  Button,
  Statistic,
  Row,
  Col,
  Divider,
  Flex,
  Typography,
  Tag,
  Progress,
  Result,
  Affix,
  Skeleton,
} from "antd";
import { BlockStack, Page } from "@shopify/polaris";
import { useLocation } from "@remix-run/react";
import ScrollNotice from "~/components/ScrollNotice";
import { useTranslation } from "react-i18next";
import { Icon } from "@shopify/polaris";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { useNavigate, useFetcher } from "@remix-run/react";
import useReport from "scripts/eventReport";
const { Text, Title } = Typography;
interface ReportData {
  totalScore: number;
  notTransLanguage: [
    { language: string; code: string; hasTranslated: boolean },
  ];
  incompatibleStyles: number;
  notEnabled: number;
  notSEOFriendly: number;
  notOnBrand: number;
}
interface RealTimeData {
  autoTranslate: false;
  glossary: false;
  switch: false;
}
interface StoreLanguage {
  language: string;
  status: "untranslated" | "translated" | "translating" | "partial";
}
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  return json({ shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const { admin } = adminAuthResult;
  console.log("conversion rate action", shop);

  try {
    const formData = await request.formData();
    const LanguageFetcher = JSON.parse(
      formData.get("LanguageFetcher") as string,
    );
    const realTimeFetcher = JSON.parse(
      formData.get("realTimeFetcher") as string,
    );
    if (LanguageFetcher) {
      try {
        const mutationResponse = await admin.graphql(
          `query MyQuery {
            shopLocales(published: true) {
              locale
              name
              primary
              published
            }
          }`,
        );
        const data = (await mutationResponse.json()) as any;
        let source = "en";
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            if (item.primary === true) {
              source = item.locale;
            }
          });
        }
        const response = await GetStoreLanguage({
          shop,
          source: source,
        });
        return response;
      } catch (error) {
        console.log("get polarisViz data failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    if (realTimeFetcher) {
      try {
        // const { languages, days } = LanguageFetcher;
        const response = await GetRealTimeQuotaData({
          shop,
        });
        return response;
      } catch (error) {
        console.log("get polarisViz data failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    return json({ success: false, message: "conersion action Invalid data" });
  } catch (error) {
    console.error("Error action conversion route:", error);
    return json({ error: "Error action app" }, { status: 500 });
  }
};

const TranslationDashboard = () => {
  const { reportClick } = useReport();
  const { state } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [useTermbase, setTermbase] = useState(false);
  const [useSwitcher, setSwitcher] = useState(true);
  const [publishLanguage, setPublishLanguage] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [reDectionLoading, setReDectionLoading] = useState(false);
  const translationEvaluationFetcher = useFetcher<any>();
  const storeLanguageFetcher = useFetcher<any>();
  const realTimeQuotaFetcher = useFetcher<any>();
  const [storeLanguages, setStoreLanguages] = useState<StoreLanguage[]>([]);
  const [realTimeData, setRealTimeData] = useState<RealTimeData>({
    autoTranslate: false,
    glossary: false,
    switch: false,
  });
  const [reportIntroduction, setReportIntroduction] = useState({
    notTransLanguage: 0,
    optimizationNotEnabled: 0,
  });
  // const languageTranslation = [
  //   { languge: "简体中文", code: "zh-CN", hasTranslated: false },
  //   { languge: "繁体中文", code: "zh-TW", hasTranslated: false },
  //   { languge: "日语", code: "ja", hasTranslated: false },
  //   { languge: "法语", code: "fr", hasTranslated: false },
  // ];
  const [reportTotalData, setReportTotalData] = useState<ReportData>();
  useEffect(() => {
    handleRequestReportData();
    // setReportTotalData({
    //   totalScore: 45,
    //   notTransLanguage: ['en','ja','fr','ch-ZH'],
    //   incompatibleStyles: 9,
    //   notEnabled: 7,
    //   notSEOFriendly: 77,
    //   notOnBrand: 99,
    // });
    const length = storeLanguages.filter(
      (item) => item.status === "untranslated",
    ).length;
    let optimizationNotEnabled = 0;
    if (length !== 1) {
      optimizationNotEnabled += 1;
    }
    Object.values(realTimeData).forEach((value) => {
      if (!value) {
        optimizationNotEnabled += 1;
      }
    });
    setReportIntroduction((prev) => ({
      ...prev,
      notTransLanguage: length,
      optimizationNotEnabled,
    }));
  }, []);
  const handleNavigate = () => {
    navigate("/app");
  };
  const handleReDetection = () => {
    setReDectionLoading(true);
    console.log("重新检测");
    handleRequestReportData();
    reportClick("translate_report_retest");
  };
  const handleRequestReportData = () => {
    const formData = new FormData();
    formData.append("translationScore", JSON.stringify({}));
    translationEvaluationFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  };
  useEffect(() => {
    const languageFormData = new FormData();
    languageFormData.append("LanguageFetcher", JSON.stringify({}));
    storeLanguageFetcher.submit(languageFormData, {
      method: "post",
      action: "/app/translate_report",
    });

    const realTimeFormData = new FormData();
    realTimeFormData.append("realTimeFetcher", JSON.stringify({}));
    realTimeQuotaFetcher.submit(realTimeFormData, {
      method: "post",
      action: "/app/translate_report",
    });
  }, []);
  useEffect(() => {
    if (storeLanguageFetcher.data) {
      // console.log(storeLanguageFetcher.data);
      if (storeLanguageFetcher.data.success) {
        const languagesObj = { ...storeLanguageFetcher.data.response };
        setPublishLanguage(languagesObj["Published Languages"] === 1);
        delete languagesObj["Published Languages"];
        const languageArr = Object.entries(languagesObj).map(
          ([language, value]) => {
            let status:
              | "untranslated"
              | "translated"
              | "translating"
              | "partial";

            if (value === 0) {
              status = "untranslated";
            } else if (value === 1) {
              status = "translated";
            } else if (value === 2) {
              status = "translating";
            } else {
              status = "partial";
            }

            return {
              language,
              status,
            };
          },
        );
        setStoreLanguages(languageArr);
      }
    }
  }, [storeLanguageFetcher.data]);
  useEffect(() => {
    if (realTimeQuotaFetcher.data) {
      if (realTimeQuotaFetcher.data.success) {
        // console.log(realTimeQuotaFetcher.data);
        setRealTimeData(realTimeQuotaFetcher.data.response);
      }
    }
  }, [realTimeQuotaFetcher.data]);
  useEffect(() => {
    if (translationEvaluationFetcher.data) {
      // console.log(translationEvaluationFetcher.data);
      setReportTotalData(translationEvaluationFetcher.data.response.data);
      setLoading(false);
      setReDectionLoading(false);
    }
  }, [translationEvaluationFetcher.data]);
  return (
    <Page>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      {/* 头部卡片 - 翻译质量得分 */}
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
              {t("Translation quality assessment")}
            </Title>
          </div>
          {isLoading ? (
            <Skeleton.Button active />
          ) : (
            <Button
              type="primary"
              loading={reDectionLoading}
              onClick={handleReDetection}
            >
              {t("Retest")}
            </Button>
          )}
        </div>
      </Affix>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}></div>
      <Divider style={{ margin: "0" }} />
      <Card title={t("Translation quality score")} style={{ margin: "20px 0" }}>
        {isLoading ? (
          <BlockStack>
            <Skeleton.Node
              active
              style={{ height: 100, width: "100%" }}
            ></Skeleton.Node>
          </BlockStack>
        ) : (
          <Row gutter={16}>
            <Col
              span={8}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Progress
                type="circle"
                percent={reportTotalData?.totalScore ?? 0}
                size={120}
                format={(percent) => (
                  <span style={{ fontSize: 22, fontWeight: "bold" }}>
                    {percent}
                  </span>
                )}
              />
            </Col>
            {/* <Col
              span={18}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <p>
                {t(
                  "After AI testing, your website translation quality score is",
                )}
                <span
                  style={{ color: "green", fontSize: "18px", padding: "0 4px" }}
                >
                  {reportTotalData?.totalScore}
                </span>
                {t("points, of which")}
                <span
                  style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
                >
                  {reportTotalData?.notTransLanguage?.length}
                </span>
                {t("languages ​​not translated,has")}
                <span
                  style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
                >
                  {reportTotalData?.notEnabled}
                </span>
                {t("The operations to improve translation are not enabled.has")}
                <span
                  style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
                >
                  {reportTotalData?.incompatibleStyles}
                </span>
                {t(
                  "The quality of language translation does not meet the local language style.has",
                )}
                <span
                  style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
                >
                  {reportTotalData?.notSEOFriendly}
                </span>
                {t("The language translation does not meet SEO standards.has")}
                <span
                  style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
                >
                  {reportTotalData?.notOnBrand}
                </span>
                {t("The language translation does not match the brand tone.")}
              </p>
            </Col> */}
            <Col
              span={16}
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              <div style={{ lineHeight: 1.8, fontSize: "16px" }}>
                <p>
                  {t(
                    "After AI evaluation, your website translation quality score is",
                  )}
                  <span
                    style={{
                      color: "green",
                      fontSize: "22px",
                      fontWeight: "bold",
                      padding: "0 6px",
                    }}
                  >
                    {reportTotalData?.totalScore}
                  </span>
                  {t("points")}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "12px 0" }}>
                  <li>
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      {
                        storeLanguages.filter(
                          (item) => item.status === "untranslated",
                        ).length
                        // reportIntroduction.notTransLanguage
                      }
                    </span>{" "}
                    {t("languages not translated")}
                  </li>
                  <li>
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      {reportIntroduction.optimizationNotEnabled}
                    </span>{" "}
                    {t("translation optimization features not enabled")}
                  </li>
                  {/* <li>
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      {reportTotalData?.incompatibleStyles}
                    </span>{" "}
                    {t("translations not matching local style")}
                  </li>
                  <li>
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      {reportTotalData?.notSEOFriendly}
                    </span>{" "}
                    {t("translations not SEO-friendly")}
                  </li>
                  <li>
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      {reportTotalData?.notOnBrand}
                    </span>{" "}
                    {t("translations not aligned with brand tone")}
                  </li> */}
                </ul>
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* 语言翻译情况 */}
      <Card
        title={t("Language translation")}
        extra={
          isLoading ? (
            <Skeleton.Button active />
          ) : (
            <Button
              onClick={() => {
                navigate("/app/language");
                reportClick("transate_report_deoptimization");
              }}
            >
              {t("Deoptimization")}
            </Button>
          )
        }
        style={{ marginBottom: 20 }}
      >
        {storeLanguageFetcher.state === "submitting" ? (
          <BlockStack>
            <Skeleton.Node
              active
              style={{ height: 100, width: "100%" }}
            ></Skeleton.Node>
          </BlockStack>
        ) : (
          <Row gutter={16}>
            {storeLanguages.map((item, index) => (
              <Col key={index} span={8} style={{ padding: "20px" }}>
                <Flex justify="space-between">
                  <Text>{item.language}</Text>
                  {item.status === "translated" && (
                    <Tag color="success">{t("Translated")}</Tag>
                  )}
                  {item.status === "untranslated" && (
                    <Tag color="error">{t("Untranslated")}</Tag>
                  )}
                  {item.status === "translating" && (
                    <Tag color="processing">{t("Translating")}</Tag>
                  )}
                  {item.status === "partial" && (
                    <Tag color="warning">{t("Partially Translated")}</Tag>
                  )}
                </Flex>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* 翻译待办事项 */}
      <Card
        title={t("Real-time and professional translation")}
        style={{ marginBottom: 20 }}
      >
        {isLoading ? (
          <BlockStack>
            <Skeleton.Node
              active
              style={{ height: 200, width: "100%" }}
            ></Skeleton.Node>
          </BlockStack>
        ) : (
          <Flex vertical gap="middle">
            <Flex justify="space-between" align="center">
              <Text>{t("Termbase")}</Text>
              {realTimeData.glossary ? (
                <Text style={{ padding: "15px" }}>{t("Enabled")}</Text>
              ) : (
                <Button
                  onClick={() => {
                    navigate("/app/glossary");
                    reportClick("translate_report_open_termbase");
                  }}
                  style={{ marginTop: 8 }}
                >
                  {t("Enable")}
                </Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>{t("Switcher")}</Text>
              {realTimeData.switch ? (
                <Text style={{ padding: "15px" }}>{t("Enabled")}</Text>
              ) : (
                <Button
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    navigate("/app/switcher");
                    reportClick("translate_report_open_switcher");
                  }}
                >
                  {t("Enable")}
                </Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>{t("Published Languages")}</Text>
              {publishLanguage ? (
                <Text style={{ padding: "15px" }}>{t("Enabled")}</Text>
              ) : (
                <Button
                  onClick={() => {
                    navigate("/app/language");
                    reportClick("translate_report_manage_language");
                  }}
                  style={{ marginTop: 8 }}
                >
                  {t("Enable")}
                </Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>{t("Enable automatic translation")}</Text>
              {realTimeData.autoTranslate ? (
                <Text style={{ padding: "15px" }}>{t("Enabled")}</Text>
              ) : (
                <Button
                  onClick={() => {
                    navigate("/app/language");
                    reportClick("translate_report_manage_auto_translate");
                  }}
                  style={{ marginTop: 8 }}
                >
                  {t("Enable")}
                </Button>
              )}
            </Flex>
          </Flex>
        )}
      </Card>

      {/* <Card title="翻译质量检查" style={{ marginBottom: 20 }}>
        {isLoading ? (
          <BlockStack>
            <Skeleton.Node
              active
              style={{ height: 100, width: "100%" }}
            ></Skeleton.Node>
          </BlockStack>
        ) : (
          <p>
            日语
            <br />
            texttexttexttexttexttexttexttexttexttexttexttexttexttexttext文
            <br />
            英语
            <br />
            texttexttexttexttexttexttexttexttexttexttexttext文
          </p>
        )}
      </Card>

      <Card title="SEO 检查" style={{ marginBottom: 20 }}>
        <p style={{ marginBottom: 20, fontSize: "24px" }}>
          默认语言的关键词为 "test"
        </p>
        {isLoading ? (
          <BlockStack>
            <Skeleton.Node
              active
              style={{ height: 300, width: "100%" }}
            ></Skeleton.Node>
          </BlockStack>
        ) : (
          <Flex vertical gap="middle">
            <Flex justify="space-between" align="center">
              <Text>产品标题/描述是否翻译</Text>
              {useTermbase ? (
                <Text style={{ padding: "15px" }}>已完成</Text>
              ) : (
                <Button
                  onClick={() => navigate("/app/glossary")}
                  style={{ marginTop: 8 }}
                >
                  去优化
                </Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>产品图片标题/描述是否翻译</Text>
              {useSwitcher ? (
                <Text style={{ padding: "15px" }}>已完成</Text>
              ) : (
                <Button style={{ marginTop: 8 }}>去优化</Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>Meta Title & Meta Description是否翻译</Text>
              {publishLanguage ? (
                <Text>已翻译</Text>
              ) : (
                <Button
                  onClick={() => navigate("/app/language")}
                  style={{ marginTop: 8 }}
                >
                  去优化
                </Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>ALT是否翻译</Text>
              {autoTranslate ? (
                <Text>已翻译</Text>
              ) : (
                <Button
                  onClick={() => navigate("/app/language")}
                  style={{ marginTop: 8 }}
                >
                  去优化
                </Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>URL是否翻译</Text>
              {autoTranslate ? (
                <Text>已翻译</Text>
              ) : (
                <Button
                  onClick={() => navigate("/app/language")}
                  style={{ marginTop: 8 }}
                >
                  去优化
                </Button>
              )}
            </Flex>
          </Flex>
        )}
      </Card>

      <Card title="翻译的调性检查" style={{ marginBottom: 20 }}>
        {isLoading ? (
          <BlockStack>
            <Skeleton.Node
              active
              style={{ height: 100, width: "100%" }}
            ></Skeleton.Node>
          </BlockStack>
        ) : (
          <Flex vertical gap="middle">
            <Flex justify="space-between" align="center">
              <Text>品牌词是否强化</Text>
              {useTermbase ? (
                <Text style={{ padding: "15px" }}>已完成</Text>
              ) : (
                <Button
                  onClick={() => navigate("/app/glossary")}
                  style={{ marginTop: 8 }}
                >
                  去优化
                </Button>
              )}
            </Flex>
            <Flex justify="space-between" align="center">
              <Text>标题句式是否符合当地风格</Text>
              {useSwitcher ? (
                <Text style={{ padding: "15px" }}>已完成</Text>
              ) : (
                <Button style={{ marginTop: 8 }}>去优化</Button>
              )}
            </Flex>
          </Flex>
        )}
      </Card> */}
    </Page>
  );
};

export default TranslationDashboard;
