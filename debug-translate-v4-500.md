# Debug Session: translate-v4-500
- **Status**: [OPEN]
- **Issue**: `v4` 页面与相关接口在生产环境出现 500，需要定位真实失败来源。
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-translate-v4-500.ndjson

## Reproduction Steps
1. 打开 Shopify Admin 中的 `app/translate-v4` 页面。
2. 观察页面首屏请求与相关 `translate-v4` 接口是否返回 500。
3. 记录首个失败请求的接口、状态码、返回体与服务端日志。

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | `loader` 并发数据源之一抛错并冒泡，导致 SSR 500 | High | Med | Pending |
| B | `v4` 页面 SSR 依赖的数据结构在部分店铺下缺字段，渲染时抛错 | High | Med | Likely |
| C | `translate-v4` 相关 API 返回非预期数据，页面首屏请求链路二次失败 | Med | Med | Pending |
| D | 认证、店铺同步或 coverage 读取在生产环境偶发失败 | Med | Med | Pending |

## Log Evidence
- 已为 `app.translate-v4` 页面 loader 添加入口、语言加载、目标语言同步、并发数据源与未处理异常埋点。
- 已为 `api.translate-v4.quota` 添加入口、成功与异常埋点。
- 已为 `listV4JobSummaries()` 添加任务文档形状埋点，重点记录 `metrics/modules/createdAt/updatedAt` 是否缺失。
- 静态检查发现 `mergeV4JobMetrics()` 直接访问 `job.metrics[key]`；若生产环境存在旧任务文档缺失 `metrics`，会在 SSR 中直接抛错。
- 本地最小复现已验证：执行与 `mergeV4JobMetrics()` 等价的 `Number(job.metrics[key])`，当 `job.metrics` 缺失时会抛出 `TypeError: Cannot read properties of undefined`。
- `.dbg/translate-v4-500.env` 指向 `127.0.0.1:7778`，但当前埋点代码写死 `127.0.0.1:7777`；因此这轮线上 500 未打到本地 debug server，日志仍为空。
- 已对 `mergeV4JobMetrics()` 加入 `EMPTY_V4_METRICS` 兜底，避免旧任务文档缺失 `metrics` 时把整个 loader 打成 500。

## Verification Conclusion
- Hypothesis A: `listV4JobSummaries()` 抛错导致 loader 500，现已被强化为 **Likely**。
- Hypothesis B: 旧任务文档缺失 `metrics` 导致 `mergeV4JobMetrics()` 读取时报错，现有静态链路 + 本地复现均支持，状态为 **Likely**，待线上验证。
- 待用户重新验证 `app/translate-v4` 是否恢复；若仍有 500，再继续沿埋点端口不一致与其他数据字段缺失排查。
