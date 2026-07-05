import { json, type LoaderFunctionArgs } from "@remix-run/node";

export const getManageTranslationLanguage = (request: Request) => {
  const url = new URL(request.url);
  return url.searchParams.get("language");
};

export const manageTranslationLanguageLoader = async ({
  request,
}: LoaderFunctionArgs) => {
  return json({
    searchTerm: getManageTranslationLanguage(request),
  });
};
