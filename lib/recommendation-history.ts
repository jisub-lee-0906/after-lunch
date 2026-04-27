export type RecentRecommendationExposure = {
  schoolKey: string;
  userKey: string;
  recommendedAt: string;
  menuId: string;
};

export type RecentRecommendationScope = {
  schoolKey: string;
  userKey: string;
  currentDate: string;
  recentWindowDays?: number;
};

export type AppendRecommendationHistoryParams = {
  schoolKey: string;
  userKey: string;
  recommendedAt: string;
  currentDate: string;
  recommendations: Array<Pick<RecentRecommendationExposure, 'menuId'>>;
  recentWindowDays?: number;
  maxEntries?: number;
};

const DEFAULT_RECENT_WINDOW_DAYS = 4;
const DEFAULT_MAX_HISTORY_ENTRIES = 18;

function parseYmdToUtcDayIndex(value: string) {
  if (!/^\d{8}$/.test(value)) return null;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const utcTime = Date.UTC(year, month - 1, day);

  if ([year, month, day].some((part) => !Number.isInteger(part)) || Number.isNaN(utcTime)) {
    return null;
  }

  return Math.floor(utcTime / 86400000);
}

function isRecentEnough(recommendedAt: string, currentDate: string, recentWindowDays: number) {
  const currentDayIndex = parseYmdToUtcDayIndex(currentDate);
  const recommendedDayIndex = parseYmdToUtcDayIndex(recommendedAt);

  if (currentDayIndex === null || recommendedDayIndex === null) return false;

  const dayDiff = currentDayIndex - recommendedDayIndex;
  return dayDiff >= 0 && dayDiff <= recentWindowDays;
}

function isValidExposure(entry: unknown): entry is RecentRecommendationExposure {
  return Boolean(
    entry &&
      typeof entry === 'object' &&
      typeof (entry as RecentRecommendationExposure).schoolKey === 'string' &&
      typeof (entry as RecentRecommendationExposure).userKey === 'string' &&
      typeof (entry as RecentRecommendationExposure).recommendedAt === 'string' &&
      typeof (entry as RecentRecommendationExposure).menuId === 'string',
  );
}

export function sanitizeRecentRecommendationHistory(history: unknown, currentDate: string, recentWindowDays = DEFAULT_RECENT_WINDOW_DAYS) {
  if (!Array.isArray(history)) return [] as RecentRecommendationExposure[];

  return history.filter(isValidExposure).filter((entry) => isRecentEnough(entry.recommendedAt, currentDate, recentWindowDays));
}

export function getScopedRecentRecommendationHistory(history: unknown, scope: RecentRecommendationScope) {
  const sanitizedHistory = sanitizeRecentRecommendationHistory(history, scope.currentDate, scope.recentWindowDays);
  return sanitizedHistory.filter((entry) => entry.schoolKey === scope.schoolKey && entry.userKey === scope.userKey);
}

export function appendRecentRecommendationHistory(history: unknown, params: AppendRecommendationHistoryParams) {
  const recentWindowDays = params.recentWindowDays ?? DEFAULT_RECENT_WINDOW_DAYS;
  const maxEntries = params.maxEntries ?? DEFAULT_MAX_HISTORY_ENTRIES;
  const sanitizedHistory = sanitizeRecentRecommendationHistory(history, params.currentDate, recentWindowDays);
  const nextEntries = params.recommendations.slice(0, 3).map((recommendation) => ({
    schoolKey: params.schoolKey,
    userKey: params.userKey,
    recommendedAt: params.recommendedAt,
    menuId: recommendation.menuId,
  } satisfies RecentRecommendationExposure));

  const dedupedHistory = sanitizedHistory.filter(
    (entry) =>
      !nextEntries.some(
        (nextEntry) =>
          nextEntry.schoolKey === entry.schoolKey &&
          nextEntry.userKey === entry.userKey &&
          nextEntry.recommendedAt === entry.recommendedAt &&
          nextEntry.menuId === entry.menuId,
      ),
  );

  return [...dedupedHistory, ...nextEntries].slice(-maxEntries);
}
