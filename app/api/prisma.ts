import { Prisma } from "@prisma/client";

export const GetUserCreateTime = async (shopname: string) => {
  const where: Prisma.SessionWhereInput = shopname
    ? {
        OR: [{ shop: shopname }],
      }
    : {};

  // 获取总数

  // 获取当前页数据
  const shop = await prisma.session.findFirst({
    where,
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    createdAt: shop?.createdAt,
  };
};
