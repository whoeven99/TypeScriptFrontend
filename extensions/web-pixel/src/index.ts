import { register } from "@shopify/web-pixels-extension";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

register(async ({ analytics, browser, init, settings }) => {
  const { shopName, server } = settings;
  const serverUrl = `${server}/saveUserDataReport?shopName=${shopName}`;
  const { storefrontUrl } = init?.data?.shop as any;
  const parts = new URL(storefrontUrl).pathname.split("/").filter(Boolean);
  let storeLanguage = parts.length > 0 ? [parts[parts.length - 1]] : ["en"];
  function isLikelyBotByUA() {
    let ua = "";
    if (typeof navigator !== "undefined" && navigator.userAgent) {
      ua = navigator.userAgent.toLowerCase();
    }

    const botKeywords = [
      "bot",
      "spider",
      "crawl",
      "slurp",
      "bingpreview",
      "facebookexternalhit",
      "monitor",
      "headless",
      "wget",
      "curl",
      "python-requests",
    ];

    // 只在 UA 明确包含爬虫相关关键词时判断为爬虫
    if (ua && botKeywords.some((keyword) => ua.includes(keyword))) {
      return true;
    }

    // 移除过于宽松的 webdriver 检查，除非明确知道环境支持
    // if (typeof navigator !== "undefined" && navigator.webdriver) return true;

    // 调整 languages 检查，容忍部分空值，但结合其他条件
    if (
      typeof navigator !== "undefined" &&
      (!navigator.languages || navigator.languages.length === 0) &&
      ua &&
      !ua.includes("chrome") &&
      !ua.includes("safari") // 容忍主流浏览器
    ) {
      return true;
    }

    // 屏幕宽高检查，增加容差范围
    if (
      typeof window !== "undefined" &&
      (window.outerWidth === 0 || window.outerHeight === 0) &&
      !ua.includes("mobile") // 容忍移动设备可能异常
    ) {
      return true;
    }

    return false;
  }
  analytics.subscribe("page_viewed", async (event) => {
    try {
      const payload = {
        storeLanguage,
        eventName: event.name,
        timestamp: event.timestamp,
        pageEventId: event.id,
        clientId: event.clientId,
      };
      // Example for sending event data to third party servers
      const response = await axios({
        url: serverUrl,
        method: "POST",
        data: payload,
      });
    } catch (error) {
      console.error("Failed to send page_viewed event:", error);
    }
  });

  // 添加购物车事件
  analytics.subscribe("product_added_to_cart", async (event) => {
    try {
      const payload = {
        storeLanguage,
        eventName: event.name,
        timestamp: event.timestamp,
        pageEventId: event.id,
        clientId: event.clientId,
      };

      // Example for sending event to third party servers
      const response = await axios({
        url: serverUrl,
        method: "POST",
        data: payload,
      });
      console.log("add cart payload",payload);
      
      console.log("add cart res",response);
      
    } catch (error) {
      console.error("Failed to send product_added_to_cart event:", error);
    }
  });
  // analytics.subscribe("clicked", async (event) => {
  //   try {
  //     const payload = {
  //       storeLanguage,
  //       eventName: event.name,
  //       timestamp: event.timestamp,
  //       pageEventId: event.id,
  //       clientId: event.clientId,
  //     };

  //     // Example for sending event to third party servers
  //     const response = await axios({
  //       url: serverUrl,
  //       method: "POST",
  //       data: payload,
  //     });
  //   } catch (error) {
  //     console.error("Failed clieked event:", error);
  //   }
  // });
});
