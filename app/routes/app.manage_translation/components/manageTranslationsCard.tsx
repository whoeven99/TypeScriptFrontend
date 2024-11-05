// import { Link } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { Card, Space, Button, Typography, Table } from "antd";

const { Title } = Typography;

interface SwitcherSettingCardProps {
  cardTitle: string;
  dataSource: any;
  current: string;
}

interface DataType {
  key: string;
  title: string;
  allTranslatedItems: number;
  allItems: number;
  sync_status: boolean;
  navigation: string;
}

const ManageTranslationsCard: React.FC<SwitcherSettingCardProps> = ({
  cardTitle,
  dataSource,
  current,
}) => {
  const navigate = useNavigate();
  const columns = [
    {
      title: cardTitle,
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Items Translated",
      dataIndex: "items",
      key: "items",
      render: (_: any, record: any) => {
        return record.allItems ? (
          <div>
            {record.allTranslatedItems}/{record.allItems}
          </div>
        ) : (
          <div>--</div>
        );
      },
    },
    {
      title: "Item Sync Status",
      dataIndex: "sync_status",
      key: "sync_status",
      render: (_: any, record: any) => {
        return record.sync_status ? (
          <div>Real-time Sync</div>
        ) : (
          <div>Manual Sync</div>
        );
      },
    },
    {
      title: "Operation",
      dataIndex: "operation",
      key: "operation",
      render: (_: any, record: DataType) => {
        return record.sync_status ? (
          <Space>
            <Button
              onClick={() =>
                navigate(`/app/manage_translation/${record.navigation}?language=${current}`)
              }
            >
              Edit
            </Button>
          </Space>
        ) : (
          <Space>
            <Button>Sync</Button>
            <Button
              onClick={() =>
                navigate(`/app/manage_translation/${record.navigation}?language=${current}`)
              }
            >
              Edit
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="small" style={{ display: "flex" }}>
          <Title style={{ fontSize: "1.25rem", display: "inline" }}>
            {cardTitle}
          </Title>
          <Table columns={columns} dataSource={dataSource} pagination={false} />
        </Space>
      </Card>
    </div>
  );
};

export default ManageTranslationsCard;
