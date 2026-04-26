import { NextResponse } from 'next/server';

import { buildDinnerRecommendationPayload, buildFallbackDinnerRecommendations } from '@/lib/dinner-engine';
import { fetchSchoolLunch, isValidNeisDate } from '@/lib/neis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const officeCode = searchParams.get('officeCode')?.trim();
  const schoolCode = searchParams.get('schoolCode')?.trim();
  const date = searchParams.get('date')?.trim();

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

    if (!lunch) {
      return NextResponse.json({ error: 'Lunch not found', ...buildFallbackDinnerRecommendations() }, { status: 404 });
    }

    return NextResponse.json(buildDinnerRecommendationPayload(lunch));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '추천 정보를 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}
