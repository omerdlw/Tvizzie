export type SearchParams = Record<string, string | string[] | undefined>;

export function readParam(
  params: SearchParams | undefined,
  key: string,
): string {
  const value = params?.[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}
