import { Card, Divider, Modal, Space } from "antd";
import React, { useCallback } from "react";
import ProgressBlock from "./progressBlock";
import { useTranslation } from "react-i18next";

interface ProgressingModalProps {
  open: boolean;
  onCancel: () => void;
  dataSource: any[];
  isMobile: boolean;
  updateProgressDataSourceStatus: (taskId: number, status: number) => void;
}

const ProgressingModal: React.FC<ProgressingModalProps> = ({
  open,
  onCancel,
  dataSource = [],
  isMobile,
  updateProgressDataSourceStatus,
}) => {
  const { t } = useTranslation();

  const moreItems = useCallback(() => {
    const dom = dataSource?.map((item: any, index: number) => {
      return (
        <Card key={item?.target}>
          <ProgressBlock
            taskId={item?.taskId}
            key={item?.target}
            isMobile={isMobile}
            target={item?.target}
            status={item?.status}
            translateStatus={item?.translateStatus}
            initialCount={item?.initialCount}
            progressData={item?.progressData}
            value={item?.value}
            module={item?.module}
            updateProgressDataSourceStatus={updateProgressDataSourceStatus}
          />
        </Card>
      );
    });

    return dom;
  }, [dataSource, isMobile]);

  return (
    <Modal
      title={t("progressing.title")}
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={"100%"}
      style={{ maxWidth: "900px" }}
    >
      <div
        style={{
          height: "70vh", // 限制高度为视口的 70%
          overflowY: "auto", // 超出垂直滚动
          paddingRight: "8px", // 留一点空位避免滚动条压文字
        }}
      >
        <Space direction="vertical" size={"large"} style={{ width: "100%" }}>
          {moreItems()}
        </Space>
      </div>
    </Modal>
  );
};

export default ProgressingModal;
