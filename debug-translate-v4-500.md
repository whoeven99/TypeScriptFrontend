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
| B | `v4` 页面 SSR 依赖的数据结构在部分店铺下缺字段，渲染时抛错 | High | Med | Pending |
| C | `translate-v4` 相关 API 返回非预期数据，页面首屏请求链路二次失败 | Med | Med | Pending |
| D | 认证、店铺同步或 coverage 读取在生产环境偶发失败 | Med | Med | Pending |

## Log Evidence
- 已为 `app.translate-v4` 页面 loader 添加入口、语言加载、目标语言同步、并发数据源与未处理异常埋点。
- 已为 `api.translate-v4.quota` 添加入口、成功与异常埋点。
- 待复现一次生产环境 500 后收集对应日志。

## Verification Conclusion
[Pending]
