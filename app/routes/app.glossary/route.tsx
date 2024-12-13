import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Suspense, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Button,
  Flex,
  message,
  Popover,
  Skeleton,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";
import { useFetcher } from "@remix-run/react";
import {
  DeleteGlossaryInfo,
  GetGlossaryByShopName,
  InsertGlossaryInfo,
  UpdateTargetTextById,
} from "~/api/serve";
import { useDispatch, useSelector } from "react-redux";
import {
  setGLossaryStatusLoadingState,
  setGLossaryStatusState,
  setGLossaryTableData,
  updateGLossaryTableData,
} from "~/store/modules/glossaryTableData";
import { ShopLocalesType } from "../app.language/route";
import UpdateGlossaryModal from "./components/updateGlossaryModal";
import { WarningOutlined } from "@ant-design/icons";

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
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const updateInfo = JSON.parse(formData.get("updateInfo") as string);
    const deleteInfo: number[] = JSON.parse(
      formData.get("deleteInfo") as string,
    );
    switch (true) {
      case !!loading:
        try {
          const data = await GetGlossaryByShopName({
            shop,
            accessToken,
          });
          console.log("GetGlossaryByShopName: ", data);

          return json({ data: data });
        } catch (error) {
          console.error("Error glossary loading:", error);
          throw new Response("Error glossary loading", { status: 500 });
        }
      case !!updateInfo:
        try {
          console.log("updateInfo: ", updateInfo);
          if (updateInfo.key >= 0) {
            const data = await UpdateTargetTextById({
              shop: shop,
              data: updateInfo,
            });
            return json({ data: data });
          } else {
            const data = await InsertGlossaryInfo({
              shop: shop,
              data: updateInfo,
            });
            return json({ data: data });
          }
        } catch (error) {
          console.error("Error glossary loading:", error);
          throw new Response("Error glossary loading", { status: 500 });
        }
      case !!deleteInfo:
        try {
          if (deleteInfo.length > 0) {
            const promise = deleteInfo.map(async (item: number) => {
              return DeleteGlossaryInfo({ id: item });
            });
            const res = await Promise.allSettled(promise);
            res.forEach((result) => {
              if (result.status === "fulfilled") {
                console.log("Request successful:", result.value);
              } else {
                console.error("Request failed:", result.reason);
              }
            });
            return json({ data: res });
          }
        } catch (error) {
          console.error("Error glossary loading:", error);
          throw new Response("Error glossary loading", { status: 500 });
        }
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action manage_translation:", error);
    throw new Response("Error action manage_translation", { status: 500 });
  }
};

const Index = () => {
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  // const [deleteloading, setDeleteLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [shopLocales, setShopLocales] = useState<ShopLocalesType[]>([]);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] =
    useState<boolean>(false);
  const [glossaryModalId, setGlossaryModalId] = useState<number>(-1);
  const dispatch = useDispatch();
  const loadingFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const deleteFetcher = useFetcher<any>();

  const dataSource = useSelector((state: any) => state.glossaryTableData.rows);

  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app/glossary",
    });
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      console.log(loadingFetcher.data.data.glossaryTableData);
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
      console.log(deleteFetcher.data);
      let newData = [...dataSource];
      // 遍历 deleteFetcher.data
      deleteFetcher.data.data.forEach((res: any) => {
        if (res.value?.success) {
          // 过滤掉需要删除的项
          newData = newData.filter(
            (item: GLossaryDataType) => item.key !== res.value.response.id,
          );
        } else {
          message.error(res.value.errorMsg);
        }
      });
      dispatch(setGLossaryTableData(newData)); // 更新表格数据
      setSelectedRowKeys([]);
      setDeleteLoading(false);
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    if (statusFetcher.data) {
      if (statusFetcher.data.data.success) {
        console.log(statusFetcher.data);
        message.success("Saved successfully");
        console.log({
          key: statusFetcher.data.data.response.id,
          loading: false,
          status: statusFetcher.data.data.response.status,
        });

        dispatch(
          setGLossaryStatusLoadingState({
            key: statusFetcher.data.data.response.id,
            loading: false,
            status: statusFetcher.data.data.response.status,
          }),
        );
      } else {
        message.error(statusFetcher.data.data.errorMsg);
        dispatch(
          setGLossaryStatusLoadingState({
            key: statusFetcher.data.data.response.id,
            loading: true,
          }),
        );
      }
    }
  }, [statusFetcher.data]);

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("deleteInfo", JSON.stringify(selectedRowKeys)); // 将选中的语言作为字符串发送
    deleteFetcher.submit(formData, { method: "post", action: "/app/glossary" }); // 提交表单请求
    setDeleteLoading(true);
  };

  const handleApplication = (key: number) => {
    const row = dataSource.find((item: any) => item.key === key);
    const formData = new FormData();
    const updateInfo = {
      ...row,
      type: row.type ? 1 : 0,
      status: row.status === 0 ? 1 : 0,
    };
    formData.append("updateInfo", JSON.stringify(updateInfo));
    statusFetcher.submit(formData, {
      method: "post",
      action: "/app/glossary",
    });
    dispatch(setGLossaryStatusLoadingState({ key, loading: true }));
  };

  const handleIsModalOpen = (title: string, key: number) => {
    if (title === "Add rules" && dataSource.length >= 5) {
      message.error("You can add up to 5 translation rules");
    } else {
      setTitle(title);
      setGlossaryModalId(key);
      setIsGlossaryModalOpen(true); // 打开Modal
    }
  };

  const onSelectChange = (newSelectedRowKeys: any) => {
    console.log(selectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const columns = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (_: any, record: any) => (
        <Switch
          checked={record?.status}
          onClick={() => handleApplication(record.key)}
          loading={record.loading} // 使用每个项的 loading 状态
        />
      ),
    },
    {
      title: "Text",
      dataIndex: "sourceText",
      key: "sourceText",
    },
    {
      title: "Language",
      dataIndex: "language",
      key: "language",
      render: (_: any, record: any) => {
        return record.language ? (
          <Text>{record.language}</Text>
        ) : (
          <Popover
            content={"This language has been deleted. Please edit again."}
          >
            <WarningOutlined
              style={{ color: "#F8B400", fontSize: "18px", width: "100%" }}
            />
          </Popover>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (_: any, record: any) => {
        return record.type ? (
          <Text>Case-sensitive</Text>
        ) : (
          <Text>Case-insensitive</Text>
        );
      },
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button
            onClick={() => handleIsModalOpen("Edit rules", record.key)}
            type="primary"
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];
  const hasSelected = selectedRowKeys.length > 0;
  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  return (
    <Page>
      <TitleBar title="Glossary" />
      {loading ? (
        <div>loading...</div>
      ) : (
        <div>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div>
              <Title style={{ fontSize: "1.25rem", display: "inline" }}>
                Glossary
              </Title>
              <div>
                <Text>
                  Create translation rules for certain words and phrases
                </Text>
              </div>
            </div>
            <div className="languageTable_action">
              <Flex
                align="center"
                justify="space-between" // 使按钮左右分布
                style={{ width: "100%", marginBottom: "16px" }}
              >
                <Flex align="center" gap="middle">
                  <Button
                    type="primary"
                    onClick={handleDelete}
                    disabled={!hasSelected}
                    loading={deleteLoading}
                  >
                    Delete
                  </Button>
                  {hasSelected
                    ? `Selected ${selectedRowKeys.length} items`
                    : null}
                </Flex>
                <div>
                  <Space>
                    <Button
                      type="primary"
                      onClick={() => handleIsModalOpen("Add rules", -1)}
                    >
                      Add rules
                    </Button>
                  </Space>
                </div>
              </Flex>
              <Suspense fallback={<Skeleton active />}>
                <Table
                  rowSelection={rowSelection}
                  columns={columns}
                  loading={deleteLoading}
                  dataSource={dataSource}
                  style={{ width: "100%" }}
                />
              </Suspense>
            </div>
          </Space>
          <UpdateGlossaryModal
            id={glossaryModalId}
            title={title}
            isVisible={isGlossaryModalOpen}
            setIsModalOpen={setIsGlossaryModalOpen}
            shopLocales={shopLocales}
          />
        </div>
      )}
    </Page>
  );
};

export default Index;
