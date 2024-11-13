import { useLocation, useNavigate } from "@remix-run/react";
import { Select, Layout, theme } from "antd";
import { useEffect, useState } from "react";
import { ShopLocalesType } from "~/routes/app.language/route";

const { Header } = Layout;

interface ManageModalHeaderProps {
  shopLanguagesLoad: ShopLocalesType[];
  locale: string | null;
}

interface SelectType {
  label: string;
  value: string;
}

const ManageModalHeader: React.FC<ManageModalHeaderProps> = ({
  shopLanguagesLoad,
  locale,
}) => {
  const [selectData, setSelectData] = useState<SelectType[]>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigation = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const newArray = shopLanguagesLoad
      .filter((language) => !language.primary)
      .map((language) => ({
        label: language.name,
        value: language.locale,
      }));
    setSelectData(newArray);
  }, [shopLanguagesLoad]);

  const onChange = (e: any) => {
    const currentPath = location.pathname;
    navigation(`${currentPath}?language=${e}`);
  };

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
        defaultValue={locale || shopLanguagesLoad[0].locale}
        onChange={onChange}
      />
    </Header>
  );
};

export default ManageModalHeader;
