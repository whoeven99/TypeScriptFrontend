import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { LoaderFunctionArgs } from "@remix-run/node";
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Modal,
  Pagination,
  Popover,
  Skeleton,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { WarningOutlined } from "@ant-design/icons";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import styles from "../app.language/styles.module.css";
import { LanguagesDataType } from "../app.language/route";
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const isMobile = request.headers.get("user-agent")?.includes("Mobile");

  return {
    server: process.env.SERVER_URL,
    mobile: isMobile as boolean,
  };
};

const Index = () => {
  const { server, mobile } = useLoaderData<typeof loader>();

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { plan } = useSelector((state: any) => state.userConfig);

  //获取应用语言数据
  const languageTableData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(mobile);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [showWarnModal, setShowWarnModal] = useState<boolean>(false);
  const hasSelected = useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);
  const [currentPage, setCurrentPage] = useState(1);
  // const pageSize = 10; // 每页显示5条，可自定义
  // const pagedData = useMemo(
  //   () =>
  //     dataSource.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  //   [dataSource, currentPage, pageSize],
  // );
  // const currentPageKeys = useMemo(
  //   () => pagedData.map((item: any) => item.key),
  //   [pagedData],
  // );
  // const allCurrentPageSelected = useMemo(
  //   () => currentPageKeys.every((key: any) => selectedRowKeys.includes(key)),
  //   [currentPageKeys, selectedRowKeys],
  // );
  // const someCurrentPageSelected = useMemo(
  //   () => currentPageKeys.some((key: any) => selectedRowKeys.includes(key)),
  //   [currentPageKeys, selectedRowKeys],
  // );

  const fetcher = useFetcher<any>();

  useEffect(() => {
    // fetcher.submit(
    //   {
    //     log: `${shop} 目前在术语表页面`,
    //   },
    //   {
    //     method: "POST",
    //     action: "/log",
    //   },
    // );
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleDelete = () => {};

  const columns = [
    // {
    //   title: t("Status"),
    //   dataIndex: "status",
    //   key: "status",
    //   width: "10%",
    //   render: (_: any, record: any) => (
    //     <Switch
    //       checked={record?.status}
    //       loading={record.loading} // 使用每个项的 loading 状态
    //     />
    //   ),
    // },
    {
      title: t("Text"),
      dataIndex: "sourceText",
      key: "sourceText",
      width: "20%",
    },
    {
      title: t("Translation text"),
      dataIndex: "targetText",
      key: "targetText",
      width: "20%",
    },
    {
      title: t("Apply for"),
      dataIndex: "language",
      key: "language",
      width: "20%",
    },
    {
      title: t("Action"),
      dataIndex: "action",
      key: "action",
      width: "15%",
      render: (_: any, record: any) => (
        <Button
        // onClick={() => handleIsModalOpen(t("Edit rules"), record.key)}
        >
          {t("Edit")}
        </Button>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (e: any) => setSelectedRowKeys(e),
  };

  return (
    <Page>
      <TitleBar title={t("Glossary")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <Title style={{ fontSize: "1.25rem", display: "inline" }}>
          {t("Glossary")}
        </Title>
        {!languageTableData.length && !loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "90vh",
            }}
          >
            <NoLanguageSetCard />
          </div>
        ) : (
          <div className={styles.languageTable_action}>
            <Flex
              align="center"
              justify="space-between" // 使按钮左右分布
              style={{ width: "100%", marginBottom: "16px" }}
            >
              <Flex align="center" gap="middle">
                {loading ? (
                  <Skeleton.Button active />
                ) : (
                  <Button onClick={handleDelete} disabled={!hasSelected}>
                    {t("Delete")}
                  </Button>
                )}
                {hasSelected
                  ? `${t("Selected")}${selectedRowKeys.length}${t("items")}`
                  : null}
              </Flex>
              {loading ? (
                <Skeleton.Button active />
              ) : (
                <Button
                  type="primary"
                  //   onClick={() => handleIsModalOpen("Create rule", -1)}
                >
                  {t("Create rule")}
                </Button>
              )}
            </Flex>
            {isMobile ? (
              // <>
              //   <Card
              //     title={
              //       <Checkbox
              //         checked={allCurrentPageSelected && !loading}
              //         indeterminate={
              //           someCurrentPageSelected && !allCurrentPageSelected
              //         }
              //         onChange={(e) =>
              //           setSelectedRowKeys(
              //             e.target.checked
              //               ? [
              //                   ...currentPageKeys,
              //                   ...selectedRowKeys.filter(
              //                     (key) => !currentPageKeys.includes(key),
              //                   ),
              //                 ]
              //               : [
              //                   ...selectedRowKeys.filter(
              //                     (key) => !currentPageKeys.includes(key),
              //                   ),
              //                 ],
              //           )
              //         }
              //       >
              //         {t("Glossary")}
              //       </Checkbox>
              //     }
              //     loading={loading}
              //   >
              //     {pagedData.map((item: any) => (
              //       <Card.Grid key={item.key} style={{ width: "100%" }}>
              //         <Space
              //           direction="vertical"
              //           size="middle"
              //           style={{ width: "100%" }}
              //         >
              //           <Flex justify="space-between">
              //             <Checkbox
              //               checked={selectedRowKeys.includes(item.key)}
              //               onChange={(e: any) => {
              //                 setSelectedRowKeys(
              //                   e.target.checked
              //                     ? [...selectedRowKeys, item.key]
              //                     : selectedRowKeys.filter(
              //                         (key) => key !== item.key,
              //                       ),
              //                 );
              //               }}
              //             >
              //               {t("Text")}{" "}
              //             </Checkbox>
              //             <Text>{item.sourceText}</Text>
              //           </Flex>
              //           <Flex justify="space-between">
              //             <Text>{t("Translation text")}</Text>
              //             <Text>{item.targetText}</Text>
              //           </Flex>
              //           <Flex justify="space-between">
              //             <Text>{t("Apply for")}</Text>
              //             {item.language ? (
              //               <Text>{item.language}</Text>
              //             ) : (
              //               <Popover
              //                 content={t(
              //                   "This language has been deleted. Please edit again.",
              //                 )}
              //               >
              //                 <WarningOutlined
              //                   style={{
              //                     color: "#F8B400",
              //                     fontSize: "18px",
              //                     width: "100%",
              //                   }}
              //                 />
              //               </Popover>
              //             )}
              //           </Flex>
              //           <Flex justify="space-between">
              //             <Text>{t("Case")}</Text>
              //             {item.type ? (
              //               <Text>{t("Case-sensitive")}</Text>
              //             ) : (
              //               <Text>{t("Case-insensitive")}</Text>
              //             )}
              //           </Flex>
              //           <Flex justify="space-between">
              //             <Text>{t("Status")}</Text>
              //             <Switch
              //               checked={item?.statu}
              //               loading={item.loading}
              //             />
              //           </Flex>
              //           <Button
              //             style={{ width: "100%" }}
              //             //   onClick={() =>
              //             //     handleIsModalOpen(t("Edit rules"), item.key)
              //             //   }
              //           >
              //             {t("Edit")}
              //           </Button>
              //         </Space>
              //       </Card.Grid>
              //     ))}
              //   </Card>
              //   <div
              //     style={{
              //       display: "flex",
              //       background: "#fff",
              //       padding: "12px 0",
              //       textAlign: "center",
              //       justifyContent: "center",
              //     }}
              //   >
              //     <Pagination
              //       current={currentPage}
              //       pageSize={pageSize}
              //       total={dataSource.length}
              //       onChange={(page) => setCurrentPage(page)}
              //     />
              //   </div>
              // </>
              <></>
            ) : (
              <Table
                rowSelection={rowSelection}
                columns={columns}
                loading={loading}
                // dataSource={dataSource}
              />
            )}
          </div>
        )}
      </Space>
      <Modal
        title={t("Feature Unavailable")}
        open={showWarnModal}
        onCancel={() => setShowWarnModal(false)}
        centered
        width={700}
        footer={
          <Button type="primary" onClick={() => navigate("/app/pricing")}>
            {t("Upgrade")}
          </Button>
        }
      >
        <Text>{t("This feature is available only with the paid plan.")}</Text>
      </Modal>
    </Page>
  );
};

export default Index;
