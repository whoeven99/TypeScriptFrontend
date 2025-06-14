import {
    Button,
    Layout,
    Menu,
    MenuProps,
    Result,
    Spin,
    Table,
    theme,
    Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
    useActionData,
    useFetcher,
    useLoaderData,
    useLocation,
    useNavigate,
    useSearchParams,
    useSubmit,
} from "@remix-run/react"; // 引入 useNavigate
import { FullscreenBar, Pagination, Select } from "@shopify/polaris";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
    queryNextTransType,
    queryPreviousTransType,
} from "~/api/admin";
import { ConfirmDataType, SingleTextTranslate, updateManageTranslation } from "~/api/JavaServer";
import ManageTableInput from "~/components/manageTableInput";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";
import { SessionService } from "~/utils/session.server";
import { useDispatch, useSelector } from "react-redux";
import { Modal } from "@shopify/app-bridge-react";
import { setTableData } from "~/store/modules/languageTableData";
import { setUserConfig } from "~/store/modules/userConfig";
import { ShopLocalesType } from "../app.language/route";

const { Sider, Content } = Layout;

const { Text } = Typography;

interface EmailType {
    key: string;
    handle: {
        value: string;
        type: string;
    };
    title: {
        value: string;
        type: string;
    };
    body: {
        value: string;
        type: string;
    };
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
    type: string | undefined;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
    // 如果没有 language 参数，直接返回空数据
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get("language");

    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;

    console.log(`${shop} load manage_translation_email`);

    try {
        const emails = await queryNextTransType({
            shop,
            accessToken: accessToken as string,
            resourceType: "EMAIL_TEMPLATE",
            endCursor: "",
            locale: searchTerm || "",
        });

        return json({
            server: process.env.SERVER_URL,
            shopName: shop,
            searchTerm,
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

    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;

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
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { searchTerm, emails, server, shopName } =
        useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();
    const { t } = useTranslation();

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const languageTableData = useSelector((state: any) => state.languageTableData.rows);
    const submit = useSubmit(); // 使用 useSubmit 钩子
    const languageFetcher = useFetcher<any>();
    const confirmFetcher = useFetcher<any>();

    const isManualChange = useRef(true);
    const loadingItemsRef = useRef<string[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(() => {
        return !!searchParams.get('language');
    });

    const [menuData, setMenuData] = useState<MenuProps["items"]>([]);
    const [emailsData, setEmailsData] = useState(emails);
    const [emailData, setEmailData] = useState<EmailType>();
    const [resourceData, setResourceData] = useState<TableDataType[]>([]);
    const [selectEmailKey, setSelectEmailKey] = useState(
        emails.nodes[0]?.resourceId,
    );
    const [confirmData, setConfirmData] = useState<ConfirmDataType[]>([]);
    const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
    const [loadingItems, setLoadingItems] = useState<string[]>([]);
    const [translatedValues, setTranslatedValues] = useState<{
        [key: string]: string;
    }>({});
    const itemOptions = [
        { label: t("Products"), value: "product" },
        { label: t("Collection"), value: "collection" },
        { label: t("Theme"), value: "theme" },
        { label: t("Shop"), value: "shop" },
        { label: t("Store metadata"), value: "metafield" },
        { label: t("Articles"), value: "article" },
        { label: t("Blog titles"), value: "blog" },
        { label: t("Pages"), value: "page" },
        { label: t("Filters"), value: "filter" },
        { label: t("Metaobjects"), value: "metaobject" },
        { label: t("Navigation"), value: "navigation" },
        { label: t("Email"), value: "email" },
        { label: t("Delivery"), value: "delivery" },
        { label: t("Shipping"), value: "shipping" },
    ]
    const [languageOptions, setLanguageOptions] = useState<{ label: string; value: string }[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(searchTerm || "");
    const [selectedItem, setSelectedItem] = useState<string>("email");
    const [hasPrevious, setHasPrevious] = useState<boolean>(
        emailsData.pageInfo.hasPreviousPage || false
    );
    const [hasNext, setHasNext] = useState<boolean>(
        emailsData.pageInfo.hasNextPage || false
    );

    useEffect(() => {
        if (languageTableData.length === 0) {
            languageFetcher.submit({
                language: JSON.stringify(true),
            }, {
                method: "post",
                action: "/app/manage_translation",
            });
        }
        if (emails) {
            setMenuData(exMenuData(emails));
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadingItemsRef.current = loadingItems;
    }, [loadingItems]);

    useEffect(() => {
        if (languageTableData) {
            setLanguageOptions(languageTableData
                .filter((item: any) => !item.primary)
                .map((item: any) => ({
                    label: item.language,
                    value: item.locale,
                })));
        }
    }, [languageTableData])

    useEffect(() => {
        if (emails && isManualChange.current) {
            setEmailsData(emails);
            setMenuData(exMenuData(emails));
            setSelectEmailKey(emails.nodes[0]?.resourceId);
            setTimeout(() => {
                setIsLoading(false);
            }, 100);
            isManualChange.current = false; // 重置
        }
    }, [emails]);

    useEffect(() => {
        const data = transBeforeData({
            emails: emailsData,
        });
        setEmailData(data);
        setConfirmData([]);
        setTranslatedValues({});
        setHasPrevious(emailsData.pageInfo.hasPreviousPage);
        setHasNext(emailsData.pageInfo.hasNextPage);
        setLoadingItems([]);
    }, [selectEmailKey, emailsData]);

    useEffect(() => {
        setResourceData(
            [
                {
                    key: "title",
                    resource: "Title",
                    default_language: emailData?.title?.value,
                    translated: emailData?.translations?.title,
                    type: emailData?.title?.type,
                },
                {
                    key: "body_html",
                    resource: "Description",
                    default_language: emailData?.body?.value,
                    translated: emailData?.translations?.body,
                    type: emailData?.body?.type,
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
        setIsVisible(!!searchParams.get('language'));
    }, [location]);

    useEffect(() => {
        if (confirmFetcher.data && confirmFetcher.data.data) {
            const successfulItem = confirmFetcher.data.data.filter((item: any) =>
                item.success === true
            );
            const errorItem = confirmFetcher.data.data.filter((item: any) =>
                item.success === false
            );

            successfulItem.forEach((item: any) => {
                const index = emailsData.nodes.findIndex((option: any) => option.resourceId === item.data.resourceId);
                if (index !== -1) {
                    const email = emailsData.nodes[index].translations.find((option: any) => option.key === item.data.key);
                    if (email) {
                        email.value = item.data.value;
                    } else {
                        emailsData.nodes[index].translations.push({
                            key: item.data.key,
                            value: item.data.value,
                        });
                    }
                }
            })
            if (errorItem.length == 0) {
                shopify.toast.show(t("Saved successfully"));
            } else {
                shopify.toast.show(t("Some items saved failed"));
            }
            setConfirmData([]);
        }
        setConfirmLoading(false);
    }, [confirmFetcher.data]);

    useEffect(() => {
        if (languageFetcher.data) {
            if (languageFetcher.data.data) {
                const shopLanguages = languageFetcher.data.data;
                dispatch(setTableData(shopLanguages.map((language: ShopLocalesType, index: number) => ({
                    key: index,
                    language: language.name,
                    locale: language.locale,
                    primary: language.primary,
                    published: language.published,
                }))));
                const locale = shopLanguages.find(
                    (language: ShopLocalesType) => language.primary === true,
                )?.locale;
                dispatch(setUserConfig({ locale: locale || "" }));
            }
        }
    }, [languageFetcher.data]);

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
            width: "40%",
            render: (_: any, record: TableDataType) => {
                return <ManageTableInput record={record} />;
            },
        },
        {
            title: t("Translated"),
            dataIndex: "translated",
            key: "translated",
            width: "40%",
            render: (_: any, record: TableDataType) => {
                return (
                    <ManageTableInput
                        record={record}
                        translatedValues={translatedValues}
                        setTranslatedValues={setTranslatedValues}
                        handleInputChange={handleInputChange}
                        isRtl={searchTerm === "ar"}
                    />
                );
            },
        },
        {
            title: t("Translate"),
            width: "10%",
            render: (_: any, record: TableDataType) => {
                return (
                    <Button
                        type="primary"
                        onClick={() => {
                            handleTranslate("EMAIL_TEMPLATE", record?.key || "", record?.type || "", record?.default_language || "");
                        }}
                        loading={loadingItems.includes(record?.key || "")}
                    >
                        {t("Translate")}
                    </Button>
                );
            },
        },
    ];

    const exMenuData = (emails: any) => {
        const data = emails.nodes.map((email: any) => ({
            key: email?.resourceId,
            label: email?.translatableContent.find(
                (item: any) => item.key === "title",
            ).value,
        }));
        return data;
    };

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
            key: "",
            handle: {
                value: "",
                type: "",
            },
            title: {
                value: "",
                type: "",
            },
            body: {
                value: "",
                type: "",
            },
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
        data.handle = {
            value: email?.translatableContent.find(
                (item: any) => item.key === "handle",
            )?.value,
            type: email?.translatableContent.find(
                (item: any) => item.key === "handle",
            )?.type,
        };
        data.title = {
            value: email?.translatableContent.find(
                (item: any) => item.key === "title",
            )?.value,
            type: email?.translatableContent.find(
                (item: any) => item.key === "title",
            )?.type,
        };
        data.body = {
            value: email?.translatableContent.find(
                (item: any) => item.key === "body_html",
            )?.value,
            type: email?.translatableContent.find(
                (item: any) => item.key === "body_html",
            )?.type,
        };

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

    const handleTranslate = async (resourceType: string, key: string, type: string, context: string) => {
        if (!key || !type || !context) {
            return;
        }
        setLoadingItems((prev) => [...prev, key]);
        const data = await SingleTextTranslate({
            shopName: shopName,
            source: emailsData.nodes
                .find((item: any) => item?.resourceId === selectEmailKey)
                ?.translatableContent.find((item: any) => item.key === key)
                ?.locale,
            target: searchTerm || "",
            resourceType: resourceType,
            context: context,
            key: key,
            type: type,
            server: server || "",
        });
        if (data?.success) {
            if (loadingItemsRef.current.includes(key)) {
                handleInputChange(key, data.response)
                shopify.toast.show(t("Translated successfully"))
            }
        } else {
            shopify.toast.show(data.errorMsg)
        }
        setLoadingItems((prev) => prev.filter((item) => item !== key));
    }

    const handleLanguageChange = (language: string) => {
        setIsLoading(true);
        isManualChange.current = true;
        setSelectedLanguage(language);
        navigate(`/app/manage_translation/email?language=${language}`);
    }

    const handleItemChange = (item: string) => {
        setIsLoading(true);
        isManualChange.current = true;
        setSelectedItem(item);
        navigate(`/app/manage_translation/${item}?language=${searchTerm}`);
    }

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
        navigate(`/app/manage_translation?language=${searchTerm}`, {
            state: { key: searchTerm },
        }); // 跳转到 /app/manage_translation
    };

    return (
        <Modal
            id="manage-modal"
            variant="max"
            open={isVisible}
            onHide={onCancel}
        >
            <FullscreenBar onAction={onCancel}>
                <div
                    style={{
                        display: 'flex',
                        flexGrow: 1,
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingLeft: '1rem',
                        paddingRight: '1rem',
                    }}
                >
                    <div style={{ marginLeft: '1rem', flexGrow: 1 }}>
                        <Text>
                            {t("Email")}
                        </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 2, justifyContent: 'center' }}>
                        <div
                            style={{
                                width: "150px",
                            }}
                        >
                            <Select
                                label={""}
                                options={languageOptions}
                                value={selectedLanguage}
                                onChange={(value) => handleLanguageChange(value)}
                            />
                        </div>
                        <div
                            style={{
                                width: "150px",
                            }}
                        >
                            <Select
                                label={""}
                                options={itemOptions}
                                value={selectedItem}
                                onChange={(value) => handleItemChange(value)}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 1, justifyContent: 'flex-end' }}>
                        <Button
                            type="primary"
                            onClick={handleConfirm}
                            disabled={confirmLoading || !confirmData.length}
                            loading={confirmLoading}
                        >
                            {t("Save")}
                        </Button>
                    </div>
                </div>
            </FullscreenBar>
            <Layout
                style={{
                    padding: "24px 0",
                    height: 'calc(100vh - 64px)',
                    overflow: 'auto',
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG,
                }}
            >
                {isLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><Spin /></div>
                ) : emails.nodes.length ? (
                    <>
                        <Sider
                            style={{
                                background: colorBgContainer,
                                height: 'calc(100vh - 124px)',
                                width: '200px',
                                minHeight: '70vh',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'auto',
                            }}
                        >
                            <Menu
                                mode="inline"
                                defaultSelectedKeys={[emailsData.nodes[0]?.resourceId]}
                                defaultOpenKeys={["sub1"]}
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    minHeight: 0,
                                }}
                                items={menuData}
                                selectedKeys={[selectEmailKey]}
                                onClick={(e: any) => {
                                    setSelectEmailKey(e.key);
                                }}
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
                        <Content
                            style={{
                                padding: "0 24px",
                                height: 'calc(100vh - 112px)', // 64px为FullscreenBar高度
                                overflow: 'auto',
                                minHeight: '70vh',
                            }}
                        >
                            <Table
                                columns={resourceColumns}
                                dataSource={resourceData}
                                pagination={false}
                            />
                        </Content>
                    </>
                ) : (
                    <Result
                        title={t("The specified fields were not found in the store.")}
                        extra={
                            <Button type="primary" onClick={onCancel}>
                                {t("Yes")}
                            </Button>
                        }
                    />
                )}
            </Layout>
        </Modal>
    );
};

export default Index;
