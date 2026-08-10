const ISBN_10_PATTERN = /^\d{9}[\dXx]$/;
const ISBN_13_PATTERN = /^\d{13}$/;

export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function isValidIsbn(value: string): boolean {
  const normalized = normalizeIsbn(value);
  return ISBN_10_PATTERN.test(normalized) || ISBN_13_PATTERN.test(normalized);
}
