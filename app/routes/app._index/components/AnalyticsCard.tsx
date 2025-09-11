import React from "react";
import {
  Card,
  Button,
  Statistic,
  Row,
  Col,
  Progress,
  Flex,
  Typography,
} from "antd";
import { useNavigate } from "@remix-run/react";
const { Text } = Typography;
const AnalyticsCard = ({ analyticsData }: any) => {
  const Navigate = useNavigate();
  
  return (
    <Card
      title="My assets & analytics"
      extra={<span>Basic Plan</span>}
      style={{ width: "100%" }}
    >
      <Row gutter={16}>
        <Col span={8}>
          <Flex vertical justify="center" align="center" gap="small">
            <Text>Translation Score</Text>
            <Progress
              type="circle"
              percent={88}
              format={(percent) => `${percent} Score`}
            />
            <Button
              type="default"
              onClick={() =>
                Navigate("/app/translateReport", {
                  state: {
                    analyticsData,
                  },
                })
              }
            >
              Improve
            </Button>
          </Flex>
        </Col>
        <Col
          span={8}
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "center",
          }}
        >
          <Flex vertical align="center" justify="center" gap="middle">
            <Text>Untranslated</Text>
            <Flex
              align="center"
              justify="center"
              gap="small"
              style={{ height: "100%" }}
            >
              <Statistic value={147859} valueStyle={{ fontWeight: 500 }} />
              <Text>words</Text>
            </Flex>
            <Button type="default" onClick={() => Navigate("/app/language")}>
              Translate
            </Button>
          </Flex>
        </Col>
        <Col
          span={8}
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "center",
          }}
        >
          <Flex vertical align="center" justify="center" gap="small">
            <Text>CRO analytics</Text>
            <Flex
              vertical
              align="center"
              justify="center"
              gap="small"
              style={{ height: "100%" }}
            >
              <Statistic value={"+13.54%"} valueStyle={{ fontWeight: 500 }} />
              <Text>Compared to 7 days ago</Text>
            </Flex>
            <Button
              type="default"
              onClick={() => Navigate("/app/translateReport")}
            >
              Details
            </Button>
          </Flex>
        </Col>
      </Row>
    </Card>
  );
};

export default AnalyticsCard;
