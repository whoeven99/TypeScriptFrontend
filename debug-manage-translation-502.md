# Debug Session: manage-translation-502
- **Status**: [OPEN]
- **Issue**: `/app/manage_translation` 页面触发 `root_error_boundary`，错误内容为上游返回的 `502` HTML 页面
- **Debug Server**: N/A
- **Log File**: N/A

## Reproduction Steps
1. 打开 `/app/manage_translation`
2. 页面在加载或交互期间出现根错误边界
3. 前端日志记录 `root_error_boundary`，错误 message 为完整 HTML 错误页

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Render / 上游网关在页面请求期间返回了 `502` HTML，前端把 HTML 文本包装成 `Error` | High | Low | Pending |
| B | `/app/manage_translation` 页面初始化时的多路 fetcher 请求让单实例短时过载，诱发上游 `502` | High | Med | Pending |
| C | App shell 的 `/api/app-bootstrap` 并行请求失败，间接导致页面整体落入错误边界 | Med | Med | Pending |
| D | Shopify App Bridge 的文档/loader 请求失败后把错误体透传成 `Error(message=<html>)` | Med | Med | Pending |
| E | 某个业务 action 主动 `throw` 了 HTML 文本错误 | Low | Med | Pending |

## Log Evidence
- `app/root.tsx` 中 `root_error_boundary` 会把任意 `Error` 直接上报；当前日志里的 `error.message` 是完整的 `502` HTML 页面
- `context.isRouteErrorResponse === false`，说明这不是 Remix `throw new Response(..., { status })` 这种显式路由错误
- `context.isNetworkFetchError === false`，说明也不是当前代码显式识别的 `TypeError: Failed to fetch`
- `app/routes/app.manage_translation/route.tsx` 页面初始化时会同时发起 `/log`、`appInstalls`，随后针对 15 个 resourceType 分批 `fetcher.submit`
- `app/lib/routeShouldRevalidate.ts` 已有注释明确提到：统计 fetcher 并发时服务端繁忙，容易触发整页 ErrorBoundary
- `app/routes/app.manage_translation/route.tsx` 的 action 对 `itemsCount` 等业务异常基本都 `catch` 并返回 `{ success: false }`，不太像业务代码主动把页面打进根边界

## Verification Conclusion
- 目前更支持“上游 / 网关级 502”而不是“manage_translation action 代码抛未捕获异常”
- 根因高度怀疑与 `manage_translation` 页面对统计接口的初始化压力有关，尤其是进入页面后会持续触发多路 `itemsCount` 请求

## Applied Mitigation
- 已在 `app/root.tsx` 中增加 HTML 错误页状态码识别，后续若再次拿到 Render `502` 页面，不再统一误标为 `500`
- 已将 `app/routes/app.manage_translation/route.tsx` 的 `ITEMS_COUNT_SUBMIT_GAP_MS` 从 `400` 调整为 `800`，先做保守降压
- 已将 `manage_translation` 页面内纯埋点类 `/log` 请求改为 `reportClientLog(..., { beacon: true })`，减少首屏与跳转时对 fetcher/action 通道的占用
