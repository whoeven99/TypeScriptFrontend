import { useEffect, useRef, useState } from "react";
import { Alert, Flex, Modal, Space, Spin, Typography } from "antd";
import { useTranslation } from "react-i18next";
import Button from "~/ui/components/AppButton";

const { Text } = Typography;

export type SubscriptionCheckoutInterval = "EVERY_30_DAYS" | "ANNUAL";

type Props = {
  open: boolean;
  confirmationUrl: string | null;
  planName: string;
  interval: SubscriptionCheckoutInterval;
  onClose?: () => void;
};

const CHECKOUT_POLL_INTERVAL_MS = 3000;
const CHECKOUT_POLL_MAX_ATTEMPTS = 200; // 约 10 分钟

/**
 * 订阅结账弹窗：Shopify confirmationUrl 无法嵌进 iframe（官方托管页有
 * X-Frame-Options/CORS 限制），因此弹窗提示 + 新标签页打开结账页，
 * 轮询 /api/billing/confirmation-status，订阅生效后自动刷新当前页面。
 */
export function SubscriptionCheckoutModal({
  open,
  confirmationUrl,
  planName,
  interval,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [popBlocked, setPopBlocked] = useState(false);
  const [checkingNow, setCheckingNow] = useState(false);
  const [notDetected, setNotDetected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const startedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const scheduleReload = () => {
    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current);
    }
    reloadTimerRef.current = window.setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const checkStatus = async () => {
    const res = await fetch(
      `/api/billing/confirmation-status?planName=${encodeURIComponent(
        planName,
      )}&interval=${encodeURIComponent(interval)}`,
    );
    const data = (await res.json()) as {
      ok?: boolean;
      matched?: boolean;
      shopifyMatched?: boolean;
    };
    return {
      matched: Boolean(data?.ok && data?.matched),
      shopifyMatched: Boolean(data?.ok && data?.shopifyMatched),
    };
  };

  const openCheckoutTab = () => {
    if (!confirmationUrl) return;
    let opened: Window | null = null;
    try {
      opened = window.open(confirmationUrl, "_blank", "noopener,noreferrer");
    } catch {
      opened = null;
    }
    setPopBlocked(!opened);
  };

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      stopPolling();
      setPopBlocked(false);
      setCheckingNow(false);
      setNotDetected(false);
      setSyncing(false);
      setCompleted(false);
      return;
    }
    if (!confirmationUrl || startedRef.current) return;

    startedRef.current = true;
    openCheckoutTab();
    pollAttemptsRef.current = 0;
    pollTimerRef.current = window.setInterval(() => {
      void (async () => {
        if (pollAttemptsRef.current >= CHECKOUT_POLL_MAX_ATTEMPTS) {
          stopPolling();
          return;
        }
        pollAttemptsRef.current += 1;
        try {
          const { matched, shopifyMatched } = await checkStatus();
          if (matched) {
            stopPolling();
            setCompleted(true);
            setSyncing(false);
            scheduleReload();
          } else if (shopifyMatched) {
            // Shopify 侧已确认支付，Turso/webhook 入账可能还在路上，继续轮询。
            setSyncing(true);
            setNotDetected(false);
          } else {
            setSyncing(false);
          }
        } catch {
          // 网络抖动，继续下一轮轮询
        }
      })();
    }, CHECKOUT_POLL_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, confirmationUrl]);

  useEffect(
    () => () => {
      stopPolling();
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
      }
    },
    [],
  );

  const handleCheckoutNow = async () => {
    setCheckingNow(true);
    setNotDetected(false);
    try {
      const { matched, shopifyMatched } = await checkStatus();
      if (matched) {
        stopPolling();
        setCheckingNow(false);
        setCompleted(true);
        scheduleReload();
      } else if (shopifyMatched) {
        setCheckingNow(false);
        setSyncing(true);
      } else {
        setCheckingNow(false);
        setNotDetected(true);
        setSyncing(false);
      }
    } catch {
      setCheckingNow(false);
      setNotDetected(true);
      setSyncing(false);
    }
  };

  const handleClose = () => {
    if (completed) return;
    stopPolling();
    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
    startedRef.current = false;
    onClose?.();
  };

  return (
    <Modal
      title={t("pricing.checkout_title")}
      open={open}
      centered
      closable={!completed}
      maskClosable={false}
      onCancel={handleClose}
      footer={
        completed ? null : (
          <Flex align="end" justify="end" gap={10}>
            <Button onClick={handleClose}>{t("pricing.checkout_later")}</Button>
            <Button loading={checkingNow} onClick={handleCheckoutNow}>
              {t("pricing.checkout_done")}
            </Button>
            <Button type="primary" onClick={openCheckoutTab}>
              {t("pricing.checkout_open")}
            </Button>
          </Flex>
        )
      }
    >
      {completed ? (
        <Space
          direction="vertical"
          align="center"
          style={{ width: "100%", padding: "24px 0" }}
        >
          <Spin />
          <Text>{t("pricing.checkout_success")}</Text>
        </Space>
      ) : (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Text>{t("pricing.checkout_desc", { plan: planName })}</Text>
          {popBlocked ? (
            <Alert
              type="warning"
              showIcon
              message={t("pricing.checkout_blocked")}
            />
          ) : null}
          {syncing ? (
            <Alert
              type="success"
              showIcon
              message={t("pricing.checkout_syncing")}
            />
          ) : null}
          {notDetected ? (
            <Alert
              type="info"
              showIcon
              message={t("pricing.checkout_not_detected")}
            />
          ) : null}
        </Space>
      )}
    </Modal>
  );
}
