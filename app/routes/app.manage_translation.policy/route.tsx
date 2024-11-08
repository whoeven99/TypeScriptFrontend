import { Input, Layout, Menu, MenuProps, Modal, Table, theme } from "antd";
import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react"; // 引入 useNavigate
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryShop, queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import ManageModalHeader from "~/components/manageModalHeader";
import { Editor } from "@tinymce/tinymce-react";

const { Sider, Content } = Layout;
const { TextArea } = Input;

interface PolicyType {
  id: string;
  body: string;
  title: string;
  translations: {
    id: string;
    body: string | undefined;
  };
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
    const shopLanguagesLoad: ShopLocalesType[] =
      await queryShopLanguages({request});
    const shop = await queryShop(request);
    const policyTitle = shop.shopPolicies;
    const policyBody = await queryNextTransType({
      request,
      resourceType: "SHOP_POLICY",
      endCursor: "",
      locale: searchTerm || shopLanguagesLoad[0].locale,
    });

    const policies = policyTitle.map((title: any, index: number) => {
      const body = policyBody.nodes[index];
      return {
        title: title.title,
        id: title.id,
        body: title.body,
        translations: {
          id: body.resourceId,
          value: body.translations[0]?.value,
        },
      };
    });
    return json({
      searchTerm,
      shopLanguagesLoad,
      policies,
    });
  } catch (error) {
    console.error("Error load policy:", error);
    throw new Response("Error load policy", { status: 500 });
  }
};

const Index = () => {
  const { searchTerm, shopLanguagesLoad, policies } =
    useLoaderData<typeof loader>();

  const exMenuData = (policies: any) => {
    const data = policies.map((policy: PolicyType) => ({
      key: policy.id,
      label: policy.title,
    }));
    return data;
  };

  const items: MenuProps["items"] = exMenuData(policies);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
  const [policiesData, setPoliciesData] = useState(policies);
  const [policyData, setPolicyData] = useState<PolicyType>(policies);
  const [resourceData, setResourceData] = useState<TableDataType[]>([]);
  const [selectPolicyKey, setSelectPolicyKey] = useState(policies[0].id);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();

  useEffect(() => {
    const data = policiesData.find(
      (policy: any) => policy.id === selectPolicyKey,
    );
    setPolicyData(data);
  }, [selectPolicyKey]);

  useEffect(() => {
    setResourceData([
      {
        key: "description",
        resource: "Content",
        default_language: policyData?.body,
        translated: policyData.translations?.body,
      },
    ]);
  }, [policyData]);

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
                editor.on("init", () => {
                  // 仅启用 "code" 按钮，不影响其他按钮
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
              },
            }}
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

  const onClick = (e: any) => {
    setSelectPolicyKey(e.key);
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
        <ManageModalHeader
          shopLanguagesLoad={shopLanguagesLoad}
          locale={searchTerm}
        />
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
              defaultSelectedKeys={[policies[0].id]}
              defaultOpenKeys={["sub1"]}
              style={{ height: "100%" }}
              items={menuData}
              // onChange={onChange}
              selectedKeys={[selectPolicyKey]}
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
      </Layout>
    </Modal>
  );
};

export default Index;
