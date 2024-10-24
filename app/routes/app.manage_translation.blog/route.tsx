import { Input, Layout, Menu, MenuProps, Modal, Table, theme } from "antd";
import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextBlogs, queryPreviousBlogs } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";

const { Sider, Content } = Layout;

interface BlogType {
  id: string;
  handle: string;
  title: string;
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const blogs = await queryNextBlogs({ request, endCursor: "" });

    return json({
      blogs,
    });
  } catch (error) {
    console.error("Error load blog:", error);
    throw new Response("Error load blog", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const startCursor: string = JSON.parse(
      formData.get("startCursor") as string,
    );
    const endCursor: string = JSON.parse(formData.get("endCursor") as string);
    if (startCursor) {
      const previousBlogs = await queryPreviousBlogs({
        request,
        startCursor,
      }); // 处理逻辑
      return json({ previousBlogs: previousBlogs });
    }
    if (endCursor) {
      const nextBlogs = await queryNextBlogs({
        request,
        endCursor,
      }); // 处理逻辑
      return json({ nextBlogs: nextBlogs });
    }
  } catch (error) {
    console.error("Error action blog:", error);
    throw new Response("Error action blog", { status: 500 });
  }
};

const Index = () => {
  const { blogs } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (blogs: any) => {
    const data = blogs.nodes.map((blog: any) => ({
      key: blog.id,
      label: blog.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(blogs);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [blogsData, setBlogsData] = useState(blogs);
  const [blogData, setBlogData] = useState<BlogType>(blogs.nodes[0]);
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "title",
      resource: "Title",
      default_language: "",
      translated: "",
    },
    {
      key: "handle",
      resource: "Handle",
      default_language: "",
      translated: "",
    },
  ]);
  const [selectBlogKey, setSelectBlogKey] = useState(blogs.nodes[0].id);
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    blogsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    blogsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const modules = {
    toolbar: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["bold", "italic", "underline"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["code-block"],
      ["clean"],
    ],
  };
  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子
  const [quillLoaded, setQuillLoaded] = useState(false);

  useEffect(() => {
    setHasPrevious(blogsData.pageInfo.hasPreviousPage);
    setHasNext(blogsData.pageInfo.hasNextPage);
  }, [blogsData]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: blogData.title,
        translated: "",
      },
      {
        key: "handle",
        resource: "Handle",
        default_language: blogData.handle,
        translated: "",
      },
    ]);
  }, [blogData]);

  useEffect(() => {
    if (actionData && "nextBlogs" in actionData) {
      const nextBlogs = exMenuData(actionData.nextBlogs);
      // 在这里处理 nextBlogs
      console.log(nextBlogs);
      setMenuData(nextBlogs);
      setBlogsData(actionData.nextBlogs);
    } else {
      // 如果不存在 nextBlogs，可以执行其他逻辑
      console.log("nextBlogs undefined");
    }
  }, [actionData && "nextBlogs" in actionData]);

  useEffect(() => {
    if (actionData && "previousBlogs" in actionData) {
      const previousBlogs = exMenuData(actionData.previousBlogs);
      console.log(previousBlogs);
      // 在这里处理 previousBlogs
      setMenuData(previousBlogs);
      setBlogsData(actionData.previousBlogs);
    } else {
      // 如果不存在 previousBlogs，可以执行其他逻辑
      console.log("previousBlogs undefined");
    }
  }, [actionData && "previousBlogs" in actionData]);

  const resourceColumns = [
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      width: 150,
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      render: (_: any, record: TableDataType) => {
        return <Input disabled value={record?.default_language} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        return <Input value={record?.translated} />;
      },
    },
  ];

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = blogsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/blog",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = blogsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/blog",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 blogsData 中对应的产品
    const selectedBlog = blogsData.nodes.find((blog: any) => blog.id === e.key);

    // 如果找到了产品，就更新 blogData
    if (selectedBlog) {
      setBlogData(selectedBlog);
    } else {
      console.log("Blog not found");
    }

    // 更新选中的产品 key
    setSelectBlogKey(e.key);
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
        <Sider style={{ background: colorBgContainer }} width={200}>
          <Menu
            mode="inline"
            defaultSelectedKeys={[blogsData.nodes[0].id]}
            defaultOpenKeys={["sub1"]}
            style={{ height: "100%" }}
            items={menuData}
            // onChange={onChange}
            selectedKeys={[selectBlogKey]}
            onClick={onClick}
          />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Pagination
              hasPrevious={hasPrevious}
              onPrevious={onPrevious}
              hasNext={hasNext}
              onNext={onNext}
            />
          </div>
        </Sider>
        <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
          <Table
            columns={resourceColumns}
            dataSource={resourceData}
            pagination={false}
          />
        </Content>
      </Layout>
    </Modal>
  );
};

export default Index;
