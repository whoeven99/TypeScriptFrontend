import React, { useState } from "react";
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
} from "antd";
import { Page } from "@shopify/polaris";
import { useLocation } from "@remix-run/react";
import ScrollNotice from "~/components/ScrollNotice";
import { useTranslation } from "react-i18next";
import { Icon } from "@shopify/polaris";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { useNavigate } from "@remix-run/react";
const { Text } = Typography;
const TranslationDashboard = () => {
  const { state } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [useTermbase, setTermbase] = useState(false);
  const [useSwitcher, setSwitcher] = useState(true);
  const [publishLanguage, setPublishLanguage] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const languageTranslation = [
    { languge: "简体中文", code: "zh-CN", hasTranslated: false },
    { languge: "繁体中文", code: "zh-TW", hasTranslated: false },
    { languge: "日语", code: "ja", hasTranslated: false },
    { languge: "法语", code: "fr", hasTranslated: false },
  ];
  const {
    totalScore,
    notTransLanguage,
    incompatibleStyles,
    notEnabled,
    notSEOFriendly,
    notOnBrand,
  } = state.analyticsData || {};
  const handleNavigate = () => {
    navigate(-1);
  };
  return (
    <Page>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      {/* 头部卡片 - 翻译质量得分 */}
      <Button
        type="text"
        variant="outlined"
        onClick={handleNavigate}
        style={{ padding: "4px" }}
      >
        <Icon source={ArrowLeftIcon} tone="base" />
      </Button>
      <Card
        title="翻译质量得分"
        extra={<Button type="primary">重新检测</Button>}
        style={{ marginBottom: 20 }}
      >
        <Row gutter={16}>
          <Col
            span={6}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Progress type="circle" percent={88} size="small" format={(percent)=>percent}/>
          </Col>
          <Col
            span={18}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <p>
              经过 AI 检测，你的网站翻译质量得分为
              <span
                style={{ color: "green", fontSize: "18px", padding: "0 4px" }}
              >
                {totalScore}
              </span>
              分，其中有
              <span
                style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
              >
                {notTransLanguage}
              </span>
              个语言未翻译，有
              <span
                style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
              >
                {notEnabled}
              </span>
              个提升翻译的操作未启用， 有
              <span
                style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
              >
                {incompatibleStyles}
              </span>
              个语言翻译质量不符合当地语言风格， 有
              <span
                style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
              >
                {notSEOFriendly}
              </span>
              个语言翻译不符合SEO规范。有
              <span
                style={{ color: "red", fontSize: "18px", padding: "0 4px" }}
              >
                {notOnBrand}
              </span>
              个语言翻译不符合品牌调性。
            </p>
          </Col>
        </Row>
      </Card>

      {/* 语言翻译情况 */}
      <Card
        title="语言翻译情况"
        extra={
          <Button onClick={() => navigate("/app/language")}>去优化</Button>
        }
        style={{ marginBottom: 20 }}
      >
        <Row gutter={16}>
          {languageTranslation.map((item, index) => {
            return (
              <Col key={index} span={12} style={{ padding: "20px" }}>
                <Flex justify="space-between">
                  <Text>{item.languge}</Text>
                  {item.hasTranslated ? (
                    <Tag color="success">已翻译</Tag>
                  ) : (
                    <Tag color="error">未翻译</Tag>
                  )}
                </Flex>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 翻译待办事项 */}
      <Card title="翻译实时性和专业性" style={{ marginBottom: 20 }}>
        <Flex vertical gap="middle">
          <Flex justify="space-between" align="center">
            <Text>术语库 (Termbase)</Text>
            {useTermbase ? (
              <Text style={{ padding: "15px" }}>已启用</Text>
            ) : (
              <Button
                onClick={() => navigate("/app/glossary")}
                style={{ marginTop: 8 }}
              >
                启用
              </Button>
            )}
          </Flex>
          <Flex justify="space-between" align="center">
            <Text>切换器 (Switcher)</Text>
            {useSwitcher ? (
              <Text style={{ padding: "15px" }}>已启用</Text>
            ) : (
              <Button style={{ marginTop: 8 }}>启用</Button>
            )}
          </Flex>
          <Flex justify="space-between" align="center">
            <Text>已发布语言</Text>
            {publishLanguage ? (
              <Text>已启用</Text>
            ) : (
              <Button
                onClick={() => navigate("/app/language")}
                style={{ marginTop: 8 }}
              >
                启用
              </Button>
            )}
          </Flex>
          <Flex justify="space-between" align="center">
            <Text>启用自动翻译</Text>
            {autoTranslate ? (
              <Text>已启用</Text>
            ) : (
              <Button
                onClick={() => navigate("/app/language")}
                style={{ marginTop: 8 }}
              >
                启用
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* 翻译质量检查 */}
      <Card title="翻译质量检查" style={{ marginBottom: 20 }}>
        <p>
          日语
          <br />
          texttexttexttexttexttexttexttexttexttexttexttexttexttexttext文
          <br />
          英语
          <br />
          texttexttexttexttexttexttexttexttexttexttexttext文
        </p>
      </Card>

      {/* SEO 检查 */}
      <Card title="SEO 检查" style={{ marginBottom: 20 }}>
        <p style={{ marginBottom: 20, fontSize: "24px" }}>
          默认语言的关键词为 "test"
        </p>
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
      </Card>

      {/* 翻译的属性检查 */}
      <Card title="翻译的调性检查" style={{ marginBottom: 20 }}>
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
      </Card>
    </Page>
  );
};

export default TranslationDashboard;
