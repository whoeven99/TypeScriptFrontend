import React, { useEffect, useState, useMemo } from "react";
import {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import {
  GetRealTimeQuotaData,
  GetStoreLanguage,
  GetTranslationQualityScore,
} from "../../api/JavaServer";
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
  Spin,
  Empty,
} from "antd";
import { BlockStack, Page } from "@shopify/polaris";
import { useLocation } from "@remix-run/react";
import ScrollNotice from "~/components/ScrollNotice";
import { useTranslation } from "react-i18next";
import { Icon } from "@shopify/polaris";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { useNavigate, useFetcher } from "@remix-run/react";
import useReport from "scripts/eventReport";
import TranslatedIcon from "app/components/translateIcon";
const { Text, Title } = Typography;
interface RealTimeData {
  autoTranslate: false;
  glossary: false;
  switch: false;
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

  try {
    const formData = await request.formData();
    const LanguageFetcher = JSON.parse(
      formData.get("LanguageFetcher") as string,
    );
    const realTimeFetcher = JSON.parse(
      formData.get("realTimeFetcher") as string,
    );
    const translationScore = JSON.parse(
      formData.get("translationScore") as string,
    );
    if (translationScore) {
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
        const response = await GetTranslationQualityScore({
          shop,
          source: source,
        });

        return response;
      } catch (error) {
        console.log("get translation score failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [publishLanguage, setPublishLanguage] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [reDectionLoading, setReDectionLoading] = useState(false);
  const translationEvaluationFetcher = useFetcher<any>();
  const storeLanguageFetcher = useFetcher<any>();
  const realTimeQuotaFetcher = useFetcher<any>();
  const [languageStatus, setLanguageStatus] = useState<boolean>(false);
  const [reportIntroduction, setReportIntroduction] = useState<{
    notTransLanguage: number | null;
    optimizationNotEnabled: number | null;
  }>({
    notTransLanguage: null,
    optimizationNotEnabled: null,
  });
  const [reportData, setReportData] = useState<any>({
    totalScore: null,
    language: [],
    realTimeBtns: {
      autoTranslate: false,
      glossary: false,
      switch: false,
      publishLanguage: false,
    },
  });
  useState<boolean>(false);
  useEffect(() => {
    if (reportData && reportData.totalScore !== null) {
      localStorage.setItem("reportData", JSON.stringify(reportData));
    }
  }, [reportData]);
  useEffect(() => {
    // 查看浏览器有无存储报告数据
    const data = localStorage.getItem("reportData") as any;
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setReportData({
          totalScore: parsed.totalScore ?? null,
          language: parsed.language ?? [],
          realTimeBtns: parsed.realTimeBtns ?? {
            autoTranslate: false,
            glossary: false,
            switch: false,
            publishLanguage: false,
          },
        });
      } catch {
        console.error("localStorage 解析失败，使用默认值");
      }
    } else {
      handleRequestReportData();
    }
  }, []);
  const optimizationNotEnabled = useMemo(() => {
    if (
      storeLanguageFetcher.state === "loading" ||
      realTimeQuotaFetcher.state === "loading"
    ) {
      return null; // 数据没准备好
    }

    let count = 0;
    Object.entries(reportData.realTimeBtns).forEach(([, value]) => {
      if (!value) count++;
    });
    return count;
  }, [reportData, storeLanguageFetcher.state, realTimeQuotaFetcher.state]);

  useEffect(() => {
    const length = reportData.language.filter(
      (item: any) => item[1] === 0,
    ).length;

    setReportIntroduction({
      notTransLanguage: length,
      optimizationNotEnabled,
    });
  }, [reportData.language, optimizationNotEnabled]);
  const handleNavigate = () => {
    navigate("/app");
  };
  const handleReDetection = () => {
    setReDectionLoading(true);
    handleRequestReportData();
    reportClick("translate_report_retest");
  };
  const handleRequestReportData = () => {
    const formData = new FormData();
    formData.append("translationScore", JSON.stringify({}));
    translationEvaluationFetcher.submit(formData, {
      method: "post",
      action: "/app/translate_report",
    });
    setLoading(true);
    const languageFormData = new FormData();
    languageFormData.append("LanguageFetcher", JSON.stringify({}));
    storeLanguageFetcher.submit(languageFormData, {
      method: "post",
      action: "/app/translate_report",
    });
    setLanguageStatus(true);
    const realTimeFormData = new FormData();
    realTimeFormData.append("realTimeFetcher", JSON.stringify({}));
    realTimeQuotaFetcher.submit(realTimeFormData, {
      method: "post",
      action: "/app/translate_report",
    });
  };
  useEffect(() => {
    if (storeLanguageFetcher.data) {
      if (storeLanguageFetcher.data.success) {
        const languagesObj = { ...storeLanguageFetcher.data.response };
        const publishLang = languagesObj["Published Languages"] === 1;
        setPublishLanguage(languagesObj["Published Languages"] === 1);

        delete languagesObj["Published Languages"];
        setReportData((prev: any) => {
          const next = {
            ...prev,
            realTimeBtns: {
              ...(prev.realTimeBtns ?? {}),
              publishLanguage: publishLang,
            },
            language: Object.entries(languagesObj),
          };
          return next;
        });

        setLanguageStatus(false);
      }
    }
  }, [storeLanguageFetcher.data]);
  useEffect(() => {
    if (realTimeQuotaFetcher.data) {
      if (realTimeQuotaFetcher.data.success) {
        setReportData((prev: any) => ({
          ...prev,
          realTimeBtns: {
            ...prev.realTimeBtns,
            ...realTimeQuotaFetcher.data.response,
          },
        }));
      }
    }
  }, [realTimeQuotaFetcher.data]);
  useEffect(() => {
    if (
      translationEvaluationFetcher.data &&
      translationEvaluationFetcher.data.success
    ) {
      setReportData((prev: any) => ({
        ...prev,
        totalScore: Math.ceil(
          translationEvaluationFetcher.data?.response * 100,
        ),
      }));
      localStorage.setItem(
        "translate_report_score",
        JSON.stringify(
          Math.ceil(translationEvaluationFetcher.data?.response * 100),
        ),
      );
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
                percent={reportData.totalScore || 0}
                size={120}
                format={(percent) => (
                  <span style={{ fontSize: 22, fontWeight: "bold" }}>
                    {percent}
                  </span>
                )}
                strokeColor={
                  reportData.totalScore >= 60
                    ? reportData.totalScore >= 80
                      ? "#52c41a"
                      : "#faad14"
                    : "#ff4d4f"
                }
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
                      color:
                        reportData.totalScore >= 80
                          ? "#52c41a"
                          : reportData.totalScore >= 60
                            ? "#faad14"
                            : "#ff4d4f",
                      fontSize: "22px",
                      fontWeight: "bold",
                      padding: "0 6px",
                    }}
                  >
                    {reportData.totalScore || 0}
                  </span>
                  {t("points")}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "12px 0" }}>
                  {/* <li>
                    <Spin size="small" />
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
                  </li> */}
                  <li>
                    {storeLanguageFetcher.state === "submitting" ? (
                      <Spin size="small" />
                    ) : (
                      <>
                        <span style={{ color: "red", fontWeight: "bold" }}>
                          {
                            // storeLanguages.filter(
                            //   (item) => item.status === "untranslated",
                            // ).length
                            reportIntroduction.notTransLanguage
                          }
                        </span>{" "}
                      </>
                    )}
                    {t("languages not translated")}
                  </li>

                  <li>
                    {storeLanguageFetcher.state === "submitting" ||
                    reportIntroduction.optimizationNotEnabled === null ? (
                      <Spin size="small" />
                    ) : (
                      <>
                        <span style={{ color: "red", fontWeight: "bold" }}>
                          {reportIntroduction.optimizationNotEnabled}
                        </span>{" "}
                      </>
                    )}
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
          languageStatus ? (
            <Skeleton.Button active />
          ) : (
            reportData.language.length > 0 && (
              <Button
                onClick={() => {
                  navigate("/app/language");
                  reportClick("transate_report_deoptimization");
                }}
              >
                {t("Deoptimization")}
              </Button>
            )
          )
        }
        style={{ marginBottom: 20 }}
      >
        {languageStatus ? (
          <BlockStack>
            <Skeleton.Node
              active
              style={{ height: 100, width: "100%" }}
            ></Skeleton.Node>
          </BlockStack>
        ) : (
          <>
            {reportData.language.length > 0 ? (
              <Row gutter={16}>
                {reportData.language.map((item: any, index: number) => (
                  <Col key={index} span={8} style={{ padding: "20px" }}>
                    <Flex justify="space-between">
                      <Text>{item[0]}</Text>
                      <TranslatedIcon status={item[1]} />
                    </Flex>
                  </Col>
                ))}
              </Row>
            ) : (
              <Flex
                vertical
                justify="center"
                align="center"
                style={{ padding: "40px 0" }}
              >
                <Empty
                  description={
                    <Text type="secondary" style={{ fontSize: 16 }}>
                      {t("You haven't added any languages yet")}
                    </Text>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
                <Button
                  type="primary"
                  size="middle"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate("/app/language")}
                >
                  {t("Manage Languages")}
                </Button>
              </Flex>
            )}
          </>
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
              {reportData.realTimeBtns.glossary ? (
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
              {reportData.realTimeBtns.switch ? (
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
              {reportData.realTimeBtns.publishLanguage ? (
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
              {reportData.realTimeBtns.autoTranslate ? (
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
