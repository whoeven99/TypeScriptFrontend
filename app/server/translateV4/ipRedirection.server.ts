import prisma from "~/db.server";

export type IpRedirectionRegionInput = {
  region: string;
  languageCode?: string | null;
  currencyCode?: string | null;
};

export type IpRedirectionUpdateInput = {
  region?: string | null;
  languageCode?: string | null;
  currencyCode?: string | null;
};

type NormalizedRegionInput = {
  region: string;
  languageCode: string;
  currencyCode: string;
};

export type IpRedirectionRow = {
  id: number;
  key: number;
  status: boolean;
  region: string;
  languageCode: string;
  currencyCode: string;
};

function normalizeCode(value: unknown, fallback = "auto"): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function normalizeRegion(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function toRow(row: {
  id: number;
  region: string;
  languageCode: string;
  currencyCode: string;
  isDeleted: boolean;
}): IpRedirectionRow {
  return {
    id: row.id,
    key: row.id,
    status: !row.isDeleted,
    region: row.region,
    languageCode: row.languageCode,
    currencyCode: row.currencyCode,
  };
}

export async function listIpRedirections(shop: string): Promise<IpRedirectionRow[]> {
  const rows = await prisma.ipRedirection.findMany({
    where: { shop, isDeleted: false },
    orderBy: { id: "asc" },
    select: {
      id: true,
      region: true,
      languageCode: true,
      currencyCode: true,
      isDeleted: true,
    },
  });

  return rows.map(toRow);
}

async function allocateNextIpRedirectionId(): Promise<number> {
  const agg = await prisma.ipRedirection.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function syncIpRedirectionsWithMarkets(
  shop: string,
  regions: IpRedirectionRegionInput[],
): Promise<IpRedirectionRow[]> {
  const inputByRegion = new Map<string, NormalizedRegionInput>();

  for (const item of regions) {
    const region = normalizeRegion(item?.region);
    if (!region || inputByRegion.has(region)) continue;
    inputByRegion.set(region, {
      region,
      languageCode: normalizeCode(item.languageCode),
      currencyCode: normalizeCode(item.currencyCode),
    });
  }

  if (inputByRegion.size === 0) {
    return listIpRedirections(shop);
  }

  const existingRows = await prisma.ipRedirection.findMany({
    where: { shop },
    orderBy: [{ isDeleted: "asc" }, { id: "asc" }],
  });

  const existingByRegion = new Map<string, (typeof existingRows)[number]>();
  for (const row of existingRows) {
    const region = normalizeRegion(row.region);
    if (!region || existingByRegion.has(region)) continue;
    existingByRegion.set(region, row);
  }

  let nextId = await allocateNextIpRedirectionId();

  for (const input of inputByRegion.values()) {
    const existing = existingByRegion.get(input.region);

    if (!existing) {
      await prisma.ipRedirection.create({
        data: {
          id: nextId++,
          shop,
          region: input.region,
          languageCode: input.languageCode,
          currencyCode: input.currencyCode,
        },
      });
      continue;
    }

    if (existing.isDeleted) {
      await prisma.ipRedirection.update({
        where: { id: existing.id },
        data: {
          region: input.region,
          isDeleted: false,
          languageCode: normalizeCode(existing.languageCode, input.languageCode),
          currencyCode: normalizeCode(existing.currencyCode, input.currencyCode),
          updatedAt: new Date(),
        },
      });
    } else if (existing.region !== input.region) {
      await prisma.ipRedirection.update({
        where: { id: existing.id },
        data: { region: input.region, updatedAt: new Date() },
      });
    }
  }

  await prisma.ipRedirection.updateMany({
    where: {
      shop,
      isDeleted: false,
      region: { notIn: [...inputByRegion.keys()] },
    },
    data: { isDeleted: true, updatedAt: new Date() },
  });

  return listIpRedirections(shop);
}

export async function updateIpRedirection(
  shop: string,
  id: number,
  input: IpRedirectionUpdateInput,
): Promise<IpRedirectionRow> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid redirection id");
  }

  const existing = await prisma.ipRedirection.findFirst({
    where: { id, shop, isDeleted: false },
  });
  if (!existing) {
    throw new Error("Redirect rule not found");
  }

  const region = normalizeRegion(input.region) || existing.region;
  const duplicate = await prisma.ipRedirection.findFirst({
    where: {
      shop,
      region,
      isDeleted: false,
      NOT: { id },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("You cannot add two conflicting rules.");
  }

  const row = await prisma.ipRedirection.update({
    where: { id },
    data: {
      region,
      languageCode: normalizeCode(input.languageCode, existing.languageCode),
      currencyCode: normalizeCode(input.currencyCode, existing.currencyCode),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      region: true,
      languageCode: true,
      currencyCode: true,
      isDeleted: true,
    },
  });

  return toRow(row);
}
