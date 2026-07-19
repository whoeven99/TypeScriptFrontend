export type TrialProductSummary = {
  id: string;
  title: string;
  handle: string;
  onlineStoreUrl: string | null;
  imageUrl: string | null;
};

export type TrialProductPage = {
  products: TrialProductSummary[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
};

type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

function mapProductNode(node: {
  id?: string;
  title?: string;
  handle?: string;
  onlineStoreUrl?: string | null;
  featuredImage?: { url?: string | null } | null;
}): TrialProductSummary | null {
  if (!node?.id) return null;
  return {
    id: node.id,
    title: node.title ?? "",
    handle: node.handle ?? "",
    onlineStoreUrl: node.onlineStoreUrl ?? null,
    imageUrl: node.featuredImage?.url ?? null,
  };
}

/** 分页搜索商品（Admin GraphQL）。 */
export async function searchTrialProducts(
  admin: AdminGraphql,
  args: {
    query?: string;
    after?: string | null;
    before?: string | null;
  },
): Promise<TrialProductPage> {
  const search = (args.query ?? "").trim();
  const goingBack = Boolean(args.before);

  const response = await admin.graphql(
    `#graphql
      query TrialTranslateProducts(
        $first: Int
        $last: Int
        $after: String
        $before: String
        $query: String
      ) {
        products(
          first: $first
          last: $last
          after: $after
          before: $before
          query: $query
          reverse: true
        ) {
          nodes {
            id
            title
            handle
            onlineStoreUrl
            featuredImage {
              url
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `,
    {
      variables: goingBack
        ? {
            last: 20,
            before: args.before,
            query: search || null,
          }
        : {
            first: 20,
            after: args.after || null,
            query: search || null,
          },
    },
  );

  const json = (await response.json()) as {
    data?: {
      products?: {
        nodes?: Array<{
          id?: string;
          title?: string;
          handle?: string;
          onlineStoreUrl?: string | null;
          featuredImage?: { url?: string | null } | null;
        }>;
        pageInfo?: {
          hasNextPage?: boolean;
          hasPreviousPage?: boolean;
          startCursor?: string | null;
          endCursor?: string | null;
        };
      };
    };
  };

  const products =
    (json.data?.products?.nodes ?? [])
      .map(mapProductNode)
      .filter((p): p is TrialProductSummary => Boolean(p)) ?? [];

  const pageInfo = json.data?.products?.pageInfo;
  return {
    products,
    pageInfo: {
      hasNextPage: Boolean(pageInfo?.hasNextPage),
      hasPreviousPage: Boolean(pageInfo?.hasPreviousPage),
      startCursor: pageInfo?.startCursor ?? null,
      endCursor: pageInfo?.endCursor ?? null,
    },
  };
}

/** 拉取单个商品展示信息 + 店铺主域名。 */
export async function loadTrialProductDetail(
  admin: AdminGraphql,
  productId: string,
): Promise<{
  product: TrialProductSummary | null;
  primaryDomain: string | null;
}> {
  const response = await admin.graphql(
    `#graphql
      query TrialTranslateProductDetail($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          onlineStoreUrl
          featuredImage {
            url
          }
        }
        shop {
          primaryDomain {
            url
          }
        }
      }
    `,
    { variables: { id: productId } },
  );

  const json = (await response.json()) as {
    data?: {
      product?: {
        id?: string;
        title?: string;
        handle?: string;
        onlineStoreUrl?: string | null;
        featuredImage?: { url?: string | null } | null;
      } | null;
      shop?: { primaryDomain?: { url?: string | null } | null };
    };
  };

  return {
    product: mapProductNode(json.data?.product ?? {}) ?? null,
    primaryDomain: json.data?.shop?.primaryDomain?.url ?? null,
  };
}
