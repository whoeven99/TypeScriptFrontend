import axios from "axios";
import { v4 as uuidv4 } from "uuid"; // 如果要生成随机 client_id

export const GAtranslate = async () => {
  try {
    const clientId = uuidv4(); // 或者从 _ga cookie 解析
    const sessionId = Math.floor(Date.now() / 1000); // 当前时间戳

    const response = await axios({
      url: `https://www.google-analytics.com/mp/collect?measurement_id=G-F1BN24YVJN&api_secret=ppqOSsvpRAiIBnB8fdoZPg`,
      method: "POST",
      data: {
        client_id: clientId,
        events: [
          {
            name: "translate_click_dashboard",
            params: {
              session_id: sessionId,
              engagement_time_msec: 100,
            },
          },
        ],
      },
    });

    return response.data;
  } catch (error) {
    console.error(`test error:`, error);
  }
};
