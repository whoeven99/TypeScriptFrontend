export type TranslationCoreRedisPipeline = {
    hset(key: string, values: Record<string, string | number>): TranslationCoreRedisPipeline;
    expire(key: string, seconds: number): TranslationCoreRedisPipeline;
    rpush(key: string, value: string): TranslationCoreRedisPipeline;
    ltrim(key: string, start: number, stop: number): TranslationCoreRedisPipeline;
    exec(): Promise<unknown>;
};
export type TranslationCoreRedis = {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode: "EX", seconds: number): Promise<unknown>;
    pipeline(): TranslationCoreRedisPipeline;
};
export type TranslationCoreGlossaryRow = {
    sourceText: string;
    targetText: string | null;
    rangeCode?: string | null;
    caseSensitive?: boolean;
};
export type TranslationCoreRuntime = {
    getRedis: () => TranslationCoreRedis;
    loadGlossaryRows: (shopName: string, target: string) => Promise<TranslationCoreGlossaryRow[]>;
};
export declare function configureTranslationCore(next: Partial<TranslationCoreRuntime>): void;
export declare function getTranslationCoreRedis(): TranslationCoreRedis;
export declare function hasTranslationCoreGlossaryLoader(): boolean;
export declare function loadTranslationCoreGlossaryRows(shopName: string, target: string): Promise<TranslationCoreGlossaryRow[]>;
//# sourceMappingURL=runtime.d.ts.map