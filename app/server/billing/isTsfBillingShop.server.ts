import prisma from "~/db.server";

/** Turso 存在 Account 行 → 该 shop 走 TSF 本地计费（新用户）；否则仍走 Java。 */
export async function isTsfBillingShop(shop: string): Promise<boolean> {
  const row = await prisma.account.findUnique({
    where: { shop },
    select: { shop: true },
  });
  return row != null;
}
