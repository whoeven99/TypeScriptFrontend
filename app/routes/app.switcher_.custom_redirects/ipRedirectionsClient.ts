export type IpRedirectionRow = {
  id: number;
  key: number;
  status: boolean;
  region: string;
  languageCode: string;
  currencyCode: string;
};

export type IpRedirectionApiResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: string };

type RegionInput = {
  region: string;
  languageCode: string;
  currencyCode: string;
};

async function parseResult<T>(res: Response): Promise<IpRedirectionApiResult<T>> {
  const data = (await res.json().catch(() => null)) as IpRedirectionApiResult<T> | null;
  if (data && typeof data.ok === "boolean") return data;
  return {
    ok: false,
    data: null,
    error: res.ok ? "Invalid response" : `Request failed (${res.status})`,
  };
}

export async function syncIpRedirections(
  regions: RegionInput[],
): Promise<IpRedirectionApiResult<IpRedirectionRow[]>> {
  const res = await fetch("/api/translate-v4/ip-redirections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sync", regions }),
  });
  return parseResult<IpRedirectionRow[]>(res);
}

export async function updateIpRedirection(args: {
  id: number;
  region: string;
  languageCode: string;
  currencyCode: string;
}): Promise<IpRedirectionApiResult<IpRedirectionRow>> {
  const res = await fetch("/api/translate-v4/ip-redirections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      id: args.id,
      data: {
        region: args.region,
        languageCode: args.languageCode,
        currencyCode: args.currencyCode,
      },
    }),
  });
  return parseResult<IpRedirectionRow>(res);
}
