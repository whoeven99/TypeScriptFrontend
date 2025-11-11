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
import { globalStore } from "~/globalStore";
import {
  DeleteLiquidDataByIds,
  SelectShopNameLiquidData,
} from "~/api/JavaServer";
import UpdateCustomTransModal from "./components/updateCustomTransModal";
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
  const navigate = useNavigate();

  //加载状态数组，目前loading表示页面正在加载
  const [loadingArray, setLoadingArray] = useState<string[]>(["loading"]);

  //移动端判断依据
  const [isMobile, setIsMobile] = useState<boolean>(mobile);

  //表格数据源
  const [dataSource, setDataSource] = useState<
    {
      key: number;
      sourceText: string;
      targetText: string;
      languageCode: string;
    }[]
  >([]);

  //表格多选控制key
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  //编辑表单类型及数据控制
  const [createOrEditModal, setCreateOrEditModal] = useState<{
    open: boolean;
    type: "create" | "edit";
    key: number;
  }>({
    open: false,
    type: "create",
    key: 0,
  });

  //编辑表单数据源
  const editData = useMemo(() => {
    return dataSource.find((item) => item.key == createOrEditModal.key);
  }, [dataSource, createOrEditModal.key]);

  const hasSelected = useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);

  //页面管理数据
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
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在自定义翻译页面`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    dataSourceGet();
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  //表格数据删除方法
  const handleDelete = async () => {
    const data = await DeleteLiquidDataByIds({
      shop: globalStore?.shop || "",
      server: server || "",
      ids: selectedRowKeys,
    });
    if (data.success) {
      const newData = dataSource.filter(
        (prev) => !data.response.includes(prev.key),
      );
      setDataSource(newData);
      shopify.toast.show("Delete successfully");
    }
    setSelectedRowKeys([]);
  };

  //表格列管理
  const columns = [
    {
      title: t("Text"),
      dataIndex: "sourceText",
      key: "sourceText",
      width: "25%",
    },
    {
      title: t("Translation text"),
      dataIndex: "targetText",
      key: "targetText",
      width: "30%",
    },
    {
      title: t("Apply for"),
      dataIndex: "languageCode",
      key: "languageCode",
      width: "30%",
    },
    {
      title: t("Action"),
      dataIndex: "action",
      key: "action",
      width: "15%",
      render: (_: any, record: any) => (
        <Button
          onClick={() =>
            setCreateOrEditModal({
              open: true,
              type: "edit",
              key: record.key,
            })
          }
        >
          {t("Edit")}
        </Button>
      ),
    },
  ];

  //表格行管理
  const rowSelection = {
    selectedRowKeys,
    onChange: (e: any) => setSelectedRowKeys(e),
  };

  //表格数据初始化方法
  const dataSourceGet = async () => {
    const selectShopNameLiquidData = await SelectShopNameLiquidData({
      shop: globalStore?.shop || "",
      server: server || "",
    });

    if (selectShopNameLiquidData.success) {
      let newData: {
        key: number;
        sourceText: string;
        targetText: string;
        languageCode: string;
      }[] = [];
      if (
        Array.isArray(selectShopNameLiquidData.response) &&
        selectShopNameLiquidData.response?.length
      ) {
        newData = selectShopNameLiquidData.response.map((item: any) => ({
          key: item?.id,
          sourceText: item?.liquidBeforeTranslation,
          targetText: item?.liquidAfterTranslation,
          languageCode: item?.languageCode,
        }));
      }
      setDataSource(newData);
      setLoadingArray((prev) => prev.filter((item) => item !== "loading"));
    }
  };

  //编辑表单数据更新和提交后更新表格方法
  const handleUpdateDataSource = ({
    key,
    sourceText,
    targetText,
    languageCode,
  }: {
    key?: number;
    sourceText: string;
    targetText: string;
    languageCode: string;
  }) => {
    setDataSource((prev) => {
      // 查找是否已有该项
      const index =
        key !== undefined ? prev.findIndex((item) => item.key === key) : -1;

      if (index !== -1) {
        // ✅ 更新已有项
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          sourceText,
          targetText,
          languageCode,
        };
        return updated;
      } else {
        // ✅ 新增到数组最前面
        const newItem = {
          key: key || 0,
          sourceText,
          targetText,
          languageCode,
        };
        return [newItem, ...prev];
      }
    });
  };

  const onCancel = () => {
    navigate(`/app/manage_translation`); // 跳转到 /app/manage_translation
  };

  return (
    <Page
      title={t("Custom Translation")}
      backAction={{
        onAction: onCancel,
      }}
    >
      <Space
        direction="vertical"
        size="middle"
        style={{ display: "flex", width: "100%" }}
      >
        <Flex
          align="center"
          justify="space-between" // 使按钮左右分布
          style={{ width: "100%" }}
        >
          <Flex align="center" gap="middle">
            {loadingArray.includes("loading") ? (
              <Skeleton.Button active />
            ) : (
              <Button onClick={handleDelete} disabled={!hasSelected}>
                {t("Delete")}
              </Button>
            )}
            {hasSelected
              ? `${t("Selected")} ${selectedRowKeys.length} ${t("items")}`
              : null}
          </Flex>
          {loadingArray.includes("loading") ? (
            <Skeleton.Button active />
          ) : (
            <Button
              type="primary"
              onClick={() =>
                setCreateOrEditModal({
                  open: true,
                  type: "create",
                  key: -1,
                })
              }
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
                  checked={
                    allCurrentPageSelected && !loadingArray.includes("loading")
                  }
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
                  {t("Custom Translation")}
                </Checkbox>
              }
              loading={loadingArray.includes("loading")}
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
                      <Switch checked={item?.statu} loading={item.loading} />
                    </Flex>
                    <Button
                      style={{ width: "100%" }}
                      onClick={() =>
                        setCreateOrEditModal({
                          open: true,
                          type: "edit",
                          key: item.key,
                        })
                      }
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
            loading={loadingArray.includes("loading")}
            dataSource={dataSource}
          />
        )}
      </Space>
      <UpdateCustomTransModal
        server={server || ""}
        dataSource={dataSource}
        handleUpdateDataSource={({
          key,
          sourceText,
          targetText,
          languageCode,
        }: {
          key?: number;
          sourceText: string;
          targetText: string;
          languageCode: string;
        }) =>
          handleUpdateDataSource({ key, sourceText, targetText, languageCode })
        }
        defaultData={editData}
        open={createOrEditModal.open}
        title={t(
          createOrEditModal.type == "create" ? "Create rule" : "Edit rule",
        )}
        setIsModalHide={() =>
          setCreateOrEditModal({
            ...createOrEditModal,
            open: false,
          })
        }
      ></UpdateCustomTransModal>
    </Page>
  );
};

export default Index;
