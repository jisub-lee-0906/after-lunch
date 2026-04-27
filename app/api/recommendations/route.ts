import { NextResponse } from 'next/server';

import { buildDinnerRecommendationPayload, buildFallbackDinnerRecommendations, type RecommendationExposureHistoryEntry } from '@/lib/dinner-engine';
import { fetchSchoolLunch, isValidNeisDate } from '@/lib/neis';

function parseRecentHistory(rawValue: string | null) {
  if (!rawValue) return [] as RecommendationExposureHistoryEntry[];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [] as RecommendationExposureHistoryEntry[];

    return parsed.filter((entry): entry is RecommendationExposureHistoryEntry => {
      return Boolean(
        entry &&
          typeof entry === 'object' &&
          typeof entry.schoolKey === 'string' &&
          typeof entry.userKey === 'string' &&
          typeof entry.recommendedAt === 'string' &&
          typeof entry.menuId === 'string',
      );
    });
  } catch {
    return [] as RecommendationExposureHistoryEntry[];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const officeCode = searchParams.get('officeCode')?.trim();
  const schoolCode = searchParams.get('schoolCode')?.trim();
  const date = searchParams.get('date')?.trim();
  const schoolKey = searchParams.get('schoolKey')?.trim();
  const userKey = searchParams.get('userKey')?.trim();
  const recentExposureHistory = parseRecentHistory(searchParams.get('recentHistory'));

  if (!officeCode || !schoolCode || !date) {
    return NextResponse.json(
      { error: 'officeCode, schoolCode, date are required' },
      { status: 400 },
    );
  }

  if (!isValidNeisDate(date)) {
    return NextResponse.json(
      { error: 'date must be in YYYYMMDD format' },
      { status: 400 },
    );
  }

  try {
    const lunch = await fetchSchoolLunch({ officeCode, schoolCode, date });
    const historyContext = {
      schoolKey,
      userKey,
      currentDate: date,
      recentExposureHistory,
    };

    if (!lunch) {
      return NextResponse.json({ error: 'Lunch not found', ...buildFallbackDinnerRecommendations(3, historyContext) }, { status: 404 });
    }

    return NextResponse.json(buildDinnerRecommendationPayload(lunch, historyContext));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '추천 정보를 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}
