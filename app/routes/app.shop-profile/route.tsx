import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Progress,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
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
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center">
          <Title level={3} style={{ margin: 0 }}>
            店铺画像扫描结果
          </Title>
          <Button
            type="primary"
            loading={isRescanning}
            disabled={!configured || isActive}
            onClick={handleRescan}
          >
            {isActive ? "扫描进行中…" : "重新扫描"}
          </Button>
        </Flex>

        {!configured ? (
          <Card>
            <Empty description="店铺画像扫描未配置（缺少 Cosmos 环境变量）" />
          </Card>
        ) : !scan && !profile ? (
          <Card>
            <Empty description="尚未扫描。安装后会自动触发一次扫描，或点击右上角「重新扫描」。">
              <Button
                type="primary"
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
            <Card title="扫描状态" size="small">
              <Flex vertical gap={12}>
                <Flex gap={24} wrap="wrap" align="center">
                  <Text>
                    状态：
                    {scan ? (
                      <Tag
                        color={STATUS_COLOR[scan.status]}
                        style={{ marginLeft: 8 }}
                        {...SCAN_TAG_STYLE}
                      >
                        {STATUS_LABEL[scan.status]}
                      </Tag>
                    ) : (
                      <Tag {...SCAN_TAG_STYLE}>未知</Tag>
                    )}
                  </Text>
                  <Text type="secondary">触发来源：{scan?.trigger ?? "-"}</Text>
                  <Text type="secondary">更新时间：{formatDate(scan?.updatedAt)}</Text>
                </Flex>
                <Flex gap={8} wrap="wrap">
                  {scan
                    ? (Object.keys(STAGE_LABEL) as Array<keyof typeof STAGE_LABEL>).map(
                        (stage) => {
                          const st = (scan.stages as Record<string, ShopScanStageState>)[
                            stage
                          ];
                          return (
                            <Tag
                              key={stage}
                              color={st ? STAGE_STATE_COLOR[st] : "default"}
                              {...SCAN_TAG_STYLE}
                            >
                              {STAGE_LABEL[stage]}：{st ? STAGE_STATE_LABEL[st] : "-"}
                            </Tag>
                          );
                        },
                      )
                    : null}
                </Flex>
              </Flex>
            </Card>

            {/* 店铺画像 */}
            <Card title="店铺画像" size="small">
              {profile ? (
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                  <Descriptions.Item label="店铺名称">
                    {profile.shopName || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="默认语言">
                    {profile.primaryLocale || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="行业/品类">
                    {profile.industry || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="品牌语气">
                    {profile.brandTone || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="关键词" span={2}>
                    {profile.keywords.length ? (
                      <Flex gap={4} wrap="wrap">
                        {profile.keywords.map((k) => (
                          <Tag key={k}>{k}</Tag>
                        ))}
                      </Flex>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="店铺描述" span={2}>
                    <Paragraph style={{ margin: 0 }}>
                      {profile.description || "-"}
                    </Paragraph>
                  </Descriptions.Item>
                  <Descriptions.Item label="生成模型" span={2}>
                    <Text type="secondary">
                      {profile.aiModel || "-"}
                      {profile.lastScannedAt
                        ? `　·　${formatDate(profile.lastScannedAt)}`
                        : ""}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Empty description="画像尚未生成（可能素材不足或 AI 未配置）" />
              )}
            </Card>

            {/* 内容规模 */}
            <Card title="内容规模（默认语言）" size="small">
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Statistic
                    title="可翻译条目总数"
                    value={formatNumber(scan?.summary?.totalItems)}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="源文字符总数"
                    value={formatNumber(scan?.summary?.totalChars)}
                  />
                </Col>
              </Row>
              <Table
                size="small"
                pagination={false}
                dataSource={moduleRows}
                columns={[
                  { title: "模块", dataIndex: "module", key: "module" },
                  {
                    title: "条目数",
                    dataIndex: "items",
                    key: "items",
                    align: "right",
                    render: (v: number) => formatNumber(v),
                    sorter: (a, b) => a.items - b.items,
                  },
                  {
                    title: "字符数",
                    dataIndex: "chars",
                    key: "chars",
                    align: "right",
                    render: (v: number) => formatNumber(v),
                    sorter: (a, b) => a.chars - b.chars,
                  },
                ]}
                locale={{ emptyText: "暂无数据" }}
              />
            </Card>

            {/* 语言覆盖率 */}
            <Card title="已发布语言覆盖率" size="small">
              <Table
                size="small"
                pagination={false}
                dataSource={coverageRows}
                columns={[
                  { title: "语言", dataIndex: "locale", key: "locale" },
                  {
                    title: "已翻译 / 总数",
                    key: "count",
                    align: "right",
                    render: (_: unknown, r: (typeof coverageRows)[number]) =>
                      `${formatNumber(r.translated)} / ${formatNumber(r.total)}`,
                  },
                  {
                    title: "覆盖率",
                    dataIndex: "percent",
                    key: "percent",
                    width: 220,
                    render: (percent: number | null) =>
                      percent === null ? (
                        "-"
                      ) : (
                        <Progress
                          percent={percent}
                          size="small"
                          status={percent >= 100 ? "success" : "active"}
                        />
                      ),
                  },
                ]}
                locale={{ emptyText: "无已发布的目标语言" }}
              />
            </Card>

            {/* AI 术语表 */}
            <Card title="AI 术语表" size="small">
              <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                <Text>
                  本次扫描生成术语：
                  <Text strong style={{ marginLeft: 4 }}>
                    {formatNumber(scan?.summary?.glossaryCount ?? 0)}
                  </Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    （默认停用，需在术语表页确认后生效）
                  </Text>
                </Text>
                <Button onClick={() => window.open("/app/glossary", "_self")}>
                  前往术语表确认
                </Button>
              </Flex>
            </Card>
          </>
        )}
      </Flex>
    </Page>
  );
}
