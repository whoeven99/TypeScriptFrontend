import prisma from "~/db.server";

/**
 * Shopify Admin API 的唯一持久化 token 来源。
 *
 * 后台逻辑只能读取 Turso Session 表中的 offline session；不接受在线 token
 * 兜底，也不在 Cosmos、Redis、Blob 或业务表中保存副本。
 */
export async function getOfflineSessionAccessToken(
  shop: string,
): Promise<string | null> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) return null;

  try {
    const row = await prisma.session.findFirst({
      where: {
        shop: normalizedShop,
        isOnline: false,
      },
      orderBy: { expires: "desc" },
      select: {
        accessToken: true,
        expires: true,
      },
    });

    const token = row?.accessToken?.trim();
    if (!token || (row.expires && row.expires <= new Date())) {
      return null;
    }
    return token;
  } catch (error) {
    console.error("[offline-session-token] Turso Session lookup failed", {
      shop: normalizedShop,
      error,
    });
    return null;
  }
}
