import { useNavigate } from "@remix-run/react";
import { Card, Space, Button, Typography, Table, Modal, Result } from "antd";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  const columns = [
    {
      title: cardTitle,
      dataIndex: "title",
      key: "title",
      width: "30%",
    },
    {
      title: t("Items Translated"),
      dataIndex: "items",
      key: "items",
      width: "30%",
      render: (_: any, record: any) => {
        return record.allItems === undefined ||
          record.allTranslatedItems === undefined ? (
          <div>{t("Syncing")}</div>
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
      title: t("Action"),
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
            {t("Edit")}
          </Button>
        );
      },
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="small" style={{ display: "flex" }}>
        <Title style={{ fontSize: "1.5rem", display: "inline" }}>
          {cardTitle}
        </Title>
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
        />
      </Space>
    </Card>
  );
};

export default ManageTranslationsCard;
