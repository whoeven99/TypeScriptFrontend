import { Layout, Modal, Table, theme, Result, Button } from "antd";
import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryShopLanguages } from "~/api/admin";
import { Editor } from "@tinymce/tinymce-react";
import { ShopLocalesType } from "../app.language/route";

const { Content } = Layout;

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
    const shopLanguagesLoad: ShopLocalesType[] =
      await queryShopLanguages(request);
    const shippings = await queryNextTransType({
      request,
      resourceType: "PACKING_SLIP_TEMPLATE",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    return json({
      searchTerm,
      shopLanguagesLoad,
      shippings,
    });
  } catch (error) {
    console.error("Error load shipping:", error);
    throw new Response("Error load shipping", { status: 500 });
  }
};

const Index = () => {
  const { shippings } = useLoaderData<typeof loader>();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [shippingsData, setShippingsData] = useState(shippings);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();

  useEffect(() => {
    const Data = shippingsData.nodes.map((node: any) => ({
      key: node.resourceId,
      resource: "Label",
      default_language: node.translatableContent[0].value,
      translated: node.translations[0]?.value,
    }));
    setResourceData(Data);
  }, []);

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
                // 初始化时启用 "code" 按钮
                editor.on("init", () => {
                  const codeButton = editor
                    .getContainer()
                    .querySelector('button[data-mce-name="code"]');
                  if (
                    codeButton &&
                    codeButton.classList.contains("tox-tbtn--disabled")
                  ) {
                    codeButton.classList.remove("tox-tbtn--disabled");
                    codeButton.setAttribute("aria-disabled", "false");
                    (codeButton as HTMLButtonElement).disabled = false;
                  }
                });

                // 限制图片的最大宽度
                editor.on("NodeChange", (e) => {
                  const imgElements = editor.getDoc().querySelectorAll("img");
                  imgElements.forEach((img) => {
                    img.style.maxWidth = "100%"; // 最大宽度为100%
                    img.style.height = "auto"; // 保持比例
                  });
                });

                // 插入图片时设置样式
                editor.on("BeforeSetContent", (e) => {
                  const content = e.content;
                  // 如果包含图片，添加最大宽度限制
                  if (content.includes("<img")) {
                    e.content = content.replace(
                      /<img/g,
                      '<img style="max-width: 100%; height: auto;"',
                    );
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
      width: "45%",
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
              setup: (editor) => {
                // 限制图片的最大宽度
                editor.on("NodeChange", (e) => {
                  const imgElements = editor.getDoc().querySelectorAll("img");
                  imgElements.forEach((img) => {
                    img.style.maxWidth = "100%"; // 最大宽度为100%
                    img.style.height = "auto"; // 保持比例
                  });
                });

                // 插入图片时设置样式
                editor.on("BeforeSetContent", (e) => {
                  const content = e.content;
                  // 如果包含图片，添加最大宽度限制
                  if (content.includes("<img")) {
                    e.content = content.replace(
                      /<img/g,
                      '<img style="max-width: 100%; height: auto;"',
                    );
                  }
                });
              },
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
