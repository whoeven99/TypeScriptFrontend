import { CollapseProps } from "antd";

export const collapseData: CollapseProps["items"] = [
  {
    key: 0,
    label: "How does the 5-day free trial work?",
    children:
      "Choosing Pro or Unlimited gives you 5 days of full access to all features, along with 200,000 trial credits. Cancel anytime before the trial ends to avoid billing.",
  },
  {
    key: 1,
    label: "Can I get a discount on my plan?",
    children:
      "Yes. You'll save 20% when you choose yearly billing. Discount applies automatically at checkout.",
  },
  {
    key: 2,
    label: "Can I get a refund?",
    children:
      "No. We do not offer refunds. You can cancel anytime to stop future billing, and your plan will remain active until the end of the billing period.",
  },
  {
    key: 3,
    label: "What happens when I run out of credits?",
    children:
      "You'll need to purchase extra credits to keep creating content. You won't lose access to features, only to credit-based actions.",
  },
  {
    key: 4,
    label: "Do unused credits carry over?",
    children:
      "Plan credits reset at the end of each billing cycle. But if you cancel or downgrade, any unused credits stay active for 3 more months.",
  },
  {
    key: 5,
    label: "Do extra credits affect my plan or features?",
    children:
      "No. Plan credits come with your subscription and reset monthly. Extra credits are only used when plan credits run out, and they never expire. They don't unlock new features or raise limits.",
  },
  {
    key: 6,
    label: "What happens if I upgrade my plan?",
    children:
      "You get your new plan's credits and features right away. Any remaining credits from your previous plan won't carry over.",
  },
  {
    key: 7,
    label: "Will I lose credits if I cancel or downgrade?",
    children:
      "No. Your unused credits stay available for 3 months. But you'll only have access to the features included in your new (lower) plan.",
  },
  {
    key: 8,
    label: "How many credits do actions use?",
    children:
      "We calculate usage at 1 credit per word. However, if AI model is used, the consumption of prompt tokens also needs to be included—each request requires approximately an additional 80 credits. If you would like to know the estimated cost of a translation task, please feel free to contact customer support.",
  },
];
