import {
  getTranslationFieldConstraintHints,
  getTranslationFieldRule,
  type TranslationConstraintOrigin,
  type TranslationFieldRule,
} from "./translationFieldLimits.js";
import {
  resolveTranslationScene,
  type FieldContentClass,
  type TranslationAudience,
  type TranslationPromptProfileId,
  type TranslationRewriteFreedom,
  type TranslationRole,
  type TranslationScene,
} from "./translationSceneResolver.js";

export type TranslationConstraintSet = {
  preserveHtmlStructure: boolean;
  preserveJsonStructure: boolean;
  preserveSentinels: boolean;
  preservePlaceholders: boolean;
  noHtmlTagsInLeaf: boolean;
  keepLeadingTrailingWhitespace: boolean;
  maxChars?: number;
  recommendedMaxChars?: number;
  mustBeSlugLike?: boolean;
  shortUiLabelPreferred?: boolean;
  fieldHints: Array<{
    code: string;
    origin: TranslationConstraintOrigin;
    promptText: string;
    maxChars?: number;
  }>;
};

export type ResolvedTranslationPromptContext = {
  promptProfileId: TranslationPromptProfileId;
  scene: TranslationScene;
  role: TranslationRole | null;
  module: string | null;
  contentClass: FieldContentClass;
  fieldKind: TranslationFieldRule["fieldKind"];
  audience: TranslationAudience;
  rewriteFreedom: TranslationRewriteFreedom;
  constraints: TranslationConstraintSet;
};

export type TranslationPromptPlan = {
  task: {
    scene: TranslationScene;
    role: TranslationRole | null;
    fieldKind: TranslationFieldRule["fieldKind"];
    fieldRule: TranslationFieldRule;
    audience: TranslationAudience;
    rewriteFreedom: TranslationRewriteFreedom;
    contentClass: FieldContentClass;
    module: string | null;
  };
  constraints: TranslationConstraintSet;
  debugReasons: string[];
};

export function buildResolvedPromptContext(args: {
  module?: string | null;
  key: string;
  contentClass: FieldContentClass;
  shopifyType?: string | null;
}): ResolvedTranslationPromptContext {
  const resolution = resolveTranslationScene({
    module: args.module,
    key: args.key,
    contentClass: args.contentClass,
    shopifyType: args.shopifyType,
  });
  const fieldRule = getTranslationFieldRule(resolution.fieldKind);

  return {
    ...resolution,
    constraints: {
      preserveHtmlStructure:
        resolution.contentClass === "html" || resolution.contentClass === "liquid_html",
      preserveJsonStructure:
        resolution.contentClass === "json" || resolution.contentClass === "list",
      preserveSentinels: true,
      preservePlaceholders: true,
      noHtmlTagsInLeaf: true,
      keepLeadingTrailingWhitespace: true,
      maxChars: fieldRule.maxChars,
      recommendedMaxChars: fieldRule.recommendedMaxChars,
      mustBeSlugLike: fieldRule.mustBeSlugLike,
      shortUiLabelPreferred: fieldRule.shortUiLabelPreferred,
      fieldHints: getTranslationFieldConstraintHints(fieldRule),
    },
  };
}

export function buildPromptPlan(
  context: ResolvedTranslationPromptContext,
): TranslationPromptPlan {
  const fieldRule = getTranslationFieldRule(context.fieldKind);
  const debugReasons: string[] = [
    `profile:${context.promptProfileId}`,
    `scene:${context.scene}`,
    `content:${context.contentClass}`,
  ];
  for (const hint of context.constraints.fieldHints) {
    debugReasons.push(`constraint:${hint.code}:${hint.origin}`);
  }

  return {
    task: {
      scene: context.scene,
      role: context.role,
      fieldKind: context.fieldKind,
      fieldRule,
      audience: context.audience,
      rewriteFreedom: context.rewriteFreedom,
      contentClass: context.contentClass,
      module: context.module,
    },
    constraints: context.constraints,
    debugReasons,
  };
}

export function buildPromptContextBlock(
  context: ResolvedTranslationPromptContext,
): string | null {
  const plan = buildPromptPlan(context);
  const lines: string[] = [];

  lines.push(
    `Task profile: ${plan.task.scene.replace(/_/g, " ")} (${plan.task.contentClass.replace(/_/g, " ")})`,
  );

  if (plan.task.role) {
    lines.push(`Field role: ${plan.task.role.replace(/_/g, " ")}`);
  }

  if (plan.task.module) {
    lines.push(`Module context: ${plan.task.module}`);
  }

  if (plan.task.audience === "merchant") {
    lines.push("Audience: merchant admin UI copy. Keep wording clear and compact.");
  } else if (plan.task.audience === "system") {
    lines.push("Audience: system-facing value. Preserve stability over flourish.");
  } else {
    lines.push("Audience: storefront shoppers. Keep wording natural and conversion-safe.");
  }

  if (plan.task.rewriteFreedom === "strict") {
    lines.push("Rewrite freedom: strict. Preserve intent and shape very closely.");
  } else if (plan.task.rewriteFreedom === "balanced") {
    lines.push("Rewrite freedom: balanced. Improve clarity, but stay compact and faithful.");
  } else {
    lines.push("Rewrite freedom: adaptive. Natural e-commerce phrasing is allowed.");
  }

  for (const hint of plan.constraints.fieldHints) {
    lines.push(hint.promptText);
  }

  if (plan.constraints.preserveHtmlStructure) {
    lines.push("Preserve HTML text-node structure exactly; do not invent or drop tags.");
  }

  if (plan.constraints.preserveJsonStructure) {
    lines.push("Preserve JSON/list structure exactly; only translate human-readable text leaves.");
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
