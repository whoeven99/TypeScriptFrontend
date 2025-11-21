import { Page } from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { LoaderFunctionArgs } from "@remix-run/node";
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Pagination,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { globalStore } from "~/globalStore";
import {
  DeleteLiquidDataByIds,
  GetCurrencyByShopName,
  mockIpConfigData,
  mockSwitchStatus,
  SelectShopNameLiquidData,
  UpdateLiquidReplacementMethod,
} from "~/api/JavaServer";
import UpdateCustomRedirectsModal from "./components/updateCustomRedirectsModal";
import { useDispatch, useSelector } from "react-redux";
import { setTableData } from "~/store/modules/currencyDataTable";
import { LanguagesDataType } from "../app.language/route";
import { CurrencyDataType } from "../app.currency/route";
const { Text } = Typography;

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

  //语言源数据
  const languageTableData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  //货币源数据
  const currencyTableData: CurrencyDataType[] = useSelector(
    (state: any) => state.currencyTableData.rows,
  );

  //加载状态数组，目前loading表示页面正在加载
  const [loadingArray, setLoadingArray] = useState<string[]>(["loading"]);

  //切换器加载状态数组，存储正在loading的Switch组件对应的id
  const [switchLoadingArray, setSwitchLoadingArray] = useState<number[]>([]);

  //移动端判断依据
  const [isMobile, setIsMobile] = useState<boolean>(mobile);

  //表格数据源
  const [dataSource, setDataSource] = useState<
    {
      key: number;
      status: boolean;
      region: string;
      language: string;
      currency: string;
      redirect_url: string;
    }[]
  >([]);

  //表格多选控制key
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  //编辑表单类型及数据控制
  const [createOrEditModal, setCreateOrEditModal] = useState<{
    open: boolean;
    key: number;
  }>({
    open: false,
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

    //表格数据初始化方法
    setTimeout(async () => {
      const selectShopNameLiquidData = await mockIpConfigData({
        shop: globalStore?.shop || "",
        server: server || "",
      });

      if (selectShopNameLiquidData.success) {
        let newData: {
          key: number;
          status: boolean;
          region: string;
          language: string;
          currency: string;
          redirect_url: string;
        }[] = [];
        if (
          Array.isArray(selectShopNameLiquidData.response) &&
          selectShopNameLiquidData.response?.length
        ) {
          newData = selectShopNameLiquidData.response.map((item: any) => ({
            key: item?.id,
            status: item?.status,
            region: item?.region,
            language: item?.language,
            currency: item?.currency,
            redirect_url: item?.redirect_url,
          }));
        }
        setDataSource(newData);
        setLoadingArray((prev) => prev.filter((item) => item !== "loading"));
      }
    }, 100);
    getCurrencyByShopName();
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  //表格列管理
  const columns = [
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      width: "10%",
      render: (_: any, record: any) => {
        return (
          <Switch
            // style={{ width: "100%" }}
            loading={switchLoadingArray.includes(record?.key)}
            onChange={() => {
              handleCustomRedirectStatus({
                id: record?.key,
              });
            }}
            value={record.status}
          />
        );
      },
    },
    {
      title: t("Region"),
      dataIndex: "region",
      key: "region",
      width: "15%",
    },
    {
      title: t("Language"),
      dataIndex: "language",
      key: "language",
      width: "15%",
    },
    {
      title: t("Currency"),
      dataIndex: "currency",
      key: "currency",
      width: "15%",
    },
    {
      title: t("Redirect URL"),
      dataIndex: "redirect_url",
      key: "redirect_url",
      width: "35%",
    },
    {
      title: t("Action"),
      dataIndex: "action",
      key: "action",
      width: "10%",
      render: (_: any, record: any) => (
        <Button
          onClick={() =>
            setCreateOrEditModal({
              open: true,
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

  //编辑表单数据更新和提交后更新表格方法
  const handleUpdateDataSource = ({
    key,
    region,
    language,
    currency,
    redirect_url,
  }: {
    key?: number;
    region: string;
    language: string;
    currency: string;
    redirect_url: string;
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
          region,
          language,
          currency,
          redirect_url,
        };
        return updated;
      } else {
        // ✅ 新增到数组最前面
        const newItem = {
          key: key || 0,
          status: true,
          region,
          language,
          currency,
          redirect_url,
        };
        return [newItem, ...prev];
      }
    });
  };

  //编辑替换方式
  const handleCustomRedirectStatus = async ({ id }: { id: number }) => {
    setSwitchLoadingArray([...switchLoadingArray, id]);
    const updateLiquidReplacementMethod = await mockSwitchStatus({
      shop: globalStore?.shop || "",
      server: server || "",
      id,
    });
    if (updateLiquidReplacementMethod?.success) {
      const newData = dataSource.map((item) =>
        item.key === id
          ? {
              ...item,
              status: !item.status,
            }
          : item,
      );
      setDataSource(newData);
    } else {
      shopify.toast.show(updateLiquidReplacementMethod?.errorMsg);
    }
    setSwitchLoadingArray((prev) => prev.filter((item) => item !== id));
  };

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

  //获取用户货币数据
  const getCurrencyByShopName = async () => {
    const data = await GetCurrencyByShopName({
      shop: globalStore?.shop || "",
      server: server as string,
    });
    if (data?.success) {
      const tableData = data?.response?.filter(
        (item: any) => !item?.primaryStatus,
      );
      dispatch(setTableData(tableData));
    }
  };

  const onCancel = () => {
    navigate(`/app/switcher`); // 跳转到 /app/manage_translation
  };

  return (
    <Page
      title={t("Custom Liquid")}
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
                  {t("Custom Liquid")}
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
                      <Text>{item.languageCode}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text>{t("Apply for")}</Text>
                      <Text>
                        {t(
                          item.replacementMethod
                            ? "Precise replacement"
                            : "Fuzzy Replacement",
                        )}
                      </Text>
                    </Flex>
                    <Button
                      style={{ width: "100%" }}
                      onClick={() =>
                        setCreateOrEditModal({
                          open: true,
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
      <UpdateCustomRedirectsModal
        server={server || ""}
        dataSource={dataSource}
        handleUpdateDataSource={({
          key,
          region,
          language,
          currency,
          redirect_url,
        }: {
          key?: number;
          region: string;
          language: string;
          currency: string;
          redirect_url: string;
        }) =>
          handleUpdateDataSource({
            key,
            region,
            language,
            currency,
            redirect_url,
          })
        }
        defaultData={editData}
        open={createOrEditModal.open}
        setIsModalHide={() =>
          setCreateOrEditModal({
            ...createOrEditModal,
            open: false,
          })
        }
      ></UpdateCustomRedirectsModal>
    </Page>
  );
};

export default Index;
