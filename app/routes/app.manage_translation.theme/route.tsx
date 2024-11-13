import { Button, Input, Layout, Modal, Select, Space, Table, theme } from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextTransType,
  queryPreviousTransType,
  queryShopLanguages,
} from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { SearchOutlined } from "@ant-design/icons";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";

const { Header, Content } = Layout;
const { TextArea } = Input;

interface SelectType {
  label: string;
  value: string;
}

type TableDataType = {
  key: string;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      request,
    });
    const themes = await queryNextTransType({
      request,
      resourceType: "ONLINE_STORE_THEME",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });
    console.log(themes);

    return json({
      searchTerm,
      shopLanguagesLoad,
      themes,
    });
  } catch (error) {
    console.error("Error load theme:", error);
    throw new Response("Error load theme", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");
  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    const confirmData: ConfirmDataType[] = JSON.parse(
      formData.get("confirmData") as string,
    );
    switch (true) {
      case !!startCursor:
        const previousThemes = await queryPreviousTransType({
          request,
          resourceType: "METAFIELD",
          startCursor,
          locale: searchTerm || "",
        }); // 处理逻辑
        return json({ previousThemes: previousThemes });
      case !!endCursor:
        const nextThemes = await queryNextTransType({
          request,
          resourceType: "METAFIELD",
          endCursor,
          locale: searchTerm || "",
        }); // 处理逻辑

        return json({ nextThemes: nextThemes });
      case !!confirmData:
        await updateManageTranslation({
          request,
          confirmData,
        });
        return null;
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action theme:", error);
    throw new Response("Error action theme", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, themes } =
    useLoaderData<typeof loader>();

  const [searchInput, setSearchInput] = useState("");
  const [selectData, setSelectData] = useState<SelectType[]>();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [themesData, setThemesData] = useState([]);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
  const [translatedValues, setTranslatedValues] = useState<{
    [key: string]: string;
  }>({});
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setThemesData(generateMenuItemsArray(themes));
  }, []);

  useEffect(() => {
    setResourceData(themesData);
  }, [themesData]);

  useEffect(() => {
    const newArray = shopLanguagesLoad
      .filter((language) => !language.primary)
      .map((language) => ({
        label: language.name,
        value: language.locale,
      }));
    setSelectData(newArray);
  }, [shopLanguagesLoad]);

  const resourceColumns = [
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      width: "10%",
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          <TextArea
            disabled
            value={record?.default_language}
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
        );
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      width: "45%",
      render: (_: any, record: TableDataType) => {
        return (
          record && (
            <TextArea
              value={translatedValues[record?.key] || record?.translated}
              autoSize={{ minRows: 1, maxRows: 6 }}
              onChange={(e) => handleInputChange(record.key, e.target.value)}
            />
          )
        );
      },
    },
  ];

  const handleInputChange = (key: string, value: string) => {
    setTranslatedValues((prev) => ({
      ...prev,
      [key]: value, // 更新对应的 key
    }));
    setConfirmData((prevData) => {
      const existingItemIndex = prevData.findIndex((item) => item.key === key);
  
      if (existingItemIndex !== -1) {
        // 如果 key 存在，更新其对应的 value
        const updatedConfirmData = [...prevData];
        updatedConfirmData[existingItemIndex] = {
          ...updatedConfirmData[existingItemIndex],
          value: value,
        };
        return updatedConfirmData;
      } else {
        // 如果 key 不存在，新增一条数据
        const newItem = {
          resourceId: themes.nodes[0]?.resourceId,
          locale: themes.nodes[0]?.translatableContent[0]?.locale,
          key: key,
          value: value, // 初始为空字符串
          translatableContentDigest: themes.nodes[0]?.translatableContent[0]?.digest,
          target: searchTerm || "",
        };
  
        return [...prevData, newItem]; // 将新数据添加到 confirmData 中
      }
    });
  };

  const generateMenuItemsArray = (items: any) => {
    return items.nodes[0].translatableContent.flatMap(
      (item: any, index: number) => {
        // 创建当前项的对象
        const currentItem = {
          key: `${item.key}`, // 使用 id 生成唯一的 key
          resource: item.key, // 资源字段固定为 "Menu Items"
          default_language: item.value, // 默认语言为 item 的标题
          translated: items.nodes[0]?.translations[index]?.value, // 翻译字段初始化为空字符串
        };
        return [currentItem];
      },
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    const filteredData = themesData.filter((theme: any) =>
      theme.default_language.toLowerCase().includes(value.toLowerCase()),
    );
    setResourceData(filteredData);
  };

  const onChange = (e: any) => {
    const currentPath = location.pathname;
    navigate(`${currentPath}?language=${e}`);
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: `/app/manage_translation/theme?language=${searchTerm}`,
    }); // 提交表单请求
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  return (
    <Modal
      open={isVisible}
      onCancel={onCancel}
      width={"100%"}
      footer={[
        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <Button onClick={onCancel} style={{ marginRight: "10px" }}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} type="primary">
            Confirm
          </Button>
        </div>,
      ]}
    >
      <Layout
        style={{
          padding: "24px 0",
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        <Header
          style={{
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Input
            placeholder="Search languages..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearch}
            style={{ marginBottom: 16 }}
          />
        </Header>
        <Layout
          style={{
            padding: "24px 0",
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <Table columns={resourceColumns} dataSource={resourceData} />
            </Space>
          </Content>
        </Layout>
      </Layout>
    </Modal>
  );
};

export default Index;
