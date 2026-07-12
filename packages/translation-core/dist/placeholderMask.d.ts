/**
 * Mask URLs, site paths, and template placeholders before LLM translation.
 * Canonical placeholder masking implementation shared by App and Worker.
 */
export declare function maskPlaceholders(text: string): {
    masked: string;
    tokens: string[];
};
export declare function protectedLiteralsPreserved(tokens: string[], translated: string): boolean;
export declare function placeholdersIntact(text: string, tokens: string[]): boolean;
export declare function restoreMaskedPlaceholders(decoded: string, tokens: string[]): string;
//# sourceMappingURL=placeholderMask.d.ts.map