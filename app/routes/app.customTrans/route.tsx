import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Modal,
  Pagination,
  Popconfirm,
  Popover,
  Skeleton,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  DeleteGlossaryInfo,
  GetGlossaryByShopNameLoading,
  InsertGlossaryInfo,
  UpdateTargetTextById,
} from "~/api/JavaServer";
import { useDispatch, useSelector } from "react-redux";
import {
  setGLossaryStatusLoadingState,
  setGLossaryTableData,
} from "~/store/modules/glossaryTableData";
import { ShopLocalesType } from "../app.language/route";
// import UpdateGlossaryModal from "./components/updateGlossaryModal";
import { InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import defaultStyles from "../styles/defaultStyles.module.css";
import styles from "../app.language/styles.module.css";
import useReport from "scripts/eventReport";
import { globalStore } from "~/globalStore";
const { Title, Text } = Typography;

export interface GLossaryDataType {
  key: number;
  sourceText: string;
  targetText: string;
  language: string;
  rangeCode: string;
  type: number;
  status: number;
  loading: boolean;
  createdDate: string;
}

export const planMapping = {
  Free: 0,
  Basic: 10,
  Pro: 50,
  Premium: 100,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);

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
  const dataSource = useSelector((state: any) => state.glossaryTableData.rows);

  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(mobile);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [shopLocales, setShopLocales] = useState<ShopLocalesType[]>([]);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] =
    useState<boolean>(false);
  const [glossaryModalId, setGlossaryModalId] = useState<number>(-1);
  const [showWarnModal, setShowWarnModal] = useState<boolean>(false);
  const hasSelected = useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // 每页显示5条，可自定义
  const pagedData = useMemo(
    () =>
      dataSource.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [dataSource, currentPage, pageSize],
  );
  const currentPageKeys = useMemo(
    () => pagedData.map((item: any) => item.key),
    [pagedData],
  );
  const allCurrentPageSelected = useMemo(
    () => currentPageKeys.every((key: any) => selectedRowKeys.includes(key)),
    [currentPageKeys, selectedRowKeys],
  );
  const someCurrentPageSelected = useMemo(
    () => currentPageKeys.some((key: any) => selectedRowKeys.includes(key)),
    [currentPageKeys, selectedRowKeys],
  );

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

  const handleApplication = async (key: number) => {
    const row = dataSource.find((item: any) => item.key === key);
    if (row.status === 0) {
      const activeItemsCount = dataSource.filter(
        (item: any) => item.status === 1,
      ).length;
      if (
        activeItemsCount >= planMapping[plan?.type as keyof typeof planMapping]
      ) {
        setShowWarnModal(true);
        return;
      }
    }

    dispatch(setGLossaryStatusLoadingState({ key, loading: true }));

    const updateInfo = {
      ...row,
      type: row.type ? 1 : 0,
      status: row.status === 0 ? 1 : 0,
    };

    const data = await UpdateTargetTextById({
      shop: globalStore?.shop || "",
      data: updateInfo,
      server: server as string,
    });

    if (data?.success) {
      shopify.toast.show(t("Saved successfully"));
      dispatch(
        setGLossaryStatusLoadingState({
          key: data.response.id,
          loading: false,
          status: data.response.status,
        }),
      );
    } else {
      shopify.toast.show(data?.errorMsg);
      dispatch(
        setGLossaryStatusLoadingState({
          key: data.response.id,
          loading: false,
        }),
      );
    }
  };

  const columns = [
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      width: "10%",
      render: (_: any, record: any) => (
        <Switch
          checked={record?.status}
          onClick={() => handleApplication(record.key)}
          loading={record.loading} // 使用每个项的 loading 状态
        />
      ),
    },
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
      render: (_: any, record: any) => {
        return record.language ? (
          <Text>{record.language}</Text>
        ) : (
          <Popover
            content={t("This language has been deleted. Please edit again.")}
          >
            <WarningOutlined
              style={{ color: "#F8B400", fontSize: "18px", width: "100%" }}
            />
          </Popover>
        );
      },
    },
    {
      title: t("Case"),
      dataIndex: "type",
      key: "type",
      width: "15%",
      render: (_: any, record: any) => {
        return record.type ? (
          <Text>{t("Case-sensitive")}</Text>
        ) : (
          <Text>{t("Case-insensitive")}</Text>
        );
      },
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
        <Text>
          {t("Create translation rules for certain words and phrases")}
        </Text>
        {!shopLocales?.length && !loading ? (
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
              {planMapping[plan?.type as keyof typeof planMapping] === 0 ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Popconfirm
                    title=""
                    description={t(
                      "Upgrade to a paid plan to unlock this feature",
                    )}
                    trigger="hover"
                    showCancel={false}
                    okText={t("Upgrade")}
                    onConfirm={() => navigate("/app/pricing")}
                  >
                    <InfoCircleOutlined />
                  </Popconfirm>
                  <Button
                    className={defaultStyles.Button_disable}
                    onClick={() => setShowWarnModal(true)}
                  >
                    {t("Create rule")}
                  </Button>
                </div>
              ) : loading ? (
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
              <>
                <Card
                  title={
                    <Checkbox
                      checked={allCurrentPageSelected && !loading}
                      indeterminate={
                        someCurrentPageSelected && !allCurrentPageSelected
                      }
                      onChange={(e) =>
                        setSelectedRowKeys(
                          e.target.checked
                            ? [
                                ...currentPageKeys,
                                ...selectedRowKeys.filter(
                                  (key) => !currentPageKeys.includes(key),
                                ),
                              ]
                            : [
                                ...selectedRowKeys.filter(
                                  (key) => !currentPageKeys.includes(key),
                                ),
                              ],
                        )
                      }
                    >
                      {t("Glossary")}
                    </Checkbox>
                  }
                  loading={loading}
                >
                  {pagedData.map((item: any) => (
                    <Card.Grid key={item.key} style={{ width: "100%" }}>
                      <Space
                        direction="vertical"
                        size="middle"
                        style={{ width: "100%" }}
                      >
                        <Flex justify="space-between">
                          <Checkbox
                            checked={selectedRowKeys.includes(item.key)}
                            onChange={(e: any) => {
                              setSelectedRowKeys(
                                e.target.checked
                                  ? [...selectedRowKeys, item.key]
                                  : selectedRowKeys.filter(
                                      (key) => key !== item.key,
                                    ),
                              );
                            }}
                          >
                            {t("Text")}{" "}
                          </Checkbox>
                          <Text>{item.sourceText}</Text>
                        </Flex>
                        <Flex justify="space-between">
                          <Text>{t("Translation text")}</Text>
                          <Text>{item.targetText}</Text>
                        </Flex>
                        <Flex justify="space-between">
                          <Text>{t("Apply for")}</Text>
                          {item.language ? (
                            <Text>{item.language}</Text>
                          ) : (
                            <Popover
                              content={t(
                                "This language has been deleted. Please edit again.",
                              )}
                            >
                              <WarningOutlined
                                style={{
                                  color: "#F8B400",
                                  fontSize: "18px",
                                  width: "100%",
                                }}
                              />
                            </Popover>
                          )}
                        </Flex>
                        <Flex justify="space-between">
                          <Text>{t("Case")}</Text>
                          {item.type ? (
                            <Text>{t("Case-sensitive")}</Text>
                          ) : (
                            <Text>{t("Case-insensitive")}</Text>
                          )}
                        </Flex>
                        <Flex justify="space-between">
                          <Text>{t("Status")}</Text>
                          <Switch
                            checked={item?.status}
                            onClick={() => handleApplication(item.key)}
                            loading={item.loading} // 使用每个项的 loading 状态
                          />
                        </Flex>
                        <Button
                          style={{ width: "100%" }}
                          //   onClick={() =>
                          //     handleIsModalOpen(t("Edit rules"), item.key)
                          //   }
                        >
                          {t("Edit")}
                        </Button>
                      </Space>
                    </Card.Grid>
                  ))}
                </Card>
                <div
                  style={{
                    display: "flex",
                    background: "#fff",
                    padding: "12px 0",
                    textAlign: "center",
                    justifyContent: "center",
                  }}
                >
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={dataSource.length}
                    onChange={(page) => setCurrentPage(page)}
                  />
                </div>
              </>
            ) : (
              <Table
                rowSelection={rowSelection}
                columns={columns}
                loading={loading}
                dataSource={dataSource}
              />
            )}
          </div>
        )}
      </Space>
      {/* <UpdateGlossaryModal
        id={glossaryModalId}
        title={title}
        isVisible={isGlossaryModalOpen}
        setIsModalOpen={setIsGlossaryModalOpen}
        shopLocales={shopLocales}
        shop={shop}
        server={server as string}
      /> */}
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
