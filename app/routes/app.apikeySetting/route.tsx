import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page,InlineGrid,Modal,TextField,Box,Text as PolarisText,Link as PolarisLink,Select,FormLayout,InlineStack    } from "@shopify/polaris";
import { Button, Card, Input, message, Skeleton, Space, Typography } from "antd";
import { json, Link, useFetcher, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  ArrowLeftIcon
} from '@shopify/polaris-icons';
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { DeleteUserData, GetUserData, SavePrivateKey,VerifyAPIkey } from "~/api/JavaServer";
import { useEffect, useState, useRef } from "react";
import styles from './styles.module.css';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import ApiCard from "./components/ApiCard";

const { Title, Text } = Typography;

export interface GLossaryDataType {
  key: number;
  sourceText: string;
  targetText: string;
  language: string;
  rangeCode: string;
  type: number;
  status: number;
  loading: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log(`${shop} load apikeySetting`);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  console.log("adminAuthResult.session",adminAuthResult.session);
  
  const { shop,accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const updateUserAPIKey = JSON.parse(formData.get("updateUserAPIKey") as string);
    const deleteUserAPIKey = JSON.parse(formData.get("deleteUserAPIKey") as string);
    const testUserAPIKey = JSON.parse(formData.get('testUserAPIKey') as string);
    const checkUserAPIKey = JSON.parse(formData.get('checkUserAPIKey') as string);
    switch (true) {
      case !!loading:
        try {
          // 获取所有 API 的配置
          const apiNames = [0, 1, 2, 3]; // 对应 google, openai, deepl, deepseek
          const results = await Promise.all(
            apiNames.map((apiName) =>
              GetUserData({
                shop,
                apiName,
              })
            )
            );
            return json({ data: results });
        } catch (error) {
          console.error("Error apiKeySetting loading:", error);
          return json({ data: [], error: 'Failed to load data' });
        }
      case !!updateUserAPIKey:
        try {
          const { apiKey, count,modelVersion,keywords,apiName,apiStatus,isSelected } = updateUserAPIKey;
          const countNum = Number(count);
          if (isNaN(countNum) || countNum < 0) {
            return json({ success: false, error: "Invalid quota value" }, { status: 400 });
          }
          const data = await SavePrivateKey({ shop, apiKey, count,modelVersion,keywords,apiName,apiStatus,isSelected, });
          return json({ data });
        } catch (error) {
          console.error("Error apiKeySetting action:", error);
        }
      case !!testUserAPIKey:
        try{
          const {content,apikey} = testUserAPIKey;
          // const data = await TestUserApiKey({content,apikey});
          const p = new Promise((resolve,reject)=>{
            setTimeout(() => {
              resolve('翻译成功');
            }, 3000);
          })
          p.then((val)=>{
            console.log(val);
          })
          shopify.toast.show('翻译完成');
        }
        catch(error){
          shopify.toast.show('翻译失败');
          console.error("Error apiKeySetting action:", error);
        }
      case !!checkUserAPIKey:
        try{
          const {apikey,apiName} = checkUserAPIKey;
          const data = await VerifyAPIkey({shopName:shop,accessToken:accessToken,target:['sr'],source: "en",isCover:false,translateSettings1:apiName,translateSettings2:'1',translateSettings3:["products"]});
          const p = new Promise((resolve,reject)=>{
            setTimeout(() => {
              resolve('apikey有效');
            }, 3000);
          })
          const result = await p; // 等待 Promise 完成
          return json({ success: true, message: result }); // 返回校验结果
        }
        catch(error){
          console.error("Error apiKeySetting action:", error);
        }
      case !!deleteUserAPIKey:
        try {
          const data = await DeleteUserData({
            shop,
          });
          return json({ data: data });
        } catch (error) {
          console.error("Error apiKeySetting action:", error);
        }
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action apiKeySetting:", error);
  }
};

const Index = () => {
  const [apiKeyError, setApiKeyError] = useState(false);
  const [countError, setCountError] = useState(false); 
  const [keywordsError, setkeywordsError] = useState(false); 
  const [apiKeyErrorMsg, setApiKeyErrorMsg] = useState<string>(" The API key format is incorrect");
  const [tempApiKey, setTempApiKey] = useState<string>(""); // 模态框临时 API 密钥
  const [tempLimit, setTempLimit] = useState<string>(""); // 模态框临时额度
  const [tempKeyWords, setTempKeyWords] = useState<string>(''); // 模态框临时额度
  const loadingfetcher = useFetcher<any>();
  const updateUserAPIKeyfetcher = useFetcher<any>();
  const testApiKeyfetcher = useFetcher<any>();
  const checkAPIKeyfetcher = useFetcher<any>();
  const deleteUserAPIKeyfetcher = useFetcher<any>();
  type ServiceId = 'google' | 'openai';
  // 测试模态框依赖的数据
  const [active, setActive] = useState(false);
  const [content, setContent] = useState("");
  const [translation, setTranslation] = useState("");
  const [apiChoice, setApiChoice] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const handleTestModalClose = () => setActive(false);

  
  interface ServiceConfig {
    apiKey: string;
    limit: string;
    keywords: string;
    modelVersion?: string;
    apiStatus:boolean;
    usedToken: number;
  }
  const apiConfigs:{ id: ServiceId; title: string}[]  = [
    {
      id: 'google',
      title: 'Google Cloud Translate',
    },
    {
      id: 'openai',
      title: 'Open AI/ChatGPT',
    },
    // {
    //   id: 'deepl',
    //   title: 'DeepL Translate（不支持HTML翻译）',
    // },
    // {
    //   id: 'deepseek',
    //   title: 'DeepSeek Translate',
    // },
  ];
  const initialConfigs: Record<ServiceId, ServiceConfig>  = {
    google: {
      apiKey: '',
      limit: '未生效', 
      keywords: '' ,
      apiStatus: false,
      usedToken: 0,
    },
    openai: {
      apiKey: '',
      limit: '未生效',
      keywords: 'Translate the following content into {language} .Only output the final correct translation', 
      modelVersion: 'gpt-4o' ,
      apiStatus: false,
      usedToken: 0,
    },
    // deepl: {
    //   apiKey: '',
    //   limit: '未生效',
    //   keywords: '',
    //   apiStatus: false,
    //   usedToken: 0,
    // },
    // deepseek: {
    //   apiKey: '',
    //   limit: '未生效',
    //   keywords: 'Translate the following content into {language} .Only output the final correct translation',
    //   apiStatus: false,
    //   usedToken: 0,
    // }
  };
  const chatGptVersions = [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4.1', value: 'gpt-4.1' },
  ];
  const apiNames = {'google':{apiName:0},'openai':{apiName:1},'deepl':{apiName:2},'deepseek':{apiName:3}}
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apis, setApis] = useState(apiConfigs);
  const [userApiConfigs, setUserApiConfigs] = useState<Record<ServiceId, ServiceConfig>>(initialConfigs);
  const [activeModal, setActiveModal] = useState<ServiceId>('google'); //当前操作的模型
  const [modalOpen, setModalOpen] = useState(false);
  const [tempModelVersion, setTempModelVersion] = useState<string>('');

  const handleConfigure = (id: ServiceId) => {
    if (isLoading) {
      shopify.toast.show(t('数据正在加载，请稍后重试'), { duration: 3000 });
      return;
    }
    // 打开配置模态框
    setActiveModal(id);
    setModalOpen(true);
    setTempApiKey(userApiConfigs[id].apiKey);
    setTempLimit(userApiConfigs[id].limit === '未生效' ? '' : userApiConfigs[id].limit);
    console.log(userApiConfigs[id]);
    
    setTempModelVersion(userApiConfigs[id].modelVersion || 'gpt-4o');
    setTempKeyWords(userApiConfigs[id].keywords || 'Translate the following content into {language} .Only output the final correct translation')
  };
  const handleClose = () => {
    setActiveModal('google');
    setModalOpen(false);
    setApiKeyError(false);
    setCountError(false);
  };
  const handleTestApi = (id: ServiceId)=>{
    if (!userApiConfigs[id].apiKey) {
      shopify.toast.show("请先配置API Key");
      return;
    }
    setActive(true);
    setContent('');
    setTempApiKey(userApiConfigs[id].apiKey);
  }
  const handleTranslate = () => {
    // 测试api翻译接口逻辑
    if (!content) {
      shopify.toast.show('输入测试内容')
    }
    testApiKeyfetcher.submit({
      testUserAPIKey: JSON.stringify({ 
        content,
        apikey:tempApiKey
       }),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    })
  };
  const handleChangeStats=(val:boolean)=>{
    
  };
  // 弹窗确认函数
  const handleConfirm = () => {
    if (!tempApiKey || tempApiKey.length < 30) {
      setApiKeyError(true);
      setApiKeyErrorMsg(t("The API key format is incorrect"));
      return;
    }
    setApiKeyError(false);
    const countNum = Number(tempLimit);
    if (isNaN(countNum) || countNum <= 0 || countNum > 2147483647) {
      setCountError(true);
      return;
    }
    setCountError(false);
    // if ((activeModal === 'deepseek'|| activeModal === 'openai') && !tempKeyWords) {
    //   setkeywordsError(true);
    //   return;
    // }
    if ((activeModal === 'openai') && !tempKeyWords) {
      setkeywordsError(true);
      return;
    }
    setkeywordsError(false);
    // apikey校验是否有效
    checkAPIKeyfetcher.submit({
      checkUserAPIKey:JSON.stringify({
        apikey:tempApiKey,
        apiName:apiNames[activeModal].apiName,
      })
    },{
      method:"POST",
      action:"/app/apikeySetting"
    })
  };
  useEffect(()=>{
    if (checkAPIKeyfetcher.data) {
    if (checkAPIKeyfetcher.data.success) {
      // 校验成功，触发更新请求
      shopify.toast.show(t('API 密钥校验成功'), { duration: 3000 });
      updateUserAPIKeyfetcher.submit({
        updateUserAPIKey: JSON.stringify({ 
          apiName: apiNames[activeModal].apiName,
          apiStatus: true,
          isSelected: false,
          apiKey: tempApiKey,
          count: tempLimit,
          keywords: tempKeyWords,
          ...(activeModal === 'openai' && { modelVersion: tempModelVersion }),
        }),
      }, {
        method: "POST",
        action: "/app/apikeySetting",
      });
    } else {
      // 校验失败，显示错误
      setApiKeyError(true);
      setApiKeyErrorMsg(t('API 密钥无效'));
      shopify.toast.show(t('API 密钥校验失败'), { duration: 3000 });
    }
  }
  },[checkAPIKeyfetcher.data])
  useEffect(() => {
    loadingfetcher.submit({
      loading: JSON.stringify(true),
    }, {
      method: "POST",
      action: "/app/apikeySetting",
    });
  }, []);

  useEffect(() => {    
    if (loadingfetcher.state === 'idle' && loadingfetcher.data) {
      setIsLoading(false);
      console.log(loadingfetcher.data.data);
      
      if (loadingfetcher.data.data && Array.isArray(loadingfetcher.data.data)) {
        // const apiNameToId : Record<number, ServiceId> = { 0: 'google', 1: 'openai', 2: 'deepl', 3: 'deepseek' };
        const apiNameToId : Record<number, ServiceId> = { 0: 'google', 1: 'openai'};
        // 更新 userApiConfigs
        setUserApiConfigs((prevConfigs) => {
          const newConfigs = { ...prevConfigs };
          loadingfetcher.data.data.forEach((response: any) => {
            if (response?.success) {
              const serviceId = apiNameToId[response.response.apiName];
              if (serviceId) {
                newConfigs[serviceId] = {
                  ...prevConfigs[serviceId],
                  apiKey: response.response.apiKey || '',
                  limit: response.response.tokenLimit ? String(response.response.tokenLimit) : '未生效',
                  keywords: response.response.promptWord || prevConfigs[serviceId].keywords,
                  ...(serviceId === 'openai' && {
                    modelVersion: response.response.apiModel || prevConfigs[serviceId].modelVersion,
                  }),
                  usedToken: response.response.usedToken || 0,
                  apiStatus:response.response.apiStatus || false,
                };
              }
            }
          });
          return newConfigs;
        });
      }
    }else if (loadingfetcher.state === 'loading' || loadingfetcher.state === 'submitting') {
      setIsLoading(true);
    }
  }, [loadingfetcher.data,loadingfetcher.state]);

  useEffect(() => {
    if (updateUserAPIKeyfetcher.data) {
      // 根据当前加载的模型关闭编辑状态
      if (updateUserAPIKeyfetcher.data.data.success) {
        setUserApiConfigs((prevConfigs) => ({
          ...prevConfigs,
          [activeModal]: {
            ...prevConfigs[activeModal],
            limit: updateUserAPIKeyfetcher.data.data.response.tokenLimit || prevConfigs[activeModal].limit,
            apiKey: updateUserAPIKeyfetcher.data.data.response.apiKey || prevConfigs[activeModal].apiKey,
            ...(activeModal === 'openai' && {
              modelVersion: updateUserAPIKeyfetcher.data.data.response.apiModel || 'gpt-4o',
            }),
            keywords:updateUserAPIKeyfetcher.data.data.response.promptWord || prevConfigs[activeModal].keywords,
            usedToken: updateUserAPIKeyfetcher.data.data.response.usedToken || prevConfigs[activeModal].usedToken,
            apiStatus:updateUserAPIKeyfetcher.data.data.response.apiStatus || prevConfigs[activeModal].apiStatus,
          },
        }));
        handleClose();
        shopify.toast.show(t("配置成功"));
        handleChangeStats(true)
      } else {
        handleChangeStats(false)
        setUserApiConfigs((prevConfigs) => ({
          ...prevConfigs,
          [activeModal]: {
            ...prevConfigs[activeModal],
            apiKey: '',
            limit: '未生效',
            keywords:'',
          },
        }));
        setApiKeyError(true);
        setApiKeyErrorMsg(t("The API key is not valid"));
      }
    }
  }, [updateUserAPIKeyfetcher.data]);

  // useEffect(() => {
  //   if (deleteUserAPIKeyfetcher?.data) {
  //     if (deleteUserAPIKeyfetcher?.data?.data?.success) {
  //       setUserData(deleteUserAPIKeyfetcher?.data?.data?.response);
  //       setUserData({
  //         ...userData,
  //         googleKey: "",
  //         amount: 0,
  //       });
  //       shopify.toast.show(t("Delete successfully"));
  //     } else {
  //       shopify.toast.show(t("Delete failed"));
  //     }
  //   }
  // }, [deleteUserAPIKeyfetcher.data]);

  // const handleDelete = () => {
  //   deleteUserAPIKeyfetcher.submit({
  //     deleteUserAPIKey: JSON.stringify(true),
  //   }, {
  //     method: "POST",
  //     action: "/app/apikeySetting",
  //   });
  // };


  return (
    <Page>
      <TitleBar title={t("Translate Settings")} >
        <button variant="breadcrumb" onClick={() => navigate("/app/translate")}>{t("Translate Store")}</button>
        <button variant="breadcrumb">{t("Translate Settings")}</button>
      </TitleBar>
      <ScrollNotice text={t("Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.")} />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              type="text"
              variant="outlined"
              onClick={() => navigate("/app/translate")}
              style={{ padding: "4px" }}
            >
              <Icon
                source={ArrowLeftIcon}
                tone="base"
              />
            </Button>
            <Title style={{ fontSize: "1.25rem", margin: "0" }}>
              {t("Translate Settings")}
            </Title>
          </div>
        </div>
        {/* <div>
          <Text style={{ marginLeft: "8px" }}>{t("How to translate with api key? Please refer to")}</Text><Link to="https://ciwi.bogdatech.com/help/uncategorized/how-to-use-your-own-key-for-translation/" target="_blank" rel="noreferrer">{t("the Private API Translation Model User Manual")}</Link>
        </div> */}

          {/* <Skeleton.Button active style={{ height: "176px" }} block /> */}
        
        {/* <div style={{ marginLeft: "8px" }} >
          <Text >{t("When using this feature, we only consume the quota of the corresponding interface and will not charge any additional fees. To avoid exceeding the third-party API quota limits and incurring charges, please set the quota limits carefully.")}</Text>
        </div> */}
        <InlineGrid gap="800" columns={{ xs: 1, sm: 2, md: 2, lg: 2 }}>
          {apis.map(api => (
            <ApiCard
              key={api.id}
              title={api.title}
              isLoading={isLoading}
              apiStatus={userApiConfigs[api.id].apiStatus}
              limit={userApiConfigs[api.id].limit!=='未生效'?`${userApiConfigs[api.id].usedToken}/${userApiConfigs[api.id].limit}`:'未生效' }
              onConfigure={() => handleConfigure(api.id)}
              onTestApi={()=>handleTestApi(api.id)}
            />
          ))}
        </InlineGrid>
        {/* 弹出层 */}
        <Modal
          open={modalOpen}
          onClose={handleClose}
          title="配置 API"
          primaryAction={{
            content: '确认',
            onAction: handleConfirm,
            loading: updateUserAPIKeyfetcher.state === "submitting",
          }}
        >
          <Modal.Section>
            {activeModal === 'openai' && (
                <Box paddingBlockEnd="300">
                  <Select
                    label="ChatGPT 版本"
                    options={chatGptVersions}
                    onChange={(val) => setTempModelVersion(val)}
                    value={tempModelVersion}
                  />
                </Box>
              )}
            <TextField
              label={
                <>
                  API Key{' '}
                  <PolarisText as="span" tone="subdued">
                    &nbsp;&nbsp;note：
                    <PolarisLink url="https://ciwi.bogdatech.com/help/uncategorized/how-to-use-your-own-key-for-translation/" target="_blank">
                      如何获取 API KEY？
                    </PolarisLink>
                  </PolarisText>
                </>
              }
              value={tempApiKey}
              placeholder={t("Please enter API Key")}
              onChange={(val) => setTempApiKey(val)}
              autoComplete="off"
            />
              <div style={{
                visibility:  apiKeyError ? 'visible' : 'hidden',
                marginBottom: '4px'
              }}>
                <Text type="danger">
                  <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                  {apiKeyErrorMsg}
                </Text>
              </div>
            <Box>
              <TextField
                label="额度设置"
                type="number"
                placeholder={t("Please set limit")}
                value={tempLimit}
                onChange={(val) => setTempLimit(val)}
                autoComplete="off" 
              />
            </Box>
              <div style={{
                visibility: countError ? 'visible' : 'hidden',
              }}>
                <Text type="danger">
                  <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                  {t('Quota must be a positive number')}
                </Text>
              </div>
              
            {(activeModal === "openai") && (
              <TextField
                label="提示词设置"
                value={tempKeyWords}
                onChange={setTempKeyWords}
                multiline={4}
                autoComplete="off"
              />
            )}
            <div style={{
                visibility:  keywordsError ? 'visible' : 'hidden',
                marginBottom: '4px'
            }}>
              <Text type="danger">
                <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                <span>填写提示词</span>
              </Text>
            </div>  
          </Modal.Section>
        </Modal>
        <Modal
          open={active}
          onClose={handleTestModalClose}
          title="测试API(测试会消耗对应的额度)"
          primaryAction={{
            content: "翻译",
            onAction: handleTranslate,
            loading:testApiKeyfetcher.state === 'submitting'
          }}
          secondaryActions={[
            {
              content: "取消",
              onAction: handleTestModalClose,
            },
          ]}
        >
          <Modal.Section> 
            <InlineStack align="center" blockAlign="center">
              <FormLayout>
                <Box width="500px">
                  <TextField
                    label="测试内容"
                    value={content}
                    onChange={setContent}
                    autoComplete="off"
                    placeholder="请输入内容"
                    multiline={4} // 4 行高度
                  />
                  <TextField
                    label="翻译结果"
                    value={translation}
                    onChange={setTranslation}
                    readOnly
                    placeholder="翻译结果将显示在这里"
                    autoComplete="off"
                    multiline={4} // 4 行高度
                  />
                  <TextField
                    label="API"
                    value={tempApiKey}
                    // onChange={setApiChoice}
                    autoComplete="off"
                    placeholder="选择API"
                  />
                </Box>
              </FormLayout>
            </InlineStack >
          </Modal.Section>
        </Modal>
      </Space>
    </Page>
  );
};

export default Index;
