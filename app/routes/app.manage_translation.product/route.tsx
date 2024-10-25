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
import { queryNextProducts, queryPreviousProducts } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";

const { Sider, Content } = Layout;

interface ProductType {
  handle: string;
  id: string;
  description: string | undefined;
  descriptionHtml: string | undefined;
  seo: {
    description: string | undefined;
    title: string | undefined;
  };
  productType: string;
  options: [
    {
      name: string | undefined;
      values: string[] | undefined;
    },
  ];
  media: {
    nodes: {
      preview: {
        image: {
          url: string | undefined;
        };
      };
    };
  };
  metafields: {
    nodes: {
      id: string | undefined;
      definition: {
        id: string | undefined;
      };
    };
  };
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
    const products = await queryNextProducts({ request, endCursor: "" });

    return json({
      products,
    });
  } catch (error) {
    console.error("Error load product:", error);
    throw new Response("Error load product", { status: 500 });
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
      const previousProducts = await queryPreviousProducts({
        request,
        startCursor,
      }); // 处理逻辑
      return json({ previousProducts: previousProducts });
    }
    if (endCursor) {
      const nextProducts = await queryNextProducts({ request, endCursor }); // 处理逻辑
      return json({ nextProducts: nextProducts });
    }
  } catch (error) {
    console.error("Error action product:", error);
    throw new Response("Error action product", { status: 500 });
  }
};

const Index = () => {
  const { products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const exMenuData = (products: any) => {
    const data = products.nodes.map((product: any) => ({
      key: product.id,
      label: product.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(products);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [productsData, setProductsData] = useState(products);
  const [productData, setProductData] = useState<ProductType>(
    products.nodes[0],
  );
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "title",
      resource: "Title",
      default_language: "",
      translated: "",
    },
    {
      key: "description",
      resource: "Description",
      default_language: "",
      translated: "",
    },
    {
      key: "productType",
      resource: "ProductType",
      default_language: "",
      translated: "",
    },
  ]);
  const [SeoData, setSeoData] = useState<TableDataType[]>([
    {
      key: "url_handle",
      resource: "URL handle",
      default_language: "",
      translated: "",
    },
    {
      key: "meta_title",
      resource: "Meta title",
      default_language: "",
      translated: "",
    },
    {
      key: "meta_description",
      resource: "Meta description",
      default_language: "",
      translated: "",
    },
  ]);
  const [optionsData, setOptionsData] = useState<TableDataType[]>([]);
  const [variantsData, setVariantsData] = useState<TableDataType[]>([]);
  const [selectProductKey, setSelectProductKey] = useState(
    products.nodes[0].id,
  );
  const [hasPrevious, setHasPrevious] = useState<boolean>(
    productsData.pageInfo.hasPreviousPage,
  );
  const [hasNext, setHasNext] = useState<boolean>(
    productsData.pageInfo.hasNextPage,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    setHasPrevious(productsData.pageInfo.hasPreviousPage);
    setHasNext(productsData.pageInfo.hasNextPage);
  }, [productsData]);

  useEffect(() => {
    setResourceData([
      {
        key: "title",
        resource: "Title",
        default_language: productData.title,
        translated: "",
      },
      {
        key: "description",
        resource: "Description",
        default_language: productData.description,
        translated: "",
      },
      {
        key: "productType",
        resource: "ProductType",
        default_language: productData.productType,
        translated: "1111111",
      },
    ]);
    setSeoData([
      {
        key: "url_handle",
        resource: "URL handle",
        default_language: productData.handle,
        translated: "",
      },
      {
        key: "meta_title",
        resource: "Meta title",
        default_language: productData.seo.title,
        translated: "",
      },
      {
        key: "meta_description",
        resource: "Meta description",
        default_language: productData.seo.description,
        translated: "",
      },
    ]);
    const optionsData = productData.options.map((option, index) => {
      if (option.name === "Title") {
        return null;
      }
      return {
        key: index,
        resource: "Option name",
        default_language: option.name,
        translated: "",
      };
    });
    setOptionsData(optionsData);
    if (productData.options[0]?.values) {
      const variantsData = productData.options[0]?.values.map(
        (value, index) => {
          if (value === "Default Title") {
            return null;
          }
          return {
            key: index,
            resource: "Variant name",
            default_language: value,
            translated: "",
          };
        },
      );
      setVariantsData(variantsData);
    }
    console.log(optionsData);
    console.log(optionsData.length);
  }, [productData]);

  useEffect(() => {
    if (actionData && "nextProducts" in actionData) {
      const nextProducts = exMenuData(actionData.nextProducts);
      // 在这里处理 nextProducts
      console.log(nextProducts);
      setMenuData(nextProducts);
      setProductsData(actionData.nextProducts);
    } else {
      // 如果不存在 nextProducts，可以执行其他逻辑
      console.log("nextProducts undefined");
    }
  }, [actionData && "nextProducts" in actionData]);

  useEffect(() => {
    if (actionData && "previousProducts" in actionData) {
      const previousProducts = exMenuData(actionData.previousProducts);
      console.log(previousProducts);
      // 在这里处理 previousProducts
      setMenuData(previousProducts);
      setProductsData(actionData.previousProducts);
    } else {
      // 如果不存在 previousProducts，可以执行其他逻辑
      console.log("previousProducts undefined");
    }
  }, [actionData && "previousProducts" in actionData]);

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
        if (record?.key === "description") {
          return (
            <Editor
              apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
              value={record.default_language || ""}
              disabled={true}
              init={{
                height: 300,
                menubar: false,
                plugins:
                  "print preview searchreplace autolink directionality visualblocks visualchars fullscreen image link media template code codesample table charmap hr pagebreak nonbreaking anchor insertdatetime advlist lists wordcount imagetools textpattern help emoticons autosave bdmap indent2em autoresize formatpainter axupimgs",
                toolbar:
                  "code undo redo restoredraft | cut copy paste pastetext | forecolor backcolor bold italic underline strikethrough link anchor | alignleft aligncenter alignright alignjustify outdent indent | \
                styleselect formatselect fontselect fontsizeselect | bullist numlist | blockquote subscript superscript removeformat | \
                table image media charmap emoticons hr pagebreak insertdatetime print preview | fullscreen | bdmap indent2em lineheight formatpainter axupimgs",
                setup: (editor) => {
                  editor.on("init", () => {
                    // 仅启用 "code" 按钮，不影响其他按钮
                    const codeButton = editor
                      .getContainer()
                      .querySelector('button[data-mce-name="code"]');
                    console.log(codeButton);

                    if (
                      codeButton &&
                      codeButton.classList.contains("tox-tbtn--disabled")
                    ) {
                      codeButton.classList.remove("tox-tbtn--disabled");
                      codeButton.setAttribute("aria-disabled", "false");
                      (codeButton as HTMLButtonElement).disabled = false;
                    }
                  });
                },
              }}
              // onEditorChange={handleEditorChange}
            />
          );
        }
        return <Input disabled value={record?.default_language} />;
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        if (record?.key === "description") {
          return (
            <Editor
              apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
              value={record.translated || ""}
              init={{
                height: 300,
                menubar: false,
                plugins:
                  "print preview searchreplace autolink directionality visualblocks visualchars fullscreen image link media template code codesample table charmap hr pagebreak nonbreaking anchor insertdatetime advlist lists wordcount imagetools textpattern help emoticons autosave bdmap indent2em autoresize formatpainter axupimgs",
                toolbar:
                  "code undo redo restoredraft | cut copy paste pastetext | forecolor backcolor bold italic underline strikethrough link anchor | alignleft aligncenter alignright alignjustify outdent indent | \
                styleselect formatselect fontselect fontsizeselect | bullist numlist | blockquote subscript superscript removeformat | \
                table image media charmap emoticons hr pagebreak insertdatetime print preview | fullscreen | bdmap indent2em lineheight formatpainter axupimgs",
                // Add any additional configurations needed
                content_style:
                  "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
              }}
              // onEditorChange={handleEditorChange}
            />
          );
        }
        return <Input value={record?.translated} />;
      },
    },
  ];

  const SEOColumns = [
    {
      title: "SEO",
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

  const optionsColumns = [
    {
      title: "Product Options",
      dataIndex: "resource",
      key: "resource",
      width: 150,
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <Input disabled value={record.default_language} />;
        } else {
          return null;
        }
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <Input disabled value={record.translated} />;
        } else {
          return null;
        }
      },
    },
  ];
  const variantsColumns = [
    {
      title: "Variants",
      dataIndex: "resource",
      key: "resource",
      width: 150,
    },
    {
      title: "Default Language",
      dataIndex: "default_language",
      key: "default_language",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <Input disabled value={record.default_language} />;
        } else {
          return null;
        }
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        if (record) {
          return <Input disabled value={record.translated} />;
        } else {
          return null;
        }
      },
    },
  ];

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = productsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/product",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = productsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/product",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 productsData 中对应的产品
    const selectedProduct = productsData.nodes.find(
      (product: any) => product.id === e.key,
    );

    // 如果找到了产品，就更新 productData
    if (selectedProduct) {
      setProductData(selectedProduct);
    } else {
      console.log("Product not found");
    }

    // 更新选中的产品 key
    setSelectProductKey(e.key);
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
            defaultSelectedKeys={[productsData.nodes[0].id]}
            defaultOpenKeys={["sub1"]}
            style={{ height: "100%" }}
            items={menuData}
            // onChange={onChange}
            selectedKeys={[selectProductKey]}
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
          <Table columns={SEOColumns} dataSource={SeoData} pagination={false} />
          {Array.isArray(optionsData) && optionsData[0] !== null && (
            <Table
              columns={optionsColumns}
              dataSource={optionsData}
              pagination={false}
            />
          )}
          {Array.isArray(variantsData) && variantsData[0] !== null && (
            <Table
              columns={variantsColumns}
              dataSource={variantsData}
              pagination={false}
            />
          )}
        </Content>
      </Layout>
    </Modal>
  );
};

export default Index;
