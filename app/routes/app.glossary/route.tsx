import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Suspense, useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { Button, Flex, Skeleton, Space, Switch, Table, Typography } from "antd";
import { useFetcher } from "@remix-run/react";
import { GetGlossaryByShopName } from "~/api/serve";
import { useDispatch, useSelector } from "react-redux";
import {
  setGLossaryStatusLoadingState,
  setGLossaryStatusState,
  setGLossaryTableData,
} from "~/store/modules/glossaryTableData";

const { Title, Text } = Typography;

export interface GLossaryDataType {
  id: string;
  sourceText: string;
  targetText: string;
  language: string;
  target: string;
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
    switch (true) {
      case !!loading:
        const data = await GetGlossaryByShopName({
          shop,
          accessToken,
        });
        console.log("GetGlossaryByShopName: ", data);

        return json({ data: data });
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
  const [loading, setLoading] = useState<boolean>(true);
  // const [deleteloading, setDeleteLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [isAddGlossaryModalOpen, setIsAddGlossaryModalOpen] =
    useState<boolean>(false);
  const [isEditGlossaryModalOpen, setIsEditGlossaryModalOpen] =
    useState<boolean>(false);
  const [editGlossaryId, setEditGlossaryId] = useState<string>();
  const dispatch = useDispatch();
  const loadingFetcher = useFetcher<any>();
  const editFetcher = useFetcher<any>();

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
      dispatch(setGLossaryTableData(loadingFetcher.data.data));
      shopify.loading(false);
      setLoading(false);
    }
  }, [loadingFetcher.data]);

  const handleDelete = () => {
    // const newData = data.filter(
    //   (item: LanguagesDataType) => !selectedRowKeys.includes(item.key),
    // );
    // const deleteData = data.filter((item: LanguagesDataType) =>
    //   selectedRowKeys.includes(item.key),
    // );
    // const formData = new FormData();
    // formData.append(
    //   "deleteData",
    //   JSON.stringify({
    //     deleteData: deleteData,
    //     primaryLanguage: primaryLanguage?.locale,
    //   }),
    // ); // 将选中的语言作为字符串发送
    // submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
    // dispatch(setTableData(newData)); // 更新表格数据
    // setSelectedRowKeys([]); // 清空已选中项
  };

  const handleApplication = (id: string) => {
    const row = dataSource.find((item: any) => item.id === id);
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app/glossary",
    });
    dispatch(setGLossaryStatusLoadingState({ id, loading: true }));
  };

  const handleAdd = () => {
    setIsAddGlossaryModalOpen(true); // 打开Modal
  };

  const handleEdit = (id: string) => {
    setEditGlossaryId(id);
    setIsEditGlossaryModalOpen(true); // 打开Modal
  };

  const onSelectChange = (newSelectedRowKeys: any) => {
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
          onClick={() => handleApplication(record.id)}
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
          <Button onClick={() => handleEdit(record.id)} type="primary">
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
                    // loading={deleteloading}
                  >
                    Delete
                  </Button>
                  {hasSelected
                    ? `Selected ${selectedRowKeys.length} items`
                    : null}
                </Flex>
                <div>
                  <Space>
                    <Button type="primary" onClick={() => handleAdd()}>
                      Add rules
                    </Button>
                  </Space>
                </div>
              </Flex>
              <Suspense fallback={<Skeleton active />}>
                <Table
                  rowSelection={rowSelection}
                  columns={columns}
                  dataSource={dataSource}
                  style={{ width: "100%" }}
                />
              </Suspense>
            </div>
          </Space>
        </div>
      )}
    </Page>
  );
};

export default Index;
