import fs from "fs";
import React from "react";
import { extractStyle } from "@ant-design/static-style-extract";
import { ConfigProvider } from "antd";

const outputPath = "/antd.min.css";

const css = extractStyle((node) => (
  <>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#007F61", // 设置主色
        },
      }}
    >
      {node}
    </ConfigProvider>
  </>
));

fs.writeFileSync(outputPath, css);
