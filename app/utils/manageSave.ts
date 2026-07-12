type ManageSaveResponsePayload = {
  id?: string;
  resourceId?: string;
  key?: string;
  value?: string;
};

export type ManageSaveResultItem = {
  success?: boolean;
  errorMsg?: string;
  response?: ManageSaveResponsePayload;
};

export function splitManageSaveResults(response: unknown) {
  const items = Array.isArray(response) ? (response as ManageSaveResultItem[]) : [];
  const successfulItems = items.filter((item) => item?.success === true);
  const failedItems = items.filter((item) => item?.success === false);
  const hasInvalidDigestError = failedItems.some((item) =>
    String(item?.errorMsg || "")
      .toLowerCase()
      .includes("translatable content hash is invalid"),
  );

  return {
    successfulItems,
    failedItems,
    hasInvalidDigestError,
    shouldRefresh:
      hasInvalidDigestError || successfulItems.length > 0,
  };
}

export function applyManageFlatTranslationUpdates<
  T extends { key?: string; translated?: string },
>(items: T[], successfulItems: ManageSaveResultItem[]) {
  const valueByKey = new Map<string, string>();

  successfulItems.forEach((item) => {
    const key = item?.response?.id;
    if (!key) return;
    valueByKey.set(key, item?.response?.value || "");
  });

  return items.map((item) => {
    const key = item?.key;
    if (!key || !valueByKey.has(key)) {
      return item;
    }
    return {
      ...item,
      translated: valueByKey.get(key),
    };
  });
}

export function applyManageResourceTranslationUpdates<
  T extends {
    resourceId?: string;
    translations?: Array<{ key?: string; value?: string }>;
  },
>(items: T[], successfulItems: ManageSaveResultItem[]) {
  const updatesByResourceId = new Map<
    string,
    Array<{ key: string; value: string }>
  >();

  successfulItems.forEach((item) => {
    const resourceId = item?.response?.resourceId;
    const key = item?.response?.key;
    if (!resourceId || !key) return;

    const list = updatesByResourceId.get(resourceId) || [];
    list.push({
      key,
      value: item?.response?.value || "",
    });
    updatesByResourceId.set(resourceId, list);
  });

  return items.map((item) => {
    const resourceId = item?.resourceId;
    if (!resourceId) {
      return item;
    }

    const updates = updatesByResourceId.get(resourceId);
    if (!updates?.length) {
      return item;
    }

    const translations = Array.isArray(item.translations)
      ? [...item.translations]
      : [];

    updates.forEach((update) => {
      const index = translations.findIndex(
        (translation) => translation?.key === update.key,
      );

      if (index >= 0) {
        translations[index] = {
          ...translations[index],
          value: update.value,
        };
      } else {
        translations.push(update);
      }
    });

    return {
      ...item,
      translations,
    };
  });
}
