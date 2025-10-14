import { Divider, Modal } from "antd";
import React, { useCallback } from "react";
import ProgressBlock from "./progressBlock";
import { FetcherWithComponents } from "@remix-run/react";
import { useTranslation } from "react-i18next";

interface ProgressingModalProps {
  open: boolean;
  onCancel: () => void;
  dataSource: any[];
  isMobile: boolean;
  source: string;
  stopTranslateFetcher: FetcherWithComponents<any>;
}

const ProgressingModal: React.FC<ProgressingModalProps> = ({
  open,
  onCancel,
  dataSource = [],
  isMobile,
  source,
  stopTranslateFetcher,
}) => {
  const { t } = useTranslation();

  const moreItems = useCallback(() => {
    const dom = dataSource?.map((item: any, index: number) => {
      if (index) {
        return (
          <React.Fragment key={item?.target}>
            <Divider />
            <ProgressBlock
              key={item?.target}
              isMobile={isMobile}
              source={source}
              target={item?.target}
              status={item?.status}
              translateStatus={item?.translateStatus}
              progressData={item?.progressData}
              value={item?.value}
              module={item?.module}
              stopTranslateFetcher={stopTranslateFetcher}
            />
            <Divider />
            <ProgressBlock
              key={item?.target}
              isMobile={isMobile}
              source={source}
              target={item?.target}
              status={item?.status}
              translateStatus={item?.translateStatus}
              progressData={item?.progressData}
              value={item?.value}
              module={item?.module}
              stopTranslateFetcher={stopTranslateFetcher}
            />
            <Divider />
            <ProgressBlock
              key={item?.target}
              isMobile={isMobile}
              source={source}
              target={item?.target}
              status={item?.status}
              translateStatus={item?.translateStatus}
              progressData={item?.progressData}
              value={item?.value}
              module={item?.module}
              stopTranslateFetcher={stopTranslateFetcher}
            />
          </React.Fragment>
        );
      } else {
        return (
          <ProgressBlock
            key={item?.target}
            isMobile={isMobile}
            source={source}
            target={item?.target}
            status={item?.status}
            translateStatus={item?.translateStatus}
            progressData={item?.progressData}
            value={item?.value}
            module={item?.module}
            stopTranslateFetcher={stopTranslateFetcher}
          />
        );
      }
    });

    return dom;
  }, [dataSource, isMobile, source]);

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
      {moreItems()}
    </Modal>
  );
};

export default ProgressingModal;
