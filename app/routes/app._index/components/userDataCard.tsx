import { Card, Col, Row, Statistic } from "antd";

interface UserProfileCardProps {
  visitorData: number;
  gmvData: number;
}

const UserDataCard: React.FC<UserProfileCardProps> = ({ visitorData, gmvData }) => {
  const conversionRate = ((gmvData / visitorData) * 100).toFixed(2); // 计算转化率

  return (
    <Card title="Data Overview">
      <Row gutter={12}>
        <Col span={8} style={{ borderLeft: "1px solid #e8e8e8" }}>
          <Statistic title="Visitor Data" value={visitorData} />
        </Col>
        <Col span={8} style={{ borderLeft: "1px solid #e8e8e8" }}>
          <Statistic title="GMV Data" value={gmvData} />
        </Col>
        <Col span={8} style={{ borderLeft: "1px solid #e8e8e8" }}>
          <Statistic title="Conversion Rate" value={`${conversionRate}%`} />
        </Col>
      </Row>
    </Card>
  );
};

export default UserDataCard;
