async function postTsfGlossary(body: Record<string, unknown>) {
  const res = await fetch("/api/translate-v4/glossary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function insertGlossaryCompat(args: {
  migrated?: boolean;
  shop?: string;
  sourceText: string;
  targetText: string;
  rangeCode: string;
  type: number;
}) {
  return postTsfGlossary({
    intent: "insert",
    sourceText: args.sourceText,
    targetText: args.targetText,
    rangeCode: args.rangeCode,
    type: args.type,
  });
}

export async function updateGlossaryCompat(args: {
  migrated?: boolean;
  shop?: string;
  data: {
    key: number;
    sourceText: string;
    targetText: string;
    rangeCode: string;
    type: number;
    status: number;
  };
}) {
  const d = args.data;
  return postTsfGlossary({
    intent: "update",
    id: d.key,
    sourceText: d.sourceText,
    targetText: d.targetText,
    rangeCode: d.rangeCode,
    type: d.type,
    status: d.status,
  });
}
