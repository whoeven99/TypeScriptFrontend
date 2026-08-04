type ManageTranslationItem = {
  key?: string | null;
  outdated?: boolean | null;
};

type ManageTranslationResource = {
  resourceId?: string | null;
  translations?: ManageTranslationItem[] | null;
};

export function isManageTranslationOutdated(
  source:
    | ManageTranslationResource
    | ManageTranslationResource[]
    | null
    | undefined,
  resourceId?: string | null,
  key?: string | null,
): boolean {
  if (!resourceId || !key || !source) {
    return false;
  }

  const resources = Array.isArray(source) ? source : [source];
  const resource = resources.find((item) => item?.resourceId === resourceId);
  const translation = resource?.translations?.find((item) => item?.key === key);

  return translation?.outdated === true;
}
