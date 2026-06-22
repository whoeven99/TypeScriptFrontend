/**
 * remix-serve 在加载应用后会调用 installGlobals()，用 @remix-run/web-fetch 覆盖 global.fetch。
 * @libsql/client 在首次查询时创建 HTTP 客户端并读取当时的 global.fetch，导致 Turso 请求报 Invalid URL。
 * 在模块加载时捕获原生 fetch，并把 libsql 传入的 Request 对象转成 URL 字符串再请求。
 */
export function createLibsqlFetch(baseFetch: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) {
      return baseFetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        duplex: "half",
      } as RequestInit);
    }
    return baseFetch(input, init);
  };
}

/** 应用启动最早阶段捕获，早于 remix-serve 的 installGlobals()。 */
export const libsqlFetch = createLibsqlFetch();
