import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Suspense, useEffect, useMemo, useState } from "react";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Button,
  Flex,
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
  GetGlossaryByShopName,
  InsertGlossaryInfo,
  UpdateTargetTextById,
} from "~/api/JavaServer";
import { useDispatch, useSelector } from "react-redux";
import {
  setGLossaryStatusLoadingState,
  setGLossaryTableData,
} from "~/store/modules/glossaryTableData";
import { ShopLocalesType } from "../app.language/route";
import UpdateGlossaryModal from "./components/updateGlossaryModal";
import { InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import TranslationWarnModal from "~/components/translationWarnModal";
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
  1: 0,
  2: 0,
  3: 0,
  4: 10,
  5: 50,
  6: 100,
  7: 100,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  console.log(`${shop} load glossary`);

  return {
    shop,
    server: process.env.SERVER_URL,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const deleteInfo: number[] = JSON.parse(
      formData.get("deleteInfo") as string,
    );
    switch (true) {
      case !!loading:
        try {
          const data = await GetGlossaryByShopName({
            shop,
            accessToken: accessToken as string,
          });
          return json({ data: data });
        } catch (error) {
          console.error("Error glossary loading:", error);
        }
      case !!deleteInfo:
        try {
          if (deleteInfo.length > 0) {
            const promise = deleteInfo.map(async (item: number) => {
              return DeleteGlossaryInfo({ id: item });
            });
            const data = await Promise.allSettled(promise);
            data.forEach((result) => {
              if (result.status === "fulfilled") {
                console.log("Request successful:", result.value);
              } else {
                console.error("Request failed:", result.reason);
              }
            });
            return json({ data: data });
          }
        } catch (error) {
          console.error("Error glossary loading:", error);
        }
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action glossary:", error);
  }
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [shopLocales, setShopLocales] = useState<ShopLocalesType[]>([]);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] =
    useState<boolean>(false);
  const [glossaryModalId, setGlossaryModalId] = useState<number>(-1);
  const [showWarnModal, setShowWarnModal] = useState<boolean>(false);
  const hasSelected = useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan } = useSelector((state: any) => state.userConfig);
  const loadingFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();

  const dataSource = useSelector((state: any) => state.glossaryTableData.rows);

  useEffect(() => {
    loadingFetcher.submit({ loading: JSON.stringify(true) }, { method: "POST" });
    setIsMobile(window.innerWidth < 768);
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      dispatch(
        setGLossaryTableData(loadingFetcher.data.data.glossaryTableData),
      );
      setShopLocales(loadingFetcher.data.data.shopLocales);
      shopify.loading(false);
      setLoading(false);
    }
  }, [loadingFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.data) {
      let newData = [...dataSource];
      // 遍历 deleteFetcher.data
      deleteFetcher.data.data.forEach((res: any) => {
        if (res.value?.success) {
          // 过滤掉需要删除的项
          newData = newData.filter(
            (item: GLossaryDataType) => item.key !== res.value.response.id,
          );
        } else {
          shopify.toast.show(res.value.errorMsg);
        }
      });
      dispatch(setGLossaryTableData(newData)); // 更新表格数据
      setSelectedRowKeys([]);
      setDeleteLoading(false);
      shopify.toast.show(t("Delete successfully"));
    }
  }, [deleteFetcher.data]);


  const handleDelete = () => {
    const formData = new FormData();
    formData.append("deleteInfo", JSON.stringify(selectedRowKeys)); // 将选中的语言作为字符串发送
    deleteFetcher.submit(formData, { method: "post", action: "/app/glossary" }); // 提交表单请求
    setDeleteLoading(true);
  };

  const handleApplication = async (key: number) => {
    const row = dataSource.find((item: any) => item.key === key);
    if (row.status === 0) {
      const activeItemsCount = dataSource.filter((item: any) => item.status === 1).length;
      if (activeItemsCount >= planMapping[plan as keyof typeof planMapping]) {
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
      shop: shop,
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
  }

  const handleIsModalOpen = (title: string, key: number) => {
    if (!plan) {
      return;
    }
    if (title === "Create rule" && dataSource.length >= planMapping[plan as keyof typeof planMapping]) {
      setShowWarnModal(true);
    } else {
      setTitle(t(title));
      setGlossaryModalId(key);
      setIsGlossaryModalOpen(true); // 打开Modal
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
        <Space>
          <Button
            onClick={() => handleIsModalOpen(t("Edit rules"), record.key)}
          >
            {t("Edit")}
          </Button>
        </Space>
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
        {loading ? (
          <div className="languageTable_action">
            <Flex
              align="center"
              justify="space-between" // 使按钮左右分布
              style={{ width: "100%", marginBottom: "16px" }}
            >
              <Skeleton.Button active />
              <Skeleton.Button active />
            </Flex>
            <Table columns={columns} loading style={{ width: "100%" }} />
          </div>
        ) : !shopLocales?.length ? (
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
          <div className="languageTable_action">
            <Flex
              align="center"
              justify="space-between" // 使按钮左右分布
              style={{ width: "100%", marginBottom: "16px" }}
            >
              <Flex align="center" gap="middle">
                <Button
                  onClick={handleDelete}
                  disabled={!hasSelected}
                  loading={deleteLoading}
                >
                  {t("Delete")}
                </Button>
                {hasSelected
                  ? `${t("Selected")}${selectedRowKeys.length}${t("items")}`
                  : null}
              </Flex>
              {planMapping[plan as keyof typeof planMapping] === 0 ?
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Popconfirm
                    title=""
                    description={t("Upgrade to a paid plan to unlock this feature")}
                    trigger="hover"
                    showCancel={false}
                    okText={t("Upgrade")}
                    onConfirm={() => navigate("/app/pricing")}
                  >
                    <InfoCircleOutlined />
                  </Popconfirm>
                  <Button
                    disabled
                  >
                    {t("Create rule")}
                  </Button>
                </div>
                :
                <Button
                  type="primary"
                  onClick={() => handleIsModalOpen("Create rule", -1)}
                >
                  {t("Create rule")}
                </Button>
              }
            </Flex>
            <Table
              virtual={isMobile}
              scroll={isMobile ? { x: 900 } : {}}
              rowSelection={rowSelection}
              columns={columns}
              loading={deleteLoading || loading}
              dataSource={dataSource}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </Space>
      <UpdateGlossaryModal
        id={glossaryModalId}
        title={title}
        isVisible={isGlossaryModalOpen}
        setIsModalOpen={setIsGlossaryModalOpen}
        shopLocales={shopLocales}
        shop={shop}
        server={server as string}
      />
      <TranslationWarnModal
        title={t("The glossary limitations has been reached (Current restrictions: {{count}})", { count: planMapping[plan as keyof typeof planMapping] })}
        content={t("Please upgrade to a higher plan to remove the current glossary limitations")}
        action={() => {
          navigate("/app/pricing");
        }}
        actionText={t("Upgrade")}
        show={showWarnModal}
        setShow={setShowWarnModal}
      />
    </Page>
  )
}

export default Index;
