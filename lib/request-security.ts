const MAX_RATE_REQUESTS = 30;
const RATE_WINDOW_MS = 60_000;
type RateWindow = { count: number; resetAt: number };
type RecentHistoryEntry = { schoolKey: string; userKey: string; recommendedAt: string; menuId: string };
const rateWindows = new Map<string, RateWindow>();
function clientBucket(headers: Headers) {
  if (process.env.TRUST_PROXY_RATE_LIMIT === 'true') {
    const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded && /^[0-9a-fA-F:.]{3,64}$/.test(forwarded)) return `ip:${forwarded}`;
  }
  return 'shared-process';
}
export function allowRequest(headers: Headers, now = Date.now()) {
  const bucket = clientBucket(headers); const current = rateWindows.get(bucket);
  if (!current || current.resetAt <= now) { rateWindows.set(bucket, { count: 1, resetAt: now + RATE_WINDOW_MS }); return { allowed: true, retryAfterSeconds: 0 }; }
  if (current.count >= MAX_RATE_REQUESTS) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1; return { allowed: true, retryAfterSeconds: 0 };
}
export function isSafeCode(value: string) { return /^[A-Z0-9]{2,20}$/.test(value); }
export function isWithinUrlLimit(url: string) { return new TextEncoder().encode(url).length <= 4096; }
function isRecentHistoryEntry(entry: unknown): entry is RecentHistoryEntry {
  if (!entry || typeof entry !== 'object') return false;
  const value = entry as Record<string, unknown>;
  return typeof value.schoolKey === 'string' && value.schoolKey.length <= 64 &&
    typeof value.userKey === 'string' && value.userKey.length <= 64 &&
    typeof value.recommendedAt === 'string' && /^\d{8}$/.test(value.recommendedAt) &&
    typeof value.menuId === 'string' && value.menuId.length <= 128;
}
export function parseRecentHistory(rawValue: string | null) {
  if (!rawValue || new TextEncoder().encode(rawValue).length > 4096) return [] as RecentHistoryEntry[];
  try { const parsed: unknown = JSON.parse(rawValue); return Array.isArray(parsed) && parsed.length <= 30 ? parsed.filter(isRecentHistoryEntry) : []; }
  catch { return [] as RecentHistoryEntry[]; }
}
export function __resetRequestSecurityForTests() { rateWindows.clear(); }