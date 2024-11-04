import { Select, Layout, theme } from "antd";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ShopLocalesType } from "~/routes/app.language/route";

const { Header } = Layout;

interface ManageModalHeaderProps {
  shopLanguagesLoad: ShopLocalesType[];
}

interface SelectType {
  label: string;
  value: string;
}

const ManageModalHeader: React.FC<ManageModalHeaderProps> = ({
  shopLanguagesLoad,
}) => {
  const [selectData, setSelectData] = useState<SelectType[]>();
  const defaultValue: string = useSelector(
    (state: any) => state.selectLanguageData.key,
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    const newArray = shopLanguagesLoad
      .filter((language) => !language.primary)
      .map((language) => ({
        label: language.name,
        value: language.locale,
      }));
    setSelectData(newArray);
  }, [shopLanguagesLoad]);

  return (
    <Header
      style={{
        background: colorBgContainer,
        borderRadius: borderRadiusLG,
      }}
    >
      <Select
        options={selectData}
        style={{ minWidth: "200px" }}
        defaultValue={defaultValue}
      />
    </Header>
  );
};

export default ManageModalHeader;
