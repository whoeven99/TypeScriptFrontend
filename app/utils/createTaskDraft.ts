/**
 * Persist translate-v4 create-task selections across Shopify billing redirects.
 * Full-page return from Admin billing wipes React state; sessionStorage keeps the draft.
 */

export type CreateTaskDraft = {
  targets: string[];
  modules: string[];
  aiModel: string;
  isCover: boolean;
  isHandle: boolean;
  savedAt: number;
};

const STORAGE_PREFIX = "ciwi:v4:createTaskDraft:";
/** Discard drafts older than 2 hours. */
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

function storageKey(shop: string): string {
  return `${STORAGE_PREFIX}${shop.trim().toLowerCase()}`;
}

function canUseSessionStorage(): boolean {
  try {
    return typeof sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

export function saveCreateTaskDraft(
  shop: string,
  draft: Omit<CreateTaskDraft, "savedAt">,
): void {
  if (!shop.trim() || !canUseSessionStorage()) return;
  const payload: CreateTaskDraft = {
    targets: [...draft.targets],
    modules: [...draft.modules],
    aiModel: draft.aiModel,
    isCover: Boolean(draft.isCover),
    isHandle: Boolean(draft.isHandle),
    savedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(storageKey(shop), JSON.stringify(payload));
  } catch {
    // quota / private mode — best-effort
  }
}

export function loadCreateTaskDraft(shop: string): CreateTaskDraft | null {
  if (!shop.trim() || !canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(shop));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreateTaskDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    if (
      typeof parsed.savedAt !== "number" ||
      !Number.isFinite(parsed.savedAt) ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS
    ) {
      clearCreateTaskDraft(shop);
      return null;
    }
    if (!Array.isArray(parsed.targets) || !Array.isArray(parsed.modules)) {
      return null;
    }
    if (typeof parsed.aiModel !== "string" || !parsed.aiModel.trim()) {
      return null;
    }
    return {
      targets: parsed.targets.map(String).filter(Boolean),
      modules: parsed.modules.map(String).filter(Boolean),
      aiModel: parsed.aiModel.trim(),
      isCover: Boolean(parsed.isCover),
      isHandle: Boolean(parsed.isHandle),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearCreateTaskDraft(shop: string): void {
  if (!shop.trim() || !canUseSessionStorage()) return;
  try {
    sessionStorage.removeItem(storageKey(shop));
  } catch {
    // ignore
  }
}
