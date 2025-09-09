import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, init, settings }) => {
  const serverUrl = "https://3000/track";

  // 页面浏览事件
  analytics.subscribe("page_viewed", async (event) => {
    console.log("Page Viewed:", event);
    try {
      const timeStamp = event.timestamp;

      const pageEventId = event.id;

      const payload = {
        event_name: event.name,
        event_data: {
          pageEventId: pageEventId,
          timeStamp: timeStamp,
        },
      };

      // Example for sending event data to third party servers
      const response = await fetch(serverUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        keepalive: true,
      });
      console.log("page_viewed success", response);
    } catch (error) {
      console.error("Failed to send page_viewed event:", error);
    }
  });

  // 添加购物车事件
  analytics.subscribe("product_added_to_cart", async (event) => {
    const productTitle = event.data?.cartLine?.merchandise?.title;
    const price = event.data?.cartLine?.merchandise?.price?.amount;
    console.log(`Added to Cart: ${productTitle} for $${price}`);
    try {
      const cartLine = event.data.cartLine as any;

      const cartLineCost = cartLine.cost.totalAmount.amount;

      const cartLineCostCurrency = cartLine.cost.totalAmount.currencyCode;

      const merchandiseVariantTitle = cartLine.merchandise.title;

      const payload = {
        event_name: event.name,
        event_data: {
          cartLineCost: cartLineCost,
          cartLineCostCurrency: cartLineCostCurrency,
          merchandiseVariantTitle: merchandiseVariantTitle,
        },
      };

      // Example for sending event to third party servers
      const response = await fetch(serverUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        keepalive: true,
      });
      console.log("product_added_to_cart success", response);
    } catch (error) {
      console.error("Failed to send product_added_to_cart event:", error);
    }
  });
});
