import { Input, Layout, Modal, Select, Space, Table, theme } from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
} from "@remix-run/react"; // 引入 useNavigate
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  queryNextTransType,
  queryPreviousTransType,
  queryShopLanguages,
} from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import ManageModalHeader from "~/components/manageModalHeader";
import { SearchOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;
const { TextArea } = Input;

interface SelectType {
  label: string;
  value: string;
}

type TableDataType = {
  key: string | number;
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
    if (startCursor) {
      const previousThemes = await queryPreviousTransType({
        request,
        resourceType: "METAFIELD",
        startCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      return json({ previousThemes: previousThemes });
    }
    if (endCursor) {
      const nextThemes = await queryNextTransType({
        request,
        resourceType: "METAFIELD",
        endCursor,
        locale: searchTerm || "",
      }); // 处理逻辑
      console.log(nextThemes);

      return json({ nextThemes: nextThemes });
    }

    return null;
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
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const location = useLocation();

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
          <TextArea
            value={record?.translated}
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
        );
      },
    },
  ];

  const generateMenuItemsArray = (items: any) => {
    return items.nodes[0].translatableContent.flatMap(
      (item: any, index: number) => {
        // 创建当前项的对象
        console.log(item);
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
    window.location.href = `${currentPath}?language=${e}`;
  };

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  return (
    <Modal
      open={isVisible}
      onCancel={onCancel}
      //   onOk={() => handleConfirm()} // 确定按钮绑定确认逻辑
      width={"100%"}
      // style={{
      //   minHeight: "100%",
      // }}
      okText="Confirm"
      cancelText="Cancel"
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
          <Select
            options={selectData}
            style={{ minWidth: "200px" }}
            defaultValue={searchTerm || shopLanguagesLoad[0].locale}
            onChange={onChange}
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
