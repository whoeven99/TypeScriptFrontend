import { useNavigate } from "@remix-run/react";
import {
  Card,
  Space,
  Button,
  Typography,
  Table,
  Modal,
  Result,
  Skeleton,
} from "antd";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import useReport from "scripts/eventReport";
const { Title } = Typography;

interface SwitcherSettingCardProps {
  cardTitle: string;
  dataSource: any;
  currentLocale: string;
}

const ManageTranslationsCard: React.FC<SwitcherSettingCardProps> = ({
  cardTitle,
  dataSource,
  currentLocale,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { report } = useReport();

  const handleEdit = useCallback(
    (record: any) => {
      console.log(record);
      console.log(currentLocale);

      if (currentLocale)
        navigate(
          `/app/manage_translation/${record.navigation}?language=${currentLocale}`,
        );
      report(
        {
          language: currentLocale,
          online_store: record.navigation,
        },
        {
          action: "/app",
          method: "post",
          eventType: "click",
        },
        "manage_list_edit",
      );
    },
    [dataSource],
  );

  const columns = useMemo(
    () => [
      {
        title: cardTitle,
        dataIndex: "title",
        key: "title",
        width: "30%",
      },
      dataSource.some((item: any) => !item.withoutCount)
        ? {
            title: t("Items Translated"),
            dataIndex: "items",
            key: "items",
            width: "30%",
            render: (_: any, record: any) => {
              if (record.withoutCount) return null;
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
          }
        : {},
      {
        title: t("Action"),
        dataIndex: "operation",
        key: "operation",
        width: "40%",
        render: (_: any, record: any) => {
          return (
            <Button onClick={() => handleEdit(record)}>{t("Edit")}</Button>
          );
        },
      },
    ],
    [dataSource, cardTitle, t],
  );
  return (
    <Card>
      <Space direction="vertical" size="small" style={{ display: "flex" }}>
        <Title style={{ fontSize: "1.5rem", display: "inline" }}>
          {cardTitle}
        </Title>
        <Table columns={columns} dataSource={dataSource} pagination={false} />
      </Space>
    </Card>
  );
};

export default ManageTranslationsCard;
