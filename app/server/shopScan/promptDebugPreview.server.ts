import {
  buildPromptContextBlock,
  buildResolvedPromptContext,
  type FieldContentClass,
} from "@ciwi/translation-core";
import type {
  ThemeSceneProfileView,
  TranslationContextProfileView,
} from "~/server/shopScan/artifacts.server";

export type PromptRoutingPreviewRow = {
  key: string;
  module: string;
  keyPattern: string;
  namespace: string | null;
  resourcePattern: string | null;
  contentClass: Exclude<FieldContentClass, "skip">;
  scanScene: string;
  resolvedScene: string;
  scanRole: string | null;
  resolvedRole: string | null;
  promptProfileId: string;
  jsonMode: string | null;
  tonePreference: string;
  creativity: string;
  confidence: number;
  matchesScene: boolean;
};

export type PromptBlockPreview = {
  key: string;
  title: string;
  promptProfileId: string;
  scene: string;
  namespace: string | null;
  resourcePattern: string | null;
  block: string;
};

export type ShopScanDebugPreview = {
  promptRoutingRows: PromptRoutingPreviewRow[];
  promptBlocks: PromptBlockPreview[];
};

const MAX_PREVIEW_ROWS = 12;
const MAX_BLOCKS = 3;

export function buildShopScanDebugPreview(args: {
  themeSceneProfile: ThemeSceneProfileView | null;
  translationContextProfile: TranslationContextProfileView | null;
}): ShopScanDebugPreview {
  const sceneHints = args.themeSceneProfile?.sceneHints ?? [];
  const modulePolicyByModule = new Map(
    (args.translationContextProfile?.modulePolicyProfile?.moduleHints ?? []).map((hint) => [
      hint.module.trim().toUpperCase(),
      hint,
    ]),
  );

  const promptRoutingRows = sceneHints.slice(0, MAX_PREVIEW_ROWS).map((hint, index) => {
    const contentClass = guessPreviewContentClass(hint.keyPattern, hint.scene, hint.role);
    const modulePolicy = modulePolicyByModule.get(hint.module.trim().toUpperCase()) ?? null;
    const resolved = buildResolvedPromptContext({
      module: hint.module,
      resourceId: hint.resourcePattern ?? undefined,
      key: hint.keyPattern,
      contentClass,
      base: {
        module: hint.module,
        resourceId: hint.resourcePattern ?? undefined,
        shopContext: args.translationContextProfile?.shopContext ?? null,
        terminology: args.translationContextProfile?.terminologyProfile ?? null,
        market: args.translationContextProfile?.marketProfile ?? null,
        themeSceneProfile: args.translationContextProfile?.themeSceneProfile
          ? {
              sceneHints: args.translationContextProfile.themeSceneProfile.sceneHints,
            }
          : null,
        modulePolicy,
      },
    });

    return {
      key: `${hint.module}-${hint.keyPattern}-${index}`,
      module: hint.module,
      keyPattern: hint.keyPattern,
      namespace: hint.namespace,
      resourcePattern: hint.resourcePattern,
      contentClass,
      scanScene: hint.scene,
      resolvedScene: resolved.scene,
      scanRole: hint.role,
      resolvedRole: resolved.role,
      promptProfileId: resolved.promptProfileId,
      jsonMode: resolved.jsonMode,
      tonePreference: hint.tonePreference,
      creativity: hint.creativity,
      confidence: hint.confidence,
      matchesScene: hint.scene === resolved.scene,
    };
  });

  const promptBlocks = promptRoutingRows
    .map((row, index) => {
      const modulePolicy = modulePolicyByModule.get(row.module.trim().toUpperCase()) ?? null;
      const resolved = buildResolvedPromptContext({
        module: row.module,
        resourceId: row.resourcePattern ?? undefined,
        key: row.keyPattern,
        contentClass: row.contentClass,
        base: {
          module: row.module,
          resourceId: row.resourcePattern ?? undefined,
          shopContext: args.translationContextProfile?.shopContext ?? null,
          terminology: args.translationContextProfile?.terminologyProfile ?? null,
          market: args.translationContextProfile?.marketProfile ?? null,
          themeSceneProfile: args.translationContextProfile?.themeSceneProfile
            ? {
                sceneHints: args.translationContextProfile.themeSceneProfile.sceneHints,
              }
            : null,
          modulePolicy,
        },
      });
      const block = buildPromptContextBlock(resolved, {
        sourceText: row.keyPattern,
      });
      if (!block) return null;
      return {
        key: `block-${row.key}-${index}`,
        title: `${row.module} / ${row.keyPattern}`,
        promptProfileId: resolved.promptProfileId,
        scene: resolved.scene,
        namespace: row.namespace,
        resourcePattern: row.resourcePattern,
        block,
      };
    })
    .filter((row): row is PromptBlockPreview => Boolean(row))
    .slice(0, MAX_BLOCKS);

  return {
    promptRoutingRows,
    promptBlocks,
  };
}

function guessPreviewContentClass(
  keyPattern: string,
  scene: string,
  role: string | null,
): Exclude<FieldContentClass, "skip"> {
  const blob = `${keyPattern} ${scene} ${role ?? ""}`.toLowerCase();
  if (/json|schema|config|setting|settings|blocks/.test(blob)) return "json";
  if (/richtext|rich_text|html/.test(blob)) return "html";
  if (/body|content|description|message|text/.test(blob)) {
    return scene === "product_catalog" ? "plain" : "html";
  }
  if (/items|bullets|list/.test(blob)) return "list";
  return "plain";
}
