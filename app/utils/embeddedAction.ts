export const withEmbeddedSearch = (path: string, search: string) => {
  if (!search) {
    return path;
  }

  const normalizedSearch = search.startsWith("?") ? search.slice(1) : search;
  if (!normalizedSearch) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${normalizedSearch}`;
};
