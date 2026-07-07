# Debug Session: pricing-submit-abort
- **Status**: [OPEN]
- **Issue**: `/app/pricing` 页面前端出现 `AbortError: signal is aborted without reason`
- **Debug Server**: N/A
- **Log File**: N/A

## Reproduction Steps
1. 打开 `/app/pricing`
2. 在页面上触发某个 `POST` 提交动作
3. 前端记录 `unhandled_rejection`，错误为 `AbortError`

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | 同一个 `fetcher` 在短时间内被重复 `submit`，后一个提交中断前一个请求 | High | Low | Pending |
| B | 组件卸载、路由切换或状态切换时主动中止了进行中的请求，但调用方未吞掉 `AbortError` | High | Med | Pending |
| C | 页面上某个 `useEffect` / 事件处理器会在依赖变化时重复触发提交，形成竞争 | Med | Med | Pending |
| D | Polaris / Remix 封装的提交链路本身会在请求替换时抛出 `AbortError`，而业务层没有判定这是可忽略异常 | Med | Med | Pending |
| E | 服务端慢响应导致前端超时或取消，但错误上报把“预期取消”误当成异常 | Low | Med | Pending |

## Log Evidence
- `app/routes/app.pricing/route.tsx` 在页面挂载时立即调用 `fetcher.submit(..., { method: "POST", action: "/log" })`
- `app/routes/app.pricing/route.tsx` 还存在 `planCancelFetcher.submit`、`payFetcher.submit`、`payForPlanFetcher.submit` 三条提交链路
- `app/root.tsx` 的 `handleUnhandledRejection` 会无条件把 `event.reason` 上报为 `unhandled_rejection`
- 当前代码库没有针对 `AbortError` / 请求取消的全局过滤逻辑

## Verification Conclusion
- 静态分析结果更支持“前端请求取消被误报”为异常，而不是 `/app/pricing` action 真实崩溃
- 最可疑点是 `/app/pricing` 页面挂载时的 `/log` 提交，以及支付/取消操作触发后的请求替换或页面跳转

## Applied Mitigation
- 已在 `app/root.tsx` 的 `unhandledrejection` 采集中忽略 `AbortError` / aborted 类异常，避免把请求取消继续记为前端 error
- 已将 `/app/pricing` 页面的曝光日志从 `fetcher.submit("/log")` 切到 `reportClientLog(..., { beacon: true })`，减少路由层 submit 被取消后继续产生日志噪音
