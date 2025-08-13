import { CollapseProps } from "antd";
import { Typography } from "antd";
import React from "react";

const { Text } = Typography;

export const collapseData: CollapseProps["items"] = [
  {
    key: 0,
    label: "This is panel header 1",
    children: <Text>1111</Text>,
  },
  {
    key: 1,
    label: "This is panel header 2",
    children: <Text>2222</Text>,
  },
  {
    key: 2,
    label: "This is panel header 3",
    children: <Text>3333</Text>,
  },
];
