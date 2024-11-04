import {
  Input,
  Layout,
  Menu,
  MenuProps,
  Modal,
  Table,
  theme,
  Result,
  Button,
} from "antd";
import { useEffect, useState } from "react";
import {
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";

const { Sider, Content } = Layout;

interface TransType {
  translatableContent:
    | [
        {
          digest: string;
          key: string;
          locale: string;
          type: string;
          value: string;
        },
      ]
    | [];
  translations:
    | [
        {
          key: string;
          locale: string;
          outdated: boolean;
          updatedAt: string;
          value: string;
        },
      ]
    | [];
}

type TableDataType = {
  key: string | number;
  resource: string;
  default_language: string | undefined;
  translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const shippings = await queryNextTransType({
      request,
      resourceType: "PACKING_SLIP_TEMPLATE",
      endCursor: "",
    });

    return json({
      shippings,
    });
  } catch (error) {
    console.error("Error load shipping:", error);
    throw new Response("Error load shipping", { status: 500 });
  }
};

// export const action = async ({ request }: ActionFunctionArgs) => {
//   try {
//     const formData = await request.formData();
//     const startCursor: string = JSON.parse(
//       formData.get("startCursor") as string,
//     );
//     const endCursor: string = JSON.parse(formData.get("endCursor") as string);
//     if (startCursor) {
//       const previousShippings = await queryPreviousTransType({
//         request,
//         resourceType: "PACKING_SLIP_TEMPLATE",
//         startCursor,
//       }); // 处理逻辑
//       return json({ previousShippings: previousShippings });
//     }
//     if (endCursor) {
//       const nextShippings = await queryNextTransType({
//         request,
//         resourceType: "PACKING_SLIP_TEMPLATE",
//         endCursor,
//       }); // 处理逻辑
//       return json({ nextShippings: nextShippings });
//     }
//   } catch (error) {
//     console.error("Error action shipping:", error);
//     throw new Response("Error action shipping", { status: 500 });
//   }
// };

const Index = () => {
  const { shippings } = useLoaderData<typeof loader>();
  //   const actionData = useActionData<typeof action>();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>([
    {
      key: "shipping",
      label: "Packing slip template",
    },
  ]);
  const [shippingsData, setShippingsData] = useState(shippings);
  const [shippingData, setShippingData] = useState<TransType>(
    shippings.nodes[0],
  );
  const [resourceData, setResourceData] = useState<TableDataType[]>([
    {
      key: "",
      resource: "",
      default_language: "",
      translated: "",
    },
  ]);
  const [selectShippingKey, setSelectShippingKey] = useState(
    shippings.nodes[0]?.translatableContent[0]?.digest,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  useEffect(() => {
    const Data = shippingsData.nodes.map((node: any) => ({
      key: node.translatableContent[0].digest,
      resource: "Label",
      default_language: node.translatableContent[0].value,
      translated: "",
    }));
    setResourceData(Data);
  }, [shippingData]);

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
        return (
          <Editor
            apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
            value={record?.default_language || ""}
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
      },
    },
    {
      title: "Translated",
      dataIndex: "translated",
      key: "translated",
      render: (_: any, record: TableDataType) => {
        return (
          <Editor
            apiKey="ogejypabqwbcwx7z197dy71mudw3l9bgif8x6ujlffhetcq8" // 如果使用云端版本，需要提供 API 密钥。否则可以省略。
            value={record?.translated || ""}
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
      },
    },
  ];

  const onCancel = () => {
    setIsVisible(false); // 关闭 Modal
    navigate("/app/manage_translation"); // 跳转到 /app/manage_translation
  };

  const onPrevious = () => {
    const formData = new FormData();
    const startCursor = shippingsData.pageInfo.startCursor;
    formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/shipping",
    }); // 提交表单请求
  };

  const onNext = () => {
    const formData = new FormData();
    const endCursor = shippingsData.pageInfo.endCursor;
    formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/manage_translation/shipping",
    }); // 提交表单请求
  };

  // const onChange = () => {

  // };

  const onClick = (e: any) => {
    // 查找 shippingsData 中对应的产品
    const selectedShipping = shippingsData.nodes.find(
      (shipping: any) => shipping.translatableContent[0].digest === e.key,
    );

    // 如果找到了产品，就更新 shippingData
    if (selectedShipping) {
      setShippingData(selectedShipping);
    } else {
      console.log("Shipping not found");
    }

    // 更新选中的产品 key
    setSelectShippingKey(e.key);
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
      {shippingsData.nodes.length ? (
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
              defaultSelectedKeys={[
                "shipping",
              ]}
              defaultOpenKeys={["sub1"]}
              style={{ height: "100%" }}
              items={menuData}
              // onChange={onChange}
              selectedKeys={[selectShippingKey]}
              onClick={onClick}
            />
          </Sider>
          <Content style={{ padding: "0 24px", minHeight: "70vh" }}>
            <Table
              columns={resourceColumns}
              dataSource={resourceData}
              pagination={false}
            />
          </Content>
        </Layout>
      ) : (
        <Result
          //   icon={<SmileOutlined />}
          title="No items found here"
          extra={<Button type="primary">back</Button>}
        />
      )}
    </Modal>
  );
};

export default Index;
