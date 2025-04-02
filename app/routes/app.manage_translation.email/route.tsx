import {
    Button,
    Layout,
    Menu,
    MenuProps,
    message,
    Modal,
    Result,
    Table,
    theme,
} from "antd";
import { useEffect, useState } from "react";
import {
    useActionData,
    useFetcher,
    useLoaderData,
    useNavigate,
    useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { Pagination } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
    queryNextTransType,
    queryPreviousTransType,
    queryShopLanguages,
} from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { ConfirmDataType, updateManageTranslation } from "~/api/serve";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { SessionService } from "~/utils/session.server";

const { Sider, Content } = Layout;



interface EmailType {
    handle: string;
    key: string;
    title: string;
    body: string | undefined;
    translations: {
        handle: string | undefined;
        key: string;
        title: string | undefined;
        body: string | undefined;
    };
}

type TableDataType = {
    key: string;
    resource: string;
    default_language: string | undefined;
    translated: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const sessionService = await SessionService.init(request);
    let shopSession = sessionService.getShopSession();
    if (!shopSession) {
        const adminAuthResult = await authenticate.admin(request);
        const { shop, accessToken } = adminAuthResult.session;
        shopSession = {
            shop: shop,
            accessToken: accessToken as string,
        };
        sessionService.setShopSession(shopSession);
    }
    const { shop, accessToken } = shopSession;
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get("language");
    try {
        const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
            shop,
            accessToken,
        });
        const emails = await queryNextTransType({
            shop,
            accessToken,
            resourceType: "EMAIL_TEMPLATE",
            endCursor: "",
            locale: searchTerm || shopLanguagesLoad[0].locale,
        });

        return json({
            searchTerm,
            shopLanguagesLoad,
            emails,
        });
    } catch (error) {
        console.error("Error load email:", error);
        throw new Response("Error load email", { status: 500 });
    }
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get("language");
    const sessionService = await SessionService.init(request);
    let shopSession = sessionService.getShopSession();
    if (!shopSession) {
        const adminAuthResult = await authenticate.admin(request);
        const { shop, accessToken } = adminAuthResult.session;
        shopSession = {
            shop: shop,
            accessToken: accessToken as string,
        };
        sessionService.setShopSession(shopSession);
    }
    const { shop, accessToken } = shopSession;
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
                const previousEmails = await queryPreviousTransType({
                    shop,
                    accessToken: accessToken as string,
                    resourceType: "EMAIL_TEMPLATE",
                    startCursor,
                    locale: searchTerm || "",
                }); // 处理逻辑
                return json({ previousEmails: previousEmails });
            case !!endCursor:
                const nextEmails = await queryNextTransType({
                    shop,
                    accessToken: accessToken as string,
                    resourceType: "EMAIL_TEMPLATE",
                    endCursor,
                    locale: searchTerm || "",
                }); // 处理逻辑
                return json({ nextEmails: nextEmails });
            case !!confirmData:
                const data = await updateManageTranslation({
                    shop,
                    accessToken: accessToken as string,
                    confirmData,
                });
                return json({ data: data, confirmData: confirmData });
            default:
                // 你可以在这里处理一个默认的情况，如果没有符合的条件
                return json({ success: false, message: "Invalid data" });
        }
    } catch (error) {
        console.error("Error action email:", error);
        throw new Response("Error action email", { status: 500 });
    }
};

const Index = () => {
    const { searchTerm, shopLanguagesLoad, emails } =
        useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();

    const exMenuData = (emails: any) => {
        const data = emails.nodes.map((email: any) => ({
            key: email?.resourceId,
            label: email?.translatableContent.find(
                (item: any) => item.key === "title",
            ).value,
        }));
        return data;
    };

    const items: MenuProps["items"] = exMenuData(emails);
    const [isVisible, setIsVisible] = useState<boolean>(true);
    const [menuData, setMenuData] = useState<MenuProps["items"]>(items);
    const [emailsData, setEmailsData] = useState(emails);
    const [emailData, setEmailData] = useState<EmailType>();
    const [resourceData, setResourceData] = useState<TableDataType[]>([]);
    const [SeoData, setSeoData] = useState<TableDataType[]>([]);
    const [selectEmailKey, setSelectEmailKey] = useState(
        emails.nodes[0]?.resourceId,
    );
    const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
    const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
    const [translatedValues, setTranslatedValues] = useState<{
        [key: string]: string;
    }>({});

    const [hasPrevious, setHasPrevious] = useState<boolean>(
        emailsData.pageInfo.hasPreviousPage,
    );
    const [hasNext, setHasNext] = useState<boolean>(
        emailsData.pageInfo.hasNextPage,
    );
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const navigate = useNavigate();
    const { t } = useTranslation();
    const submit = useSubmit(); // 使用 useSubmit 钩子
    const confirmFetcher = useFetcher<any>();

    useEffect(() => {
        const data = transBeforeData({
            emails: emailsData,
        });
        setEmailData(data);
        setConfirmData([]);
        setTranslatedValues({});
    }, [selectEmailKey]);

    useEffect(() => {
        setHasPrevious(emailsData.pageInfo.hasPreviousPage);
        setHasNext(emailsData.pageInfo.hasNextPage);
    }, [emailsData]);

    useEffect(() => {
        setResourceData(
            [
                {
                    key: "title",
                    resource: "Title",
                    default_language: emailData?.title,
                    translated: emailData?.translations?.title,
                },
                {
                    key: "body_html",
                    resource: "Description",
                    default_language: emailData?.body,
                    translated: emailData?.translations?.body,
                },
            ].filter((item) => item.default_language),
        );
    }, [emailData]);

    useEffect(() => {
        if (actionData && "nextEmails" in actionData) {
            const nextEmails = exMenuData(actionData.nextEmails);
            // 在这里处理 nextEmails
            setMenuData(nextEmails);
            setEmailsData(actionData.nextEmails);
            setSelectEmailKey(actionData.nextEmails.nodes[0]?.resourceId);
        } else if (actionData && "previousEmails" in actionData) {
            const previousEmails = exMenuData(actionData.previousEmails);
            // 在这里处理 previousEmails
            setMenuData(previousEmails);
            setEmailsData(actionData.previousEmails);
            setSelectEmailKey(actionData.previousEmails.nodes[0]?.resourceId);
        } else {
            // 如果不存在 nextEmails，可以执行其他逻辑
        }
    }, [actionData]);

    useEffect(() => {
        if (confirmFetcher.data && confirmFetcher.data.data) {
            const errorItem = confirmFetcher.data.data.find((item: any) => {
                item.success === false;
            });
            if (!errorItem) {
                confirmFetcher.data.confirmData.forEach((item: any) => {
                    const index = emailsData.nodes.findIndex((option: any) => option.resourceId === item.resourceId);
                    if (index !== -1) {
                        const email = emailsData.nodes[index].translations.find((option: any) => option.key === item.key);
                        if (email) {
                            email.value = item.value;
                        } else {
                            emailsData.nodes[index].translations.push({
                                key: item.key,
                                value: item.value,
                                outdated: false,
                            });
                        }
                    }
                })
                message.success("Saved successfully");
            } else {
                message.error(errorItem?.errorMsg);
            }
            setConfirmData([]);
        }
        setConfirmLoading(false);
    }, [confirmFetcher.data]);

    const resourceColumns = [
        {
            title: t("Resource"),
            dataIndex: "resource",
            key: "resource",
            width: "10%",
        },
        {
            title: t("Default Language"),
            dataIndex: "default_language",
            key: "default_language",
            width: "45%",
            render: (_: any, record: TableDataType) => {
                return <ManageTableInput record={record} textarea={false} />;
            },
        },
        {
            title: t("Translated"),
            dataIndex: "translated",
            key: "translated",
            width: "45%",
            render: (_: any, record: TableDataType) => {
                return (
                    <ManageTableInput
                        record={record}
                        translatedValues={translatedValues}
                        setTranslatedValues={setTranslatedValues}
                        handleInputChange={handleInputChange}
                        textarea={false}
                    />
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
                    resourceId: emailsData.nodes.find(
                        (item: any) => item?.resourceId === selectEmailKey,
                    )?.resourceId,
                    locale: emailsData.nodes
                        .find((item: any) => item?.resourceId === selectEmailKey)
                        ?.translatableContent.find((item: any) => item.key === key)?.locale,
                    key: key,
                    value: value, // 初始为空字符串
                    translatableContentDigest: emailsData.nodes
                        .find((item: any) => item?.resourceId === selectEmailKey)
                        ?.translatableContent.find((item: any) => item.key === key)?.digest,
                    target: searchTerm || "",
                };

                return [...prevData, newItem]; // 将新数据添加到 confirmData 中
            }
        });
    };

    const transBeforeData = ({ emails }: { emails: any }) => {
        let data: EmailType = {
            handle: "",
            key: "",
            title: "",
            body: "",

            translations: {
                handle: "",
                key: "",
                title: "",
                body: "",

            },
        };
        const email = emails.nodes.find(
            (email: any) => email?.resourceId === selectEmailKey,
        );
        data.key = email?.resourceId;
        data.handle = email?.translatableContent.find(
            (item: any) => item.key === "handle",
        )?.value;
        data.title = email?.translatableContent.find(
            (item: any) => item.key === "title",
        )?.value;
        data.body = email?.translatableContent.find(
            (item: any) => item.key === "body_html",
        )?.value;

        data.translations.key = email?.resourceId;
        data.translations.title = email?.translations.find(
            (item: any) => item.key === "title",
        )?.value;
        data.translations.handle = email?.translations.find(
            (item: any) => item.key === "handle",
        )?.value;
        data.translations.body = email?.translations.find(
            (item: any) => item.key === "body_html",
        )?.value;

        return data;
    };

    const onPrevious = () => {
        const formData = new FormData();
        const startCursor = emailsData.pageInfo.startCursor;
        formData.append("startCursor", JSON.stringify(startCursor)); // 将选中的语言作为字符串发送
        submit(formData, {
            method: "post",
            action: `/app/manage_translation/email?language=${searchTerm}`,
        }); // 提交表单请求
    };

    const onNext = () => {
        const formData = new FormData();
        const endCursor = emailsData.pageInfo.endCursor;
        formData.append("endCursor", JSON.stringify(endCursor)); // 将选中的语言作为字符串发送
        submit(formData, {
            method: "post",
            action: `/app/manage_translation/email?language=${searchTerm}`,
        }); // 提交表单请求
    };

    const onClick = (e: any) => {
        // 更新选中的产品 key
        setSelectEmailKey(e.key);
    };

    const handleConfirm = () => {
        setConfirmLoading(true);
        const formData = new FormData();
        formData.append("confirmData", JSON.stringify(confirmData)); // 将选中的语言作为字符串发送
        confirmFetcher.submit(formData, {
            method: "post",
            action: `/app/manage_translation/email?language=${searchTerm}`,
        }); // 提交表单请求
    };

    const onCancel = () => {
        setIsVisible(false); // 关闭 Modal
        navigate(`/app/manage_translation?language=${searchTerm}`); // 跳转到 /app/manage_translation
    };

    return (
        <div>
            {emails.nodes.length ? (
                <Modal
                    open={isVisible}
                    onCancel={onCancel}
                    width={"100%"}
                    footer={[
                        <div
                            key={"footer_buttons"}
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                                marginTop: "-12px",
                                gap: "12px"        // 使用 gap 替代 marginRight
                            }}
                        >
                            <Button
                                key={"manage_cancel_button"}
                                onClick={onCancel}
                                style={{ marginRight: "10px" }}
                            >
                                {t("Cancel")}
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                key={"manage_confirm_button"}
                                type="primary"
                                disabled={confirmLoading || !confirmData.length}
                                loading={confirmLoading}
                            >
                                {t("Save")}
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
                        <Sider style={{ background: colorBgContainer }} width={200}>
                            <Menu
                                mode="inline"
                                defaultSelectedKeys={[emailsData.nodes[0]?.resourceId]}
                                defaultOpenKeys={["sub1"]}
                                style={{ height: "100%" }}
                                items={menuData}
                                // onChange={onChange}
                                selectedKeys={[selectEmailKey]}
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
            ) : (
                <Modal open={isVisible} footer={null} onCancel={onCancel}>
                    <Result
                        title="The specified fields were not found in the store.
  "
                        extra={
                            <Button type="primary" onClick={onCancel}>
                                OK
                            </Button>
                        }
                    />
                </Modal>
            )}
        </div>
    );
};

export default Index;
