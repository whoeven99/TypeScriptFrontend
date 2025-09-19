import { register } from "@shopify/web-pixels-extension";
console.log("dsadasda");
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

register(async ({ analytics, browser, init, settings }) => {
  const { shopName, server } = settings;
  const serverUrl = `${server}/saveUserDataReport?shopName=${shopName}`;
  console.log("settings", settings);

  // 页面浏览事件
  // const id = await browser.localStorage.getItem("ciwi_user_id");
  // if (!id) {
  //   browser.localStorage.setItem("ciwi_user_id", uuidv4());
  // }
  // const userId = await browser.localStorage.getItem("ciwi_user_id");
  // console.log("userid", userId);
  const { storefrontUrl } = init?.data?.shop as any;
  const parts = new URL(storefrontUrl).pathname.split("/").filter(Boolean);
  let storeLanguage = parts.length > 0 ? [parts[parts.length - 1]] : ["en"];
  function isLikelyBotByUA() {
    let ua = "";

    // 确保 navigator 存在且 userAgent 可用
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

    // UA 关键词检测
    if (ua && botKeywords.some((keyword) => ua.includes(keyword))) return true;

    // webdriver 检测
    if (typeof navigator !== "undefined" && navigator.webdriver) return true;

    // 缺少语言信息
    if (
      typeof navigator !== "undefined" &&
      (!navigator.languages || navigator.languages.length === 0)
    ) {
      return true;
    }

    // 屏幕宽高异常
    if (
      typeof window !== "undefined" &&
      (window.outerWidth === 0 || window.outerHeight === 0)
    ) {
      return true;
    }

    // JS 执行标记检测（需要在页面里给 window 打个标记）
    // if (typeof window !== "undefined" && !(window as any).__JS_EXECUTED__) {
    //   return true;
    // }

    return false;
  }
  analytics.subscribe("page_viewed", async (event) => {
    try {
      console.log("event", event);
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
      console.log("page_viewed success: ", response);
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
      console.log("add to cart: ", payload);

      // Example for sending event to third party servers
      const response = await axios({
        url: serverUrl,
        method: "POST",
        data: payload,
      });
      console.log("product_added_to_cart success", response);
    } catch (error) {
      console.error("Failed to send product_added_to_cart event:", error);
    }
  });
  analytics.subscribe("clicked", async (event) => {
    try {
      const payload = {
        storeLanguage,
        eventName: event.name,
        timestamp: event.timestamp,
        pageEventId: event.id,
        clientId: event.clientId,
      };
      console.log("clicked: ", payload);

      // Example for sending event to third party servers
      const response = await axios({
        url: serverUrl,
        method: "POST",
        data: payload,
      });
      console.log("clicked event success", response);
    } catch (error) {
      console.error("Failed clieked event:", error);
    }
  });
});
