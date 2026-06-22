import prisma from "~/db.server";

/**
 * worker 后台任务（init / writeback / verify）需要长期有效的 **offline** access token，
 * 在线 token 会过期。这里优先取该 shop 的 offline session token，
 * 失败时回退到当前在线 token。
 *
 * 创建 TsFrontend 任务时把解析出的 token 写入 Cosmos job.shopifyAccessToken，
 * worker 见到 taskSource=TsFrontend 时直接用 job 上的这枚 token 写回 Shopify。
 */
export async function resolveOfflineAccessToken(
  shop: string,
  onlineFallback?: string | null,
): Promise<string | null> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) return null;

  try {
    // offline session 排在前（isOnline=false）；TSF Session 表无 updatedAt，
    // 以 expires desc 作为次级排序，优先取剩余有效期更长的一条。
    const row = await prisma.session.findFirst({
      where: { shop: normalizedShop },
      orderBy: [{ isOnline: "asc" }, { expires: "desc" }],
      select: { accessToken: true, expires: true },
    });

    const token = row?.accessToken?.trim();
    if (token && row && (!row.expires || row.expires > new Date())) {
      return token;
    }
  } catch (err) {
    console.error("[translateV4] resolveOfflineAccessToken failed:", err);
  }

  const fallback = onlineFallback?.trim();
  return fallback || null;
}
