import { useNavigate } from "@remix-run/react";
import { Space, Button, Typography, Table } from "antd";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
import AppSectionCard from "~/ui/components/AppSectionCard";
const { Text } = Typography;

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
    (record: any, currentLocale: string) => {
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
    [dataSource, currentLocale],
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
            <Button type="default" onClick={() => handleEdit(record, currentLocale)}>
              {t("Edit")}
            </Button>
          );
        },
      },
    ],
    [dataSource, currentLocale],
  );
  return (
    <AppSectionCard title={cardTitle} bodyPadding="12px 16px">
      <Space direction="vertical" size="small" style={{ display: "flex" }}>
        <Table className="manage-section-table" columns={columns} dataSource={dataSource} pagination={false} />
      </Space>
    </AppSectionCard>
  );
};

export default ManageTranslationsCard;
