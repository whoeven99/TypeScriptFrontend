import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Progress,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  BookOutlined,
  DashboardOutlined,
  GlobalOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo } from "react";
import Button from "~/ui/components/AppButton";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import {
  getLatestShopScanJob,
  type ShopScanJob,
  type ShopScanStageState,
  type ShopScanStatus,
} from "~/server/shopScan/cosmos.server";
import { enqueueShopScan } from "~/server/shopScan/trigger.server";

const { Title, Text, Paragraph } = Typography;

type ProfileView = {
  shopName: string | null;
  primaryLocale: string | null;
  industry: string | null;
  keywords: string[];
  description: string | null;
  brandTone: string | null;
  aiModel: string | null;
  lastScannedAt: string | null;
};

type ScanView = Pick<
  ShopScanJob,
  "id" | "trigger" | "status" | "stages" | "summary" | "createdAt" | "updatedAt"
>;

type LoaderData = {
  configured: boolean;
  profile: ProfileView | null;
  scan: ScanView | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const configured = Boolean(
    process.env.COSMOS_ENDPOINT_V4?.trim() && process.env.COSMOS_KEY_V4?.trim(),
  );

  let profile: ProfileView | null = null;
  let scan: ScanView | null = null;

  try {
    const row = await prisma.shopProfile.findUnique({ where: { shop } });
    if (row) {
      profile = {
        shopName: row.shopName,
        primaryLocale: row.primaryLocale,
        industry: row.industry,
        keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
        description: row.description,
        brandTone: row.brandTone,
        aiModel: row.aiModel,
        lastScannedAt: row.lastScannedAt ? row.lastScannedAt.toISOString() : null,
      };
    }
  } catch (err) {
    console.error("[shop-profile page] read ShopProfile failed:", err);
  }

  if (configured) {
    try {
      const latest = await getLatestShopScanJob(shop);
      if (latest) {
        scan = {
          id: latest.id,
          trigger: latest.trigger,
          status: latest.status,
          stages: latest.stages,
          summary: latest.summary,
          createdAt: latest.createdAt,
          updatedAt: latest.updatedAt,
        };
      }
    } catch (err) {
      console.error("[shop-profile page] read latest scan failed:", err);
    }
  }

  return json<LoaderData>({ configured, profile, scan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const result = await enqueueShopScan({ shop: session.shop, trigger: "manual" });
  return json(result);
};

const STATUS_COLOR: Record<ShopScanStatus, string> = {
  CREATED: "default",
  QUEUED: "processing",
  SCANNING: "processing",
  COMPLETED: "success",
  PARTIAL: "warning",
  FAILED: "error",
};

const STATUS_LABEL: Record<ShopScanStatus, string> = {
  CREATED: "已创建",
  QUEUED: "排队中",
  SCANNING: "扫描中",
  COMPLETED: "已完成",
  PARTIAL: "部分完成",
  FAILED: "失败",
};

const STAGE_LABEL: Record<string, string> = {
  contentSize: "内容规模",
  profile: "店铺画像",
  coverage: "语言覆盖率",
  glossary: "AI 术语表",
};

const STAGE_STATE_COLOR: Record<ShopScanStageState, string> = {
  PENDING: "default",
  DONE: "success",
  SKIPPED: "default",
  FAILED: "error",
};

const STAGE_STATE_LABEL: Record<ShopScanStageState, string> = {
  PENDING: "待处理",
  DONE: "完成",
  SKIPPED: "跳过",
  FAILED: "失败",
};

/** 扫描状态 Tag：白底描边，避免 success 等预设色的深色填充 */
const SCAN_TAG_STYLE = { variant: "outlined" as const };

const STATUS_ICON: Record<ShopScanStatus, React.ReactNode> = {
  CREATED: <ClockCircleOutlined />,
  QUEUED: <SyncOutlined spin />,
  SCANNING: <SyncOutlined spin />,
  COMPLETED: <CheckCircleOutlined />,
  PARTIAL: <ExclamationCircleOutlined />,
  FAILED: <CloseCircleOutlined />,
};

const STATUS_TONE: Record<ShopScanStatus, string> = {
  CREATED: "var(--app-color-text-secondary)",
  QUEUED: "var(--app-accent-primary)",
  SCANNING: "var(--app-accent-primary)",
  COMPLETED: "var(--app-accent-growth)",
  PARTIAL: "var(--app-accent-utility)",
  FAILED: "var(--app-accent-critical)",
};

const STAGE_ICON: Record<ShopScanStageState, React.ReactNode> = {
  PENDING: <ClockCircleOutlined />,
  DONE: <CheckCircleOutlined />,
  SKIPPED: <ClockCircleOutlined />,
  FAILED: <CloseCircleOutlined />,
};

const STAGE_TONE: Record<ShopScanStageState, string> = {
  PENDING: "rgba(0,0,0,0.45)",
  DONE: "var(--app-accent-growth)",
  SKIPPED: "rgba(0,0,0,0.45)",
  FAILED: "var(--app-accent-critical)",
};

const ACTIVE_STATUSES: ShopScanStatus[] = ["CREATED", "QUEUED", "SCANNING"];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function formatNumber(n: number | undefined | null): string {
  if (typeof n !== "number") return "-";
  return n.toLocaleString();
}

export default function ShopProfilePage() {
  const { configured, profile, scan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ enqueued: boolean; reason?: string }>();
  const revalidator = useRevalidator();

  const isActive = scan ? ACTIVE_STATUSES.includes(scan.status) : false;
  const isRescanning = fetcher.state !== "idle";

  // 扫描进行中时自动轮询刷新
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      if (revalidator.state === "idle") revalidator.revalidate();
    }, 5000);
    return () => clearInterval(timer);
  }, [isActive, revalidator]);

  const moduleRows = useMemo(() => {
    const stats = scan?.summary?.moduleStats ?? {};
    return Object.entries(stats)
      .map(([module, v]) => ({ key: module, module, items: v.items, chars: v.chars }))
      .filter((r) => r.items > 0)
      .sort((a, b) => b.items - a.items);
  }, [scan]);

  const coverageRows = useMemo(() => {
    return (scan?.summary?.coverage ?? []).map((c) => ({ key: c.locale, ...c }));
  }, [scan]);

  const handleRescan = () => {
    fetcher.submit({}, { method: "POST" });
  };

  return (
    <Page>
      <TitleBar title="店铺画像 (Shop Profile)" />
      <Flex vertical gap={20}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={12}>
            <DashboardOutlined style={{ fontSize: 22, color: "var(--app-accent-primary)" }} />
            <Title level={3} style={{ margin: 0 }}>
              店铺画像扫描结果
            </Title>
            {scan && (
              <Tag
                style={{
                  marginLeft: 4,
                  color: STATUS_TONE[scan.status],
                  borderColor: STATUS_TONE[scan.status],
                  background: "transparent",
                }}
              >
                {STATUS_LABEL[scan.status]}
              </Tag>
            )}
          </Flex>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={isRescanning}
            disabled={!configured || isActive}
            onClick={handleRescan}
          >
            {isActive ? "扫描进行中…" : "重新扫描"}
          </Button>
        </Flex>

        {!configured ? (
          <Card style={{ boxShadow: "var(--app-shadow-card)" }}>
            <Empty
              image={<ExclamationCircleOutlined style={{ fontSize: 48, color: "var(--app-accent-utility)" }} />}
              description="店铺画像扫描未配置（缺少 Cosmos 环境变量）"
            />
          </Card>
        ) : !scan && !profile ? (
          <Card style={{ boxShadow: "var(--app-shadow-card)" }}>
            <Empty
              image={<ThunderboltOutlined style={{ fontSize: 48, color: "var(--app-accent-primary)" }} />}
              description="尚未扫描。安装后会自动触发一次扫描，或点击下方按钮开始。"
            >
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={isRescanning}
                onClick={handleRescan}
              >
                立即扫描
              </Button>
            </Empty>
          </Card>
        ) : (
          <>
            {/* 扫描状态 */}
            <Card
              title={
                <Flex align="center" gap={8}>
                  {scan && (
                    <span style={{ color: STATUS_TONE[scan.status] }}>
                      {STATUS_ICON[scan.status]}
                    </span>
                  )}
                  <span>扫描状态</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              <Flex vertical gap={16}>
                {/* 更新时间 */}
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>更新时间</Text>
                  <Text>{formatDate(scan?.updatedAt)}</Text>
                </Flex>

                <Divider style={{ margin: "4px 0" }} />

                {/* 阶段进度 */}
                <Flex vertical gap={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    扫描阶段
                  </Text>
                  <Row gutter={[12, 12]}>
                    {(Object.keys(STAGE_LABEL) as Array<keyof typeof STAGE_LABEL>).map(
                      (stage, idx, arr) => {
                        const st = scan
                          ? (scan.stages as Record<string, ShopScanStageState>)[stage]
                          : undefined;
                        const isDone = st === "DONE";
                        const isLast = idx === arr.length - 1;
                        return (
                          <Col xs={12} sm={6} key={stage}>
                            <Flex align="center" gap={8}>
                              {/* 步骤序号圆圈 */}
                              <Flex
                                align="center"
                                justify="center"
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: isDone
                                    ? "var(--app-accent-growth)"
                                    : st === "FAILED"
                                      ? "var(--app-accent-critical)"
                                      : "rgba(0,0,0,0.06)",
                                  color: isDone || st === "FAILED"
                                    ? "#fff"
                                    : "rgba(0,0,0,0.45)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  flexShrink: 0,
                                  border: isDone || st === "FAILED"
                                    ? "none"
                                    : "2px solid rgba(0,0,0,0.10)",
                                }}
                              >
                                {isDone ? (
                                  <CheckCircleOutlined />
                                ) : st === "FAILED" ? (
                                  <CloseCircleOutlined />
                                ) : (
                                  idx + 1
                                )}
                              </Flex>
                              <Flex vertical gap={0} style={{ flex: 1 }}>
                                <Text
                                  strong
                                  style={{
                                    fontSize: 13,
                                    color: isDone
                                      ? "var(--app-color-text)"
                                      : "var(--app-color-text-secondary)",
                                  }}
                                >
                                  {STAGE_LABEL[stage]}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: st
                                      ? STAGE_TONE[st]
                                      : "var(--app-color-text-tertiary)",
                                  }}
                                >
                                  {st ? STAGE_STATE_LABEL[st] : "-"}
                                </Text>
                              </Flex>
                              {/* 连接线 */}
                              {!isLast && (
                                <div
                                  style={{
                                    display: "none",
                                    // shown on sm+
                                  }}
                                />
                              )}
                            </Flex>
                          </Col>
                        );
                      },
                    )}
                  </Row>
                </Flex>
              </Flex>
            </Card>

            {/* 店铺画像：独占一行 */}
            <Card
              title={
                <Flex align="center" gap={8}>
                  <DatabaseOutlined style={{ color: "var(--app-accent-primary)" }} />
                  <span>店铺画像</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              {profile ? (
                <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small" bordered>
                  <Descriptions.Item label="店铺名称">
                    {profile.shopName || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="默认语言">
                    <Tag>{profile.primaryLocale || "-"}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="行业/品类">
                    <Tag color="blue">{profile.industry || "-"}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="品牌语气">
                    {profile.brandTone || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="AI 模型" span={2}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {profile.aiModel || "-"}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="关键词" span={3}>
                    {profile.keywords.length ? (
                      <Flex gap={4} wrap="wrap">
                        {profile.keywords.map((k) => (
                          <Tag key={k} color="purple">{k}</Tag>
                        ))}
                      </Flex>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="店铺描述" span={3}>
                    <Paragraph
                      style={{ margin: 0 }}
                      ellipsis={{ rows: 2, expandable: true }}
                    >
                      {profile.description || "-"}
                    </Paragraph>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Empty description="画像尚未生成（可能素材不足或 AI 未配置）" />
              )}
            </Card>

            {/* 内容规模 + 语言覆盖率：双栏 */}
            <Row gutter={[20, 20]}>
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <Flex align="center" gap={8}>
                      <ThunderboltOutlined style={{ color: "var(--app-accent-utility)" }} />
                      <span>内容规模</span>
                    </Flex>
                  }
                  style={{ boxShadow: "var(--app-shadow-card)", height: "100%" }}
                >
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Statistic
                        title="可翻译条目"
                        value={formatNumber(scan?.summary?.totalItems)}
                        valueStyle={{ color: "var(--app-accent-primary)", fontSize: 24 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="源文字符数"
                        value={formatNumber(scan?.summary?.totalChars)}
                        valueStyle={{ color: "var(--app-color-text)", fontSize: 24 }}
                      />
                    </Col>
                  </Row>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={moduleRows}
                    columns={[
                      { title: "模块", dataIndex: "module", key: "module", ellipsis: true },
                      {
                        title: "条目",
                        dataIndex: "items",
                        key: "items",
                        align: "right",
                        width: 72,
                        render: (v: number) => formatNumber(v),
                        sorter: (a, b) => a.items - b.items,
                      },
                      {
                        title: "字符",
                        dataIndex: "chars",
                        key: "chars",
                        align: "right",
                        width: 72,
                        render: (v: number) => formatNumber(v),
                        sorter: (a, b) => a.chars - b.chars,
                      },
                    ]}
                    locale={{ emptyText: "暂无数据" }}
                  />
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  title={
                    <Flex align="center" gap={8}>
                      <GlobalOutlined style={{ color: "var(--app-accent-primary)" }} />
                      <span>已发布语言覆盖率</span>
                    </Flex>
                  }
                  style={{ boxShadow: "var(--app-shadow-card)", height: "100%" }}
                >
                  {coverageRows.length > 0 ? (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={coverageRows}
                      columns={[
                        { title: "语言", dataIndex: "locale", key: "locale", width: 80 },
                        {
                          title: "进度",
                          key: "count",
                          align: "right",
                          width: 100,
                          render: (_: unknown, r: (typeof coverageRows)[number]) =>
                            `${formatNumber(r.translated)} / ${formatNumber(r.total)}`,
                        },
                        {
                          title: "覆盖率",
                          dataIndex: "percent",
                          key: "percent",
                          render: (percent: number | null) =>
                            percent === null ? (
                              <Text type="secondary">-</Text>
                            ) : (
                              <Flex align="center" gap={8}>
                                <Progress
                                  percent={percent}
                                  size="small"
                                  status={percent >= 100 ? "success" : "active"}
                                  style={{ flex: 1, margin: 0 }}
                                  strokeColor={
                                    percent >= 100
                                      ? "var(--app-accent-growth)"
                                      : percent >= 50
                                        ? "var(--app-accent-primary)"
                                        : "var(--app-accent-utility)"
                                  }
                                />
                                <Text
                                  strong
                                  style={{
                                    fontSize: 13,
                                    minWidth: 40,
                                    textAlign: "right",
                                    color:
                                      percent >= 100
                                        ? "var(--app-accent-growth)"
                                        : "var(--app-color-text)",
                                  }}
                                >
                                  {percent}%
                                </Text>
                              </Flex>
                            ),
                        },
                      ]}
                      locale={{ emptyText: "无已发布的目标语言" }}
                    />
                  ) : (
                    <Empty description="无已发布的目标语言" />
                  )}
                </Card>
              </Col>
            </Row>

            {/* AI 术语表 */}
            <Card
              title={
                <Flex align="center" gap={8}>
                  <BookOutlined style={{ color: "var(--app-accent-primary)" }} />
                  <span>AI 术语表</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              <Row align="middle" justify="space-between">
                <Col>
                  <Flex vertical gap={4}>
                    <Flex align="baseline" gap={8}>
                      <Text>本次扫描生成术语</Text>
                      <Text
                        strong
                        style={{
                          fontSize: 20,
                          color: "var(--app-accent-primary)",
                        }}
                      >
                        {formatNumber(scan?.summary?.glossaryCount ?? 0)}
                      </Text>
                      <Text>条</Text>
                    </Flex>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      默认停用，需在术语表页面手动确认后才会生效
                    </Text>
                  </Flex>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    ghost
                    onClick={() => window.open("/app/glossary", "_self")}
                  >
                    前往术语表确认
                  </Button>
                </Col>
              </Row>
            </Card>
          </>
        )}
      </Flex>
    </Page>
  );
}
