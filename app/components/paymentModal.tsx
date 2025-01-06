import { Button, Col, Modal, Row, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import PaymentOptionSelect from "./paymentOptionSelect";
import "./styles.css";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface PaymentModalProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface OptionType {
  key: string;
  name: string;
  Credits: number;
  price: {
    currentPrice: number;
    comparedPrice: number;
    currencyCode: string;
  };
  test?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ visible, setVisible }) => {
  const recommendOption: OptionType = {
    key: "option-2",
    name: "20K Credits",
    Credits: 20000,
    price: {
      currentPrice: 17.99,
      comparedPrice: 20.0,
      currencyCode: "USD",
    },
  };
  const [selectedOption, setSelectedOption] = useState<OptionType>();
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  // const totalCharacters = useSelector(
  //   (state: any) => state.TotalCharacters.count,
  // );
  const { t } = useTranslation();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();

  // useEffect(() => {
  //   if (totalCharacters && !selectedOption) {
  //     const matchedOption = options.find(
  //       (option) => option.Credits >= totalCharacters,
  //     ); // 找到第一个符合条件的选项
  //     if (matchedOption) {
  //       setRecommendOption(matchedOption);
  //       setSelectedOption(matchedOption);
  //     }
  //   }
  // }, [totalCharacters]);

  useEffect(() => {
    if (visible) setSelectedOption(recommendOption);
  }, [visible]);

  useEffect(() => {
    if (payFetcher.data) {
      if (
        payFetcher.data.data.data.appPurchaseOneTimeCreate.appPurchaseOneTime &&
        payFetcher.data.data.data.appPurchaseOneTimeCreate.confirmationUrl
      ) {
        const order =
          payFetcher.data.data.data.appPurchaseOneTimeCreate.appPurchaseOneTime;
        const confirmationUrl =
          payFetcher.data.data.data.appPurchaseOneTimeCreate.confirmationUrl;
        const orderInfo = {
          id: order.id,
          amount: order.price.amount,
          name: order.name,
          createdAt: order.createdAt,
          status: order.status,
          confirmationUrl: confirmationUrl,
        };
        const formData = new FormData();
        formData.append("orderInfo", JSON.stringify(orderInfo));
        orderFetcher.submit(formData, {
          method: "post",
          action: "/app",
        });
        open(confirmationUrl, "_top");
      }
      if (
        payFetcher.data.data.data.appPurchaseOneTimeCreate.userErrors.length
      ) {
        setBuyButtonLoading(false);
        console.log(
          payFetcher.data.data.data.appPurchaseOneTimeCreate.userErrors[0]
            .message,
        );
      }
    }
  }, [payFetcher.data]);

  const options: OptionType[] = [
    {
      key: "option-1",
      name: "10K Credits",
      Credits: 10000,
      price: {
        currentPrice: 8.99,
        comparedPrice: 10.0,
        currencyCode: "USD",
      },
    },
    {
      key: "option-2",
      name: "20K Credits",
      Credits: 20000,
      price: {
        currentPrice: 17.99,
        comparedPrice: 20.0,
        currencyCode: "USD",
      },
    },
    {
      key: "option-3",
      name: "50K Credits",
      Credits: 50000,
      price: {
        currentPrice: 39.99,
        comparedPrice: 50.0,
        currencyCode: "USD",
      },
    },
    {
      key: "option-4",
      name: "100K Credits",
      Credits: 100000,
      price: {
        currentPrice: 79.99,
        comparedPrice: 100.0,
        currencyCode: "USD",
      },
      test: true,
    },
    {
      key: "option-5",
      name: "200K Credits",
      Credits: 200000,
      price: {
        currentPrice: 159.99,
        comparedPrice: 200.0,
        currencyCode: "USD",
      },
    },
    {
      key: "option-6",
      name: "300K Credits",
      Credits: 300000,
      price: {
        currentPrice: 239.99,
        comparedPrice: 300.0,
        currencyCode: "USD",
      },
    },
  ];

  const onClick = () => {
    setBuyButtonLoading(true);
    const payInfo = {
      name: selectedOption?.name,
      price: {
        amount: selectedOption?.price.currentPrice,
        currencyCode: selectedOption?.price.currencyCode,
      },
      test: selectedOption?.test,
    };
    const formData = new FormData();
    formData.append("payInfo", JSON.stringify(payInfo));
    payFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  };

  const onCancel = () => {
    setVisible(false);
    if (recommendOption) setSelectedOption(recommendOption);
  };

  const handleChange = (value: OptionType) => {
    setSelectedOption(value);
  };

  return (
    <Modal
      open={visible}
      title={t("Extend your quota usage")}
      onCancel={onCancel}
      footer={[
        <Button
          key="buy-now"
          type="primary"
          onClick={onClick}
          disabled={buyButtonLoading}
          loading={buyButtonLoading}
          style={{ marginRight: "32px" }}
        >
          {t("Buy now")}
        </Button>,
      ]}
    >
      {/* <div style={{ display: "flex" }}>
        <Text style={{ marginRight: "5px" }}>
          Detected number of Credits required to translate store:
        </Text>
        {totalCharacters ? (
          <Text>about {(totalCharacters / 10000).toFixed(0) + "w"}</Text>
        ) : (
          <Text>calculating</Text>
        )}
      </div> */}
      <div className="options_wrapper">
        <Space direction="vertical">
          <Row gutter={[16, 16]}>
            {options.map((option: any) => (
              <Col
                span={8}
                key={option.name}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <PaymentOptionSelect
                  option={option}
                  selectedOption={selectedOption}
                  onChange={handleChange}
                />
              </Col>
            ))}
          </Row>
          <div className="total_payment">
            <Text style={{ marginRight: "5px" }}>{t("Total Payment:")}</Text>
            <Text strong>${selectedOption?.price.currentPrice || 0}</Text>
          </div>
        </Space>
      </div>
    </Modal>
  );
};

export default PaymentModal;
