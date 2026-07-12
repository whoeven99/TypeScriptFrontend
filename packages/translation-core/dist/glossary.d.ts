/**
 * Per-shop glossary injected into the translation system prompt so wording
 * stays consistent.
 *
 * Source of truth: TSF Prisma/Turso `Glossary` table (迁移自旧 Java 术语表)。
 * 适用范围过滤与 Java GlossaryService 一致：rangeCode == target 或 "ALL"。
 *
 * 产出的行做了确定性排序，使系统提示词前缀字节稳定 → 命中 LLM 的 prompt 缓存。
 */
export type GlossaryTerm = {
    source: string;
    translations?: Record<string, string>;
    doNotTranslate?: boolean;
    note?: string;
};
/**
 * 返回某店 + target 语言的术语表指令行（从 TSF Turso 读）。
 * 无术语表或 TSF 未配置时返回空数组。进程内缓存 5 分钟。永不抛错。
 */
export declare function loadGlossaryLines(shopName: string, target: string): Promise<string[]>;
/** @internal test helper to reset the in-memory cache. */
export declare function __clearGlossaryCache(): void;
//# sourceMappingURL=glossary.d.ts.map