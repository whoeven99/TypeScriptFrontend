import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server. The CLI will eventually
// stop passing in HOST, so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
  .hostname;

let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT!) || 8002,
    clientPort: 443,
  };
}

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      // See https://vitejs.dev/config/server-options.html#server-fs-allow for more information
      allow: ["app", "node_modules","scripts"],
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      // external: ["antd", "@ant-design/icons"],
      output: {
        // 把稳定的第三方库拆成独立 chunk，便于浏览器长期缓存，
        // 页面间跳转复用而非重复下载。顺序重要：先匹配具体库，
        // 再兜底 react，避免把 polaris/antd 误并进 react chunk。
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@shopify/polaris")) return "vendor-polaris";
          if (id.includes("@ant-design/icons")) return "vendor-antd-icons";
          if (/node_modules\/(antd|rc-[^/]+|@rc-component|@ant-design)\//.test(id)) {
            return "vendor-antd";
          }
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return "vendor-react";
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ["antd"],
  },
}) satisfies UserConfig;
