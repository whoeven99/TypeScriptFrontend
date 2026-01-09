import { createCookieSessionStorage } from "@remix-run/node";

// 定义 session 数据的类型
interface ShopSession {
  shop: string;
  accessToken: string;
}

// 创建 session storage
const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "__shop_session",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET || "s3cr3t"],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  },
});

export class SessionService {
  private request: Request;
  private session: Awaited<ReturnType<typeof getSession>>;

  private constructor(request: Request, session: Awaited<ReturnType<typeof getSession>>) {
    this.request = request;
    this.session = session;
  }

  // 创建 SessionService 实例
  static async init(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));
    return new SessionService(request, session);
  }

  // 获取完整的 shop session 数据
  getShopSession(): ShopSession | null {
    const shop = this.session.get("shop");
    const accessToken = this.session.get("accessToken");

    if (!shop || !accessToken) return null;

    return { shop, accessToken };
  }

  // 设置 shop session 数据
  setShopSession(data: ShopSession) {
    this.session.set("shop", data.shop);
    this.session.set("accessToken", data.accessToken);
  }

  // 获取单个值
  get(key: keyof ShopSession) {
    return this.session.get(key);
  }

  // 设置单个值
  set(key: keyof ShopSession, value: string) {
    this.session.set(key, value);
  }

  // 提交 session 更改
  async commit() {
    return await commitSession(this.session);
  }

  // 销毁 session
  async destroy() {
    return await destroySession(this.session);
  }

  // 创建带有 session cookie 的响应头
  async createResponseInit() {
    return {
      headers: {
        "Set-Cookie": await this.commit(),
      },
    };
  }
} 