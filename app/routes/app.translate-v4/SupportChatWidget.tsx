import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { v4Colors } from "./v4Styles";

type SupportMessage = {
  id: string;
  sender: string; // "shop" | "ops"
  senderName: string | null;
  content: string;
  createdAt: string;
};

type SupportConversation = {
  id: string;
  status: string;
  contactEmail: string | null;
  shopEmail: string | null;
  unreadForShop: number;
  messages: SupportMessage[];
};

const OPEN_POLL_MS = 5000;
const BADGE_POLL_MS = 30000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAWK_HIDE_STYLE_ID = "hide-tawk-translate-v4";

type TawkApi = {
  hideWidget?: () => void;
  showWidget?: () => void;
  onLoad?: () => void;
};

/** v4 页使用自建客服，屏蔽 root.tsx 全局注入的 Tawk.to 绿色气泡。 */
function useHideTawkWidget() {
  useEffect(() => {
    const win = window as Window & { Tawk_API?: TawkApi };
    const hideTawk = () => win.Tawk_API?.hideWidget?.();

    if (win.Tawk_API?.hideWidget) {
      hideTawk();
    } else {
      win.Tawk_API = win.Tawk_API ?? {};
      const prevOnLoad = win.Tawk_API.onLoad;
      win.Tawk_API.onLoad = () => {
        prevOnLoad?.();
        hideTawk();
      };
    }

    if (!document.getElementById(TAWK_HIDE_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = TAWK_HIDE_STYLE_ID;
      style.textContent =
        "#tawk-bubble-container, .tawk-min-container { display: none !important; }";
      document.head.appendChild(style);
    }

    return () => {
      document.getElementById(TAWK_HIDE_STYLE_ID)?.remove();
      win.Tawk_API?.showWidget?.();
    };
  }, []);
}

async function fetchConversation(
  markSeen: boolean,
): Promise<SupportConversation | null> {
  const res = await fetch(`/api/support?markSeen=${markSeen ? "true" : "false"}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; conversation?: SupportConversation };
  return data.ok && data.conversation ? data.conversation : null;
}

async function postSupport(body: Record<string, unknown>): Promise<{
  ok: boolean;
  error?: string;
  message?: SupportMessage;
}> {
  const res = await fetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({ ok: false }))) as {
    ok: boolean;
    error?: string;
    message?: SupportMessage;
  };
}

export function SupportChatWidget() {
  useHideTawkWidget();

  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  // 邮箱采集
  const [emailInput, setEmailInput] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async (markSeen: boolean) => {
    const conv = await fetchConversation(markSeen);
    if (!conv) return;
    setConversation(conv);
    if (markSeen) setUnread(0);
    else setUnread(conv.unreadForShop);
  }, []);

  // 打开时高频轮询；关闭时低频拉徽标。
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      void refresh(open);
    };
    tick();
    const interval = window.setInterval(tick, open ? OPEN_POLL_MS : BADGE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, refresh]);

  // 新消息滚到底部
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length, open]);

  const handleSend = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const content = draft.trim();
      if (!content || sending) return;
      setSending(true);
      setError(null);
      const result = await postSupport({ intent: "send", content });
      setSending(false);
      if (!result.ok) {
        setError("发送失败，请稍后重试");
        return;
      }
      setDraft("");
      await refresh(true);
    },
    [draft, sending, refresh],
  );

  const handleSaveEmail = useCallback(async () => {
    const email = emailInput.trim();
    if (!EMAIL_RE.test(email)) {
      setEmailError("请输入有效的邮箱地址");
      return;
    }
    setEmailError(null);
    const result = await postSupport({ intent: "setEmail", email });
    if (result.ok) {
      setEmailSaved(true);
      setConversation((prev) => (prev ? { ...prev, contactEmail: email } : prev));
    }
  }, [emailInput]);

  const showEmailPrompt =
    open && conversation != null && !conversation.contactEmail && !emailSaved;

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="联系客服"
          onClick={() => setOpen(true)}
          style={styles.launcher}
        >
          <ChatIcon />
          {unread > 0 && <span style={styles.badge}>{unread > 9 ? "9+" : unread}</span>}
        </button>
      )}

      {open && (
        <div style={styles.panel} role="dialog" aria-label="在线客服">
          <div style={styles.header}>
            <span style={styles.headerTitle}>在线客服</span>
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setOpen(false)}
              style={styles.closeBtn}
            >
              ✕
            </button>
          </div>

          <div style={styles.body}>
            <div style={styles.greeting}>
              你好，有任何关于翻译的问题都可以在这里留言，我们会尽快回复。
            </div>

            {showEmailPrompt && (
              <div style={styles.emailBox}>
                <div style={styles.emailPrompt}>留个邮箱，方便我们在你离线时回复你：</div>
                <div style={styles.emailRow}>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    style={styles.emailInput}
                  />
                  <button type="button" onClick={handleSaveEmail} style={styles.emailBtn}>
                    保存
                  </button>
                </div>
                {emailError && <div style={styles.errorText}>{emailError}</div>}
              </div>
            )}
            {emailSaved && <div style={styles.savedText}>邮箱已保存</div>}

            {conversation && conversation.messages.length === 0 && (
              <div style={styles.empty}>还没有消息，发一条开始对话吧。</div>
            )}

            {conversation?.messages.map((m) => {
              const mine = m.sender === "shop";
              return (
                <div
                  key={m.id}
                  style={{
                    ...styles.msgRow,
                    justifyContent: mine ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={mine ? styles.bubbleMine : styles.bubbleOps}>
                    {!mine && (
                      <div style={styles.senderName}>{m.senderName || "客服"}</div>
                    )}
                    <div style={styles.msgContent}>{m.content}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {error && <div style={styles.errorBar}>{error}</div>}

          <form style={styles.inputBar} onSubmit={handleSend}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="输入消息…"
              style={styles.textInput}
              disabled={sending}
            />
            <button
              type="submit"
              style={styles.sendBtn}
              disabled={sending || !draft.trim()}
            >
              发送
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  launcher: {
    position: "fixed",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: v4Colors.primary,
    color: v4Colors.primaryTextOnFill,
    border: `1px solid ${v4Colors.primary}`,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2147483000,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    padding: "0 5px",
    borderRadius: 10,
    background: v4Colors.danger,
    color: "var(--p-color-text-on-color-bg-fill)",
    fontSize: 12,
    lineHeight: "20px",
    textAlign: "center",
    fontWeight: 600,
  },
  panel: {
    position: "fixed",
    right: 20,
    bottom: 20,
    width: 360,
    maxWidth: "calc(100vw - 40px)",
    height: 520,
    maxHeight: "calc(100vh - 40px)",
    background: v4Colors.cardBg,
    border: `1px solid ${v4Colors.cardBorder}`,
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 2147483000,
    fontFamily: v4Colors.font,
  },
  header: {
    background: v4Colors.cardSubdued,
    color: v4Colors.text,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${v4Colors.cardBorder}`,
  },
  headerTitle: { fontWeight: 600, fontSize: 14 },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: v4Colors.textMuted,
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
    background: v4Colors.cardSubdued,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  greeting: {
    fontSize: 13,
    color: v4Colors.textMuted,
    background: v4Colors.cardBg,
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${v4Colors.cardBorder}`,
    lineHeight: "20px",
  },
  emailBox: {
    background: v4Colors.cardBg,
    border: `1px solid ${v4Colors.cardBorder}`,
    borderRadius: 8,
    padding: 10,
  },
  emailPrompt: { fontSize: 12, color: v4Colors.textMuted, marginBottom: 6, lineHeight: "20px" },
  emailRow: { display: "flex", gap: 6 },
  emailInput: {
    flex: 1,
    border: `1px solid ${v4Colors.cardBorder}`,
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
    background: v4Colors.cardBg,
    color: v4Colors.text,
    outline: "none",
  },
  emailBtn: {
    background: v4Colors.primary,
    color: v4Colors.primaryTextOnFill,
    border: `1px solid ${v4Colors.primary}`,
    borderRadius: 6,
    padding: "0 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
    minWidth: 56,
  },
  savedText: { fontSize: 12, color: v4Colors.success, paddingLeft: 4 },
  errorText: { fontSize: 12, color: v4Colors.danger, marginTop: 4 },
  empty: {
    fontSize: 13,
    color: v4Colors.textMuted,
    textAlign: "center",
    marginTop: 24,
    lineHeight: "20px",
  },
  msgRow: { display: "flex" },
  bubbleMine: {
    background: v4Colors.primary,
    color: v4Colors.primaryTextOnFill,
    padding: "8px 12px",
    borderRadius: "12px 12px 2px 12px",
    maxWidth: "78%",
    fontSize: 14,
    wordBreak: "break-word",
    lineHeight: "20px",
  },
  bubbleOps: {
    background: v4Colors.cardBg,
    color: v4Colors.text,
    padding: "8px 12px",
    borderRadius: "12px 12px 12px 2px",
    maxWidth: "78%",
    fontSize: 14,
    wordBreak: "break-word",
    border: `1px solid ${v4Colors.cardBorder}`,
    lineHeight: "20px",
  },
  senderName: { fontSize: 11, color: v4Colors.textMuted, marginBottom: 2, fontWeight: 600 },
  msgContent: { whiteSpace: "pre-wrap" },
  errorBar: {
    fontSize: 12,
    color: v4Colors.danger,
    padding: "4px 12px",
    background: v4Colors.dangerBg,
  },
  inputBar: {
    display: "flex",
    gap: 8,
    padding: 10,
    borderTop: `1px solid ${v4Colors.cardBorder}`,
    background: v4Colors.cardBg,
  },
  textInput: {
    flex: 1,
    border: `1px solid ${v4Colors.cardBorder}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    background: v4Colors.cardBg,
    color: v4Colors.text,
    outline: "none",
  },
  sendBtn: {
    background: v4Colors.primary,
    color: v4Colors.primaryTextOnFill,
    border: `1px solid ${v4Colors.primary}`,
    borderRadius: 8,
    padding: "0 16px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    minWidth: 64,
  },
};
