import { Button, Col, Modal, Row, Typography } from "antd";
import { useEffect, useState } from "react";
import PaymentOptionSelect from "./paymentOptionSelect";
import { useSelector } from "react-redux";
import "./styles.css";
import { useFetcher } from "@remix-run/react";

const { Text } = Typography;

interface PaymentModalProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface OptionType {
  key: string;
  name: string;
  characters: number;
  price: {
    currentPrice: number;
    comparedPrice: number;
    currencyCode: string;
  };
  test?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ visible, setVisible }) => {
  const [recommendOption, setRecommendOption] = useState<OptionType>();
  const [selectedOption, setSelectedOption] = useState<OptionType>();
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  // const totalCharacters = useSelector(
  //   (state: any) => state.TotalCharacters.count,
  // );
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();

  // useEffect(() => {
  //   if (totalCharacters && !selectedOption) {
  //     const matchedOption = options.find(
  //       (option) => option.characters >= totalCharacters,
  //     ); // 找到第一个符合条件的选项
  //     if (matchedOption) {
  //       setRecommendOption(matchedOption);
  //       setSelectedOption(matchedOption);
  //     }
  //   }
  // }, [totalCharacters]);

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
        console.log(orderInfo);
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

  useEffect(() => {
    if (orderFetcher.data) console.log(orderFetcher.data);
  }, [orderFetcher.data]);

  const options: OptionType[] = [
    {
      key: "option-1",
      name: "20w",
      characters: 200000,
      price: {
        currentPrice: 0.8,
        comparedPrice: 3.99,
        currencyCode: "USD",
      },
      test: false,
    },
    {
      key: "option-2",
      name: "50w",
      characters: 500000,
      price: {
        currentPrice: 0.8,
        comparedPrice: 6.99,
        currencyCode: "USD",
      },
      test: true,
    },
    {
      key: "option-3",
      name: "100w",
      characters: 1000000,
      price: {
        currentPrice: 0.8,
        comparedPrice: 9.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-4",
      name: "200w",
      characters: 2000000,
      price: {
        currentPrice: 0.8,
        comparedPrice: 16.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-5",
      name: "300w",
      characters: 3000000,
      price: {
        currentPrice: 0.8,
        comparedPrice: 24.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-6",
      name: "400w",
      characters: 4000000,
      price: {
        currentPrice: 0.8,
        comparedPrice: 31.99,
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
    console.log(payInfo);
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
    console.log(`Selected: ${value}`);
  };

  return (
    <Modal
      open={visible}
      title={"Extend your quota usage"}
      onCancel={onCancel}
      footer={[
        <Button
          key="buy-now"
          type="primary"
          onClick={onClick}
          disabled={buyButtonLoading}
          loading={buyButtonLoading}
        >
          Buy now
        </Button>,
      ]}
    >
      {/* <div style={{ display: "flex" }}>
        <Text style={{ marginRight: "5px" }}>
          Detected number of characters required to translate store:
        </Text>
        {totalCharacters ? (
          <Text>about {(totalCharacters / 10000).toFixed(0) + "w"}</Text>
        ) : (
          <Text>calculating</Text>
        )}
      </div> */}
      <div className="options_wrapper">
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
      </div>
    </Modal>
  );
};

export default PaymentModal;
