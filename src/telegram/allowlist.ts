export function parseAllowlist(ids: string): string[] {
  return [...new Set(ids.split(',').map((id) => id.trim()).filter(Boolean))];
}

export function isAllowedUserId(userId: string | number, allowlist: readonly string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.includes(String(userId));
}
