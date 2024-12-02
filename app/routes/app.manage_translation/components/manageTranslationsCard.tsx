import { useNavigate } from "@remix-run/react";
import { Card, Space, Button, Typography, Table, Modal, Result } from "antd";
import { useState } from "react";

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
  const [isModalVisible, setIsModalVisible] = useState(false);
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
          record.allTranslatedItems === undefined ||
          (record.allItems === 0 && record.allTranslatedItems === 0) ? (
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
              if (record.allItems) {
                navigate(
                  `/app/manage_translation/${record.navigation}?language=${current}`,
                );
              } else {
                setIsModalVisible(true)
              }
            }}
          >
            Edit
          </Button>
        );
      },
    },
  ];

  const handleCancel = () => {
    setIsModalVisible(false);
  };

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
      <Modal open={isModalVisible} footer={null} onCancel={handleCancel}>
        <Result
          title="No items found here"
          extra={
            <Button type="primary" onClick={handleCancel}>
              Ok
            </Button>
          }
        />
      </Modal>
    </div>
  );
};

export default ManageTranslationsCard;
