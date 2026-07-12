let runtime = {};
export function configureTranslationCore(next) {
    runtime = { ...runtime, ...next };
}
export function getTranslationCoreRedis() {
    if (!runtime.getRedis) {
        throw new Error("translation-core Redis adapter is not configured");
    }
    return runtime.getRedis();
}
export function hasTranslationCoreGlossaryLoader() {
    return Boolean(runtime.loadGlossaryRows);
}
export async function loadTranslationCoreGlossaryRows(shopName, target) {
    return runtime.loadGlossaryRows?.(shopName, target) ?? [];
}
//# sourceMappingURL=runtime.js.map