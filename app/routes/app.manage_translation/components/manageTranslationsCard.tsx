import { useNavigate } from "@remix-run/react";
import { Card, Space, Button, Typography, Table, Modal, Result } from "antd";

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
      width: "30%",
    },
    {
      title: "Items Translated",
      dataIndex: "items",
      key: "items",
      width: "30%",
      render: (_: any, record: any) => {
        return record.allItems === undefined ||
          record.allTranslatedItems === undefined ? (
          <div>Syncing</div>
        ) : record.allItems === 0 && record.allTranslatedItems === 0 ? (
          <div>--</div>
        ) : (
          <div>
            {record.allTranslatedItems}/{record.allItems}
          </div>
        );
      },
    },
    {
      title: "Action",
      dataIndex: "operation",
      key: "operation",
      width: "40%",
      render: (_: any, record: DataType) => {
        return (
          <Button
            onClick={() => {
              navigate(
                `/app/manage_translation/${record.navigation}?language=${current}`,
              );
            }}
          >
            Edit
          </Button>
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
