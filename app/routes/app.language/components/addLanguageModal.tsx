import { useEffect, useState } from "react";
import { Modal, Input, Table, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import SelectedLanguageTag from "../../../components/selectedLanguageTag";
import {
  AllLanguagesType,
  LanguagesDataType,
} from "~/routes/app.language/route";
import { SubmitFunction } from "@remix-run/react";
import { useSelector } from "react-redux";

interface LanguageModalProps {
  isVisible: boolean;
  setIsModalOpen: (visible: boolean) => void;
  allLanguages: AllLanguagesType[];
  submit: SubmitFunction;
}

interface AddLanguageType {
  key: number;
  isoCode: string;
  name: string;
  state: string;
}

const AddLanguageModal: React.FC<LanguageModalProps> = ({
  isVisible,
  setIsModalOpen,
  allLanguages,
  submit,
}) => {
  const addLanguages: AddLanguageType[] = allLanguages.map((lang) => ({
    key: lang.key,
    isoCode: lang.isoCode,
    name: lang.name,
    state: "", // 默认值为 false
  }));
  const [allSelectedKeys, setAllSelectedKeys] = useState<React.Key[]>([]); // 保存所有选中的key
  const [searchInput, setSearchInput] = useState("");
  const [filteredLanguages, setFilteredLanguages] = useState<AddLanguageType[]>(addLanguages);
  const [allSelectedLanguage, setAllSelectedLanguage] = useState<
    AllLanguagesType[]
  >([]); // 保存选中的语言对象
  const selectedLanguage: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const selectedLanguagesSet = new Set(
    selectedLanguage.map((lang) => lang.language),
  );

  useEffect(() => {
    // 更新语言状态
    const updatedLanguages = addLanguages.map(lang => {
      if (selectedLanguagesSet.has(lang.name)) {
        // 检查是否是默认语言
        const isPrimary = selectedLanguage.some(sl => sl.language === lang.name && sl.primary);
        return { ...lang, state: isPrimary ? "Primary" : "Added" }; // 根据 primary 设置状态
      }
      return { ...lang, state: "" }; // 其他语言的默认状态
    });
  
    // 根据状态排序
    const sortedFilteredLanguages = updatedLanguages.sort((a, b) => {
      const aSelected = selectedLanguagesSet.has(a.name) ? -1 : 1; // 将已选语言放前面
      const bSelected = selectedLanguagesSet.has(b.name) ? -1 : 1;
      return aSelected - bSelected;
    });
  
    // 更新过滤后的语言状态
    setFilteredLanguages(sortedFilteredLanguages);
  }, [selectedLanguage, allLanguages, isVisible]);
  

  // 搜索逻辑
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    const filteredData = addLanguages.filter((lang) =>
      lang.name.toLowerCase().includes(value.toLowerCase()),
    );
    setFilteredLanguages(filteredData);
  };

  // 增量更新 allSelectedLanguage
  const handleRowSelectionChange = (newSelectedRowKeys: React.Key[]) => {
    const addedKeys = newSelectedRowKeys.filter(
      (key) => !allSelectedKeys.includes(key),
    );
    const removedKeys = allSelectedKeys.filter(
      (key) => !newSelectedRowKeys.includes(key),
    );

    // 增加新选中的语言
    const addedLanguages = addedKeys
      .map((key) => allLanguages.find((lang) => lang.key === key))
      .filter(Boolean) as AllLanguagesType[];

    // 删除取消选中的语言
    const updatedSelectedLanguages = allSelectedLanguage.filter(
      (lang) => !removedKeys.includes(lang.key),
    );

    // 合并新的选择并更新状态
    setAllSelectedLanguage([...updatedSelectedLanguages, ...addedLanguages]);
    setAllSelectedKeys(newSelectedRowKeys);
  };

  // 确认选择 -> 触发 action
  const handleConfirm = () => {
    const selectedLanguages = allSelectedLanguage.map((lang) => lang.isoCode);
    const formData = new FormData();
    formData.append("languages", JSON.stringify(selectedLanguages)); // 将选中的语言作为字符串发送
    submit(formData, {
      method: "post",
      action: "/app/language",
      replace: true,
    }); // 提交表单请求
    setAllSelectedKeys([]); // 清除已选中的语言
    setSearchInput(""); // 清除搜索框内容
    setFilteredLanguages(addLanguages); // 重置为初始语言列表
    setAllSelectedLanguage([]); // 清除已选中的语言对象
    setIsModalOpen(false); // 选择后关闭Modal
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
      disabled: selectedLanguagesSet.has(record.name), // Disable checkbox if the language is already selected
    }),
  };

  const columns = [
    {
      title: "Language",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
    },
  ];

  return (
    <Modal
      title="Select Languages"
      open={isVisible}
      onCancel={handleCloseModal}
      onOk={() => handleConfirm()} // 确定按钮绑定确认逻辑
      okText="Confirm"
      cancelText="Cancel"
    >
      <Input
        placeholder="Search languages..."
        prefix={<SearchOutlined />}
        value={searchInput}
        onChange={handleSearch}
        style={{ marginBottom: 16 }}
      />

      <Space wrap style={{ marginBottom: 16 }}>
        {allSelectedKeys.map((key) => {
          const language = allLanguages.find((lang) => lang.key === key)?.name;
          return (
            <SelectedLanguageTag
              key={key}
              language={language!}
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
