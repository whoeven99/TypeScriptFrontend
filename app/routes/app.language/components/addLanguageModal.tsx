import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Input, Table, Space, message, Button, InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import SelectedTag from "../../../components/selectedTag";
import {
  AllLanguagesType,
  LanguagesDataType,
  ShopLocalesType,
} from "~/routes/app.language/route";
import { FetcherWithComponents } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { updateTableData } from "~/store/modules/languageTableData";
import { useTranslation } from "react-i18next";
import { useFetcher } from "@remix-run/react";

interface LanguageModalProps {
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  allLanguages: AllLanguagesType[];
  languageLocaleInfo: any;
  primaryLanguage: ShopLocalesType | undefined;
}

interface AddLanguageType {
  key: number;
  isoCode: string;
  src: string[] | null;
  name: string;
  state: string;
}

const AddLanguageModal: React.FC<LanguageModalProps> = ({
  isVisible,
  setIsModalOpen,
  allLanguages,
  languageLocaleInfo,
  primaryLanguage,
}) => {
  const updatedLocales = allLanguages
    .filter((lang) => lang.isoCode != primaryLanguage?.locale)
    .map((item) => item.isoCode);
  const addLanguages: AddLanguageType[] = useMemo(() => allLanguages
    .filter((lang) => lang.isoCode != primaryLanguage?.locale)
    .map((lang, i) => ({
      key: lang.key,
      isoCode: lang.isoCode,
      src: languageLocaleInfo[updatedLocales[i]]
        ? languageLocaleInfo[updatedLocales[i]]?.countries
        : [],
      name: `${lang.name}(${languageLocaleInfo[updatedLocales[i]]?.Local})`,
      state: "", // 默认值为 false
    })), [allLanguages, languageLocaleInfo, primaryLanguage]);
  const [allSelectedKeys, setAllSelectedKeys] = useState<React.Key[]>([]); // 保存所有选中的key
  const [searchInput, setSearchInput] = useState("");
  const [filteredLanguages, setFilteredLanguages] =
    useState<AddLanguageType[]>(addLanguages);
  const [allSelectedLanguage, setAllSelectedLanguage] = useState<
    AllLanguagesType[]
  >([]); // 保存选中的语言对象
  const [confirmButtonDisable, setConfirmButtonDisable] =
    useState<boolean>(false);
  const selectedLanguage: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );
  const dispatch = useDispatch();
  const searchRef = useRef<InputRef>(null);
  const addFetcher = useFetcher<any>();
  const { t } = useTranslation();

  const selectedLanguagesSet = new Set(
    selectedLanguage.map((lang) => lang.locale),
  );

  useEffect(() => {
    if (addFetcher.data && addFetcher.data.data.length) {
      const data = addFetcher.data.data.map((lang: any, i: any) => ({
        language: lang.name,
        localeName: languageLocaleInfo[addFetcher.data.data[i].locale].Local,
        locale: lang.locale,
        primary: lang.primary,
        status: 0,
        auto_update_translation: false,
        published: lang.published,
        loading: false,
      }));
      dispatch(updateTableData(data));
      message.success(t("Add success"));
    }
    setIsModalOpen(false);
    setConfirmButtonDisable(false);
  }, [addFetcher.data]);

  useEffect(() => {
    // 更新语言状态
    const updatedLanguages = addLanguages.map((lang) => {
      if (selectedLanguagesSet.has(lang.isoCode)) {
        // 检查是否是默认语言
        const isPrimary = selectedLanguage.some(
          (sl) => sl.locale === lang.isoCode && sl.primary,
        );
        return { ...lang, state: isPrimary ? "Primary" : "Added" }; // 根据 primary 设置状态
      }
      return { ...lang, state: "" }; // 其他语言的默认状态
    });

    // 根据状态排序
    const sortedFilteredLanguages = updatedLanguages.sort((a, b) => {
      const aSelected = selectedLanguagesSet.has(a.isoCode) ? 1 : -1; // 将已选语言放前面
      const bSelected = selectedLanguagesSet.has(b.isoCode) ? 1 : -1;
      return aSelected - bSelected;
    });

    // 更新过滤后的语言状态
    setFilteredLanguages(sortedFilteredLanguages);
  }, [allLanguages, isVisible]);

  useEffect(() => {
    const addedCurrencies = allSelectedKeys
      .map((key) => addLanguages.find((lang) => lang.key === key))
      .filter(Boolean) as AllLanguagesType[];

    setAllSelectedLanguage(addedCurrencies);
  }, [allSelectedKeys]);

  useEffect(() => {
    if (addLanguages) {
      handleSearch({ target: { value: searchRef.current?.input?.value } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [addLanguages]);

  // 搜索逻辑
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if(value === undefined) {
      return;
    }

    setSearchInput(value);

    if (value.trim() === "") {
      // 当搜索框为空时，恢复初始排序
      const updatedLanguages = addLanguages.map((lang) => {
        const isPrimary = selectedLanguage.some(
          (sl) => sl.locale === lang.isoCode && sl.primary,
        );
        const state = selectedLanguagesSet.has(lang.isoCode)
          ? isPrimary
            ? "Primary"
            : "Added"
          : ""; // 更新语言状态
        return { ...lang, state };
      });

      const sortedFilteredLanguages = updatedLanguages.sort((a, b) => {
        const aSelected = selectedLanguagesSet.has(a.isoCode) ? 1 : -1;
        const bSelected = selectedLanguagesSet.has(b.isoCode) ? 1 : -1;
        return aSelected - bSelected;
      });

      setFilteredLanguages(sortedFilteredLanguages);
      return;
    }

    // 过滤逻辑
    const filteredData = addLanguages
      .map((lang) => {
        const isPrimary = selectedLanguage.some(
          (sl) => sl.locale === lang.isoCode && sl.primary,
        );
        const state = selectedLanguagesSet.has(lang.isoCode)
          ? isPrimary
            ? "Primary"
            : "Added"
          : ""; // 更新语言状态
        return { ...lang, state };
      })
      .filter((lang) => lang.name.toLowerCase().includes(value.toLowerCase()));

    setFilteredLanguages(filteredData);
  };

  // 增量更新 allSelectedLanguage
  const handleRowSelectionChange = (
    newSelectedRowKeys: React.Key[],
    e: AddLanguageType[],
  ) => {
    // 计算已选中的语言数量
    const addedLanguagesCount =
      newSelectedRowKeys.length + selectedLanguagesSet.size;

    // 检查是否超过20
    if (addedLanguagesCount > 20) {
      // 弹出错误提示
      message.error("Your have reach your shopify plan limit(Max<=20)");
      return;
    }
    const addKeys = [...new Set([...allSelectedKeys, ...newSelectedRowKeys])];
    const removedKeys = filteredLanguages
      .filter((lang) => !e.includes(lang))
      .map((lang) => lang.key);
    const updateKeys = addKeys.filter(
      (item) => !removedKeys.includes(Number(item)),
    );

    setAllSelectedKeys(updateKeys);

    const addedLanguages = allSelectedKeys
      .map((key) => addLanguages.find((lang) => lang.key === key))
      .filter(Boolean) as AddLanguageType[];

    setAllSelectedLanguage(addedLanguages);
  };

  // 确认选择 -> 触发 action
  const handleConfirm = () => {
    const selectedLanguages = allSelectedLanguage.map((lang) => lang.isoCode);
    const formData = new FormData();
    formData.append(
      "addLanguages",
      JSON.stringify({
        selectedLanguages: selectedLanguages,
        primaryLanguage: primaryLanguage,
      }),
    ); // 将选中的语言作为字符串发送
    addFetcher.submit(formData, {
      method: "post",
      action: "/app/language",
    }); // 提交表单请求
    setAllSelectedKeys([]); // 清除已选中的语言
    setSearchInput(""); // 清除搜索框内容
    setAllSelectedLanguage([]); // 清除已选中的语言对象
    setConfirmButtonDisable(true);
  };

  const handleCloseModal = () => {
    setAllSelectedKeys([]); // 清除已选中的语言
    setSearchInput(""); // 清除搜索框内容
    setFilteredLanguages(addLanguages); // 重置为初始语言列表
    setAllSelectedLanguage([]); // 清除已选中的语言对象
    setIsModalOpen(false); // 关闭Modal
  };

  // 移除已选中的语言
  const handleRemoveLanguage = (key: React.Key) => {
    setAllSelectedKeys((prevKeys) =>
      prevKeys.filter((selectedKey) => selectedKey !== key),
    );
    setAllSelectedLanguage((prevLanguages) =>
      prevLanguages.filter((lang) => lang.key !== key),
    );
  };

  // 表格的行选择配置
  const rowSelection = {
    selectedRowKeys: allSelectedKeys.filter((key) =>
      filteredLanguages.some((lang) => lang.key === key),
    ), // Filter selected keys based on current filtered languages
    onChange: handleRowSelectionChange,
    getCheckboxProps: (record: any) => ({
      disabled: selectedLanguagesSet.has(record.isoCode), // Disable checkbox if the language is already selected
    }),
  };

  const columns = [
    {
      title: t("Language"),
      dataIndex: "name",
      key: "name",
      width: "35%",
    },
    {
      title: t("Relevant region(s)"),
      dataIndex: "src",
      key: "src",
      width: "45%",
      render: (_: any, record: any) => {
        return (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "left",
              alignItems: "left",
              gap: "10px",
            }}
          >
            {record.src?.map((url: string, index: number) => (
              <img
                key={index} // 为每个 img 标签添加唯一的 key 属性
                src={url}
                alt={`${record.name} flag`}
                style={{
                  width: "30px",
                  height: "auto",
                  border: "1px solid #888",
                  borderRadius: "2px",
                }}
              />
            ))}
          </div>
        );
      },
    },
    {
      title: t("Status"),
      dataIndex: "state",
      key: "state",
      width: "20%",
    },
  ];

  return (
    <Modal
      title={t("Select Languages")}
      width={1000}
      open={isVisible}
      onCancel={handleCloseModal}
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
            onClick={handleCloseModal}
            style={{ marginRight: "10px" }}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            key={"manage_confirm_button"}
            type="primary"
            disabled={confirmButtonDisable}
            loading={confirmButtonDisable}
          >
            {t("Add")}
          </Button>
        </div>,
      ]}
    >
      <Input
        ref={searchRef}
        placeholder={t("Search languages...")}
        prefix={<SearchOutlined />}
        value={searchInput}
        onChange={handleSearch}
        style={{ marginBottom: 16 }}
      />

      <Space wrap style={{ marginBottom: 16 }}>
        {allSelectedKeys.map((key) => {
          const language = allLanguages.find((lang) => lang.key === key)?.name;
          return (
            <SelectedTag
              key={key}
              item={language!}
              onRemove={() => handleRemoveLanguage(key)}
            />
          );
        })}
      </Space>

      <Table
        rowSelection={rowSelection}
        dataSource={filteredLanguages}
        columns={columns}
        rowKey="key"
        loading={confirmButtonDisable || allLanguages.length === 0}
        pagination={{
          pageSize: 10, // 每页默认显示 10 条
          position: ["bottomCenter"], // 将分页组件居中
          showSizeChanger: false, // 关闭每页项目数量选择
        }}
      />
    </Modal>
  );
};

export default AddLanguageModal;
