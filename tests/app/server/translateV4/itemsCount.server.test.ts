import { describe, expect, it } from "vitest";
import {
  countModuleItems,
  getProductsItemsCount,
} from "~/server/translateV4/itemsCount.server";

/** 构造一个分页 admin mock：按 after 游标返回两页 translatableResources。 */
function makeAdmin(pages: Array<{ edges: any[]; endCursor: string | null }>) {
  let calls = 0;
  return {
    graphql: async (_q: string, opts?: { variables?: any }) => {
      const after = opts?.variables?.after ?? null;
      const pageIndex = after === null ? 0 : Number(after);
      const page = pages[pageIndex];
      calls++;
      return {
        json: async () => ({
          data: {
            translatableResources: {
              edges: page.edges,
              pageInfo: {
                hasNextPage: page.endCursor !== null,
                endCursor: page.endCursor,
              },
            },
          },
        }),
      };
    },
    get calls() {
      return calls;
    },
  };
}

const node = (
  translatableContent: any[],
  translations: any[] = [],
) => ({ node: { translatableContent, translations } });

describe("countModuleItems (PRODUCT)", () => {
  it("分母用 v4 过滤规则、分子只数当前译文，并跨页累计", async () => {
    const admin = makeAdmin([
      {
        // 第 1 页：title 计入且已翻译；handle(URI) 被排除；空值被排除
        edges: [
          node(
            [
              { key: "title", value: "Hello", type: "" },
              { key: "handle", value: "my-product", type: "URI" },
              { key: "body_html", value: "   ", type: "" },
            ],
            [{ key: "title", outdated: false }],
          ),
        ],
        endCursor: "1",
      },
      {
        // 第 2 页：description 计入但译文过期(不计已翻译)；URL 被排除
        edges: [
          node(
            [
              { key: "description", value: "World", type: "" },
              { key: "meta", value: "https://x.com", type: "" },
            ],
            [{ key: "description", outdated: true }],
          ),
        ],
        endCursor: null,
      },
    ]);

    const { total, translated } = await countModuleItems({
      admin: admin as any,
      module: "PRODUCT",
      target: "de",
    });

    expect(total).toBe(2); // title + description
    expect(translated).toBe(1); // 仅 title 有当前译文
    expect(admin.calls).toBe(2); // 翻了两页
  });

  it("getProductsItemsCount 返回组件可消费的形状", async () => {
    const admin = makeAdmin([
      {
        edges: [
          node(
            [{ key: "title", value: "Hello", type: "" }],
            [{ key: "title", outdated: false }],
          ),
        ],
        endCursor: null,
      },
    ]);

    const rows = await getProductsItemsCount({ admin: admin as any, target: "de" });
    expect(rows).toEqual([
      { language: "de", type: "PRODUCT", translatedNumber: 1, totalNumber: 1 },
    ]);
  });
});
