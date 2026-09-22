import { NextResponse } from 'next/server';
import { buildDinnerRecommendationPayload, buildFallbackDinnerRecommendations } from '@/lib/dinner-engine';
import { fetchSchoolLunch, isValidNeisDate } from '@/lib/neis';
import { allowRequest, isSafeCode, isWithinUrlLimit, parseRecentHistory } from '@/lib/request-security';
export async function GET(request: Request) {
  const rate = allowRequest(request.headers);
  if (!rate.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  if (!isWithinUrlLimit(request.url)) return NextResponse.json({ error: 'Request is too large' }, { status: 414 });
  const { searchParams } = new URL(request.url);
  const officeCode = searchParams.get('officeCode')?.trim(); const schoolCode = searchParams.get('schoolCode')?.trim(); const date = searchParams.get('date')?.trim();
  const schoolKey = searchParams.get('schoolKey')?.trim(); const userKey = searchParams.get('userKey')?.trim();
  if (!officeCode || !schoolCode || !date) return NextResponse.json({ error: 'officeCode, schoolCode, date are required' }, { status: 400 });
  if (!isSafeCode(officeCode) || !isSafeCode(schoolCode) || !isValidNeisDate(date) || (schoolKey?.length ?? 0) > 64 || (userKey?.length ?? 0) > 64) return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  const historyContext = { schoolKey, userKey, currentDate: date, recentExposureHistory: parseRecentHistory(searchParams.get('recentHistory')) };
  try { const lunch = await fetchSchoolLunch({ officeCode, schoolCode, date }); return lunch ? NextResponse.json(buildDinnerRecommendationPayload(lunch, historyContext)) : NextResponse.json({ error: 'Lunch not found', ...buildFallbackDinnerRecommendations(3, historyContext) }, { status: 404 }); }
  catch { return NextResponse.json({ error: '추천 정보를 일시적으로 사용할 수 없습니다.' }, { status: 502 }); }
}