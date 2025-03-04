import { Button, Card, Col, Divider, Modal, Row, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import PaymentOptionSelect from "./paymentOptionSelect";
import "./styles.css";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { handleContactSupport } from "~/routes/app._index/route";

const { Title, Text } = Typography;

interface PaymentModalProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  source: string;
  target: string;
  modal: string;
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

const PaymentModal: React.FC<PaymentModalProps> = ({ visible, setVisible, source, target, modal }) => {
  // const recommendOption: OptionType = {
  //   key: "option-2",
  //   name: "20K Credits",
  //   Credits: 20000,
  //   price: {
  //     currentPrice: 17.99,
  //     comparedPrice: 20.0,
  //     currencyCode: "USD",
  //   },
  // };
  const [selectedOption, setSelectedOption] = useState<OptionType>();
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const [credits, setCredits] = useState<number>(0);
  const [multiple1, setMultiple1] = useState<number>(2);
  const [multiple2, setMultiple2] = useState<number>(1);
  // const [recommendOption, setRecommendOption] = useState<OptionType>();
  // const totalCharacters = useSelector(
  //   (state: any) => state.TotalCharacters.count,
  // );
  const { t } = useTranslation();
  const fetcher = useFetcher<any>();
  const recalculateFetcher = useFetcher<any>();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();

  useEffect(() => {
    if (credits && !selectedOption) {
      const matchedOption = options.find(
        (option) => option.Credits >= credits * multiple1 * multiple2,
      ); // 找到第一个符合条件的选项
      if (matchedOption) {
        // setRecommendOption(matchedOption);
        setSelectedOption(matchedOption);
      }
    }
  }, [credits]);

  useEffect(() => {
    if (visible) {
      fetcher.submit({
        credits: JSON.stringify({
          source: source || "en",
          target: target || "zh-CN",
        }),
      }, {
        method: "post",
        action: "/app",
      });
    }
  }, [visible]);

  useEffect(() => {
    if (fetcher.data) {
      console.log("fetcher.data: ", fetcher.data);
      if (fetcher.data.data.success) {
        console.log("fetcher.data.data.response: ", fetcher.data.data.response);
        const { id, translationId, shopName, ...rest } = fetcher.data.data.response;
        let credits = 0;
        console.log("rest: ", rest);
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== null) {
            credits += value as number;
          } else {
            recalculateFetcher.submit({
              recalculate: JSON.stringify(true),
            }, {
              method: "post",
              action: "/app",
            });
          }
        });
        setCredits(credits);
      } else {
        recalculateFetcher.submit({
          recalculate: JSON.stringify(true),
        }, {
          method: "post",
          action: "/app",
        });
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (recalculateFetcher.data) {
      console.log("recalculateFetcher.data: ", recalculateFetcher.data);
      if (recalculateFetcher.data.data.success) {
        console.log("recalculateFetcher.data.data.response: ", recalculateFetcher.data.data.response);
        const { id, translationId, shopName, ...rest } = recalculateFetcher.data.data.response;
        let credits = 0;
        console.log("rest: ", rest);
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== null) {
            credits += value as number;
          } else {
            setCredits(-1);
            return;
          }
        });
        setCredits(credits);
      } else {
        setCredits(-1);
      }
    }
  }, [recalculateFetcher.data]);

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

  //分别是10w（3.99美金），20w（6.99美金），50w（15.99美金），100w（29.99美金），300w（79.99美金），500w（99.99美金）
  const options: OptionType[] = [
    {
      key: "option-1",
      name: "100K",
      Credits: 100000,
      price: {
        currentPrice: 3.99,
        comparedPrice: 100.0,
        currencyCode: "USD",
      },
    },
    {
      key: "option-2",
      name: "200K",
      Credits: 200000,
      price: {
        currentPrice: 6.99,
        comparedPrice: 20.0,
        currencyCode: "USD",
      },
      // test: true,
    },
    {
      key: "option-3",
      name: "500K",
      Credits: 500000,
      price: {
        currentPrice: 15.99,
        comparedPrice: 100.0,
        currencyCode: "USD",
      },
    },
    {
      key: "option-4",
      name: "1M",
      Credits: 1000000,
      price: {
        currentPrice: 29.99,
        comparedPrice: 200.0,
        currencyCode: "USD",
      },
      // test: true,
    },
    {
      key: "option-5",
      name: "3M",
      Credits: 3000000,
      price: {
        currentPrice: 79.99,
        comparedPrice: 800.0,
        currencyCode: "USD",
      },
    },
    {
      key: "option-6",
      name: "5M",
      Credits: 5000000,
      price: {
        currentPrice: 99.99,
        comparedPrice: 1000.0,
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
    // if (recommendOption) setSelectedOption(recommendOption);
  };

  const handleChange = (value: OptionType) => {
    setSelectedOption(value);
  };

  return (
    <Modal
      open={visible}
      // title={t("Extend your quota usage")}
      onCancel={onCancel}
      width={1000}
      footer={[
        <div
          key="footer-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end"
          }}
        >
          <div key="support-section">
            <Text strong key="cost-question">{t("Cost questions: ")}</Text>
            <Button
              key="contact-support"
              type="link"
              onClick={() => handleContactSupport()}
              style={{ marginLeft: "-15px" }}
            >
              {t("Contact support")}
            </Button>
          </div>
          <Button
            key="buy-now"
            type="primary"
            onClick={onClick}
            disabled={buyButtonLoading}
            loading={buyButtonLoading}
            style={{
              height: 'auto',
              paddingTop: '4px',
              paddingBottom: '4px'
            }}
          >
            <div key="button-content" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <Text key="price" strong style={{ color: 'inherit' }}>
                ${selectedOption?.price.currentPrice ?? 0}
              </Text>
              <Text key="buy-text" style={{ color: 'inherit' }}>
                {t("Buy now")}
              </Text>
            </div>
          </Button>
        </div>
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
      <Title level={4} style={{ textAlign: "center", marginTop: "20px" }}>{t("Your translation task exceeds the free limit and you need to purchase additional credits")}</Title>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Title level={5}>{t("Translation tasks")}</Title>
          <Title level={5} style={{ marginTop: "0px" }}>{t("Credits to be consumed")}</Title>
        </div>
        <Divider style={{ margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Estimated number of words to translate: ")}</Text>
            {credits > 0 ? <Text>{credits} {t("words")}</Text> : (credits < 0 ? <Text>{t("Calculation failed")}</Text> : <Text>{t("Calculating...")}</Text>)}
          </div>
          {credits > 0 ? <Text>+{credits}</Text> : (credits < 0 ? <Text>{t("Calculation failed")}</Text> : <Text>{t("Calculating...")}</Text>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Translate files: ")}</Text>
            <Text>{source.toUpperCase()} {t("translate to")} {target.toUpperCase()}</Text>
          </div>
          <Text>*{multiple1}</Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Translate modal: ")}</Text>
            <Text>{modal}</Text>
          </div>
          <Text>*{multiple2}</Text>
        </div>
        <Divider style={{ margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Total: ")}</Text>
          </div>
          <Text>{(credits * multiple1 * multiple2).toFixed(2) || 0}</Text>
        </div>
      </Card>
      <Divider />
      {/* <div style={{
        display: "flex",
        alignItems: 'flex-end',  // 底部对齐
        gap: '3px',
        marginBottom: "10px"
      }}> */}
        <Title level={5}>{t("Buy credits")}</Title>
        {/* <Text type="secondary">1{t("word")} = 1{t("credit")}</Text> */}
      {/* </div> */}
      <div className="options_wrapper">
        <Space direction="vertical">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',  // 允许自动换行
              gap: '16px',
              width: '100%'
            }}
          >
            {options.map((option: any) => (
              <div
                key={option.name}
                style={{
                  flex: '0 1 auto',  // 允许缩小但不放大
                  // minWidth: '200px',  // 设置最小宽度
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <PaymentOptionSelect
                  option={option}
                  selectedOption={selectedOption}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>
        </Space>
      </div>
      <Divider />
      <div className="total_payment">
        <Text style={{ marginRight: "5px" }}>{t("Total Payment:")}</Text>
        <Text strong>${selectedOption?.price.currentPrice ? selectedOption?.price.currentPrice : 0}</Text>
      </div>
    </Modal>
  );
};

export default PaymentModal;
