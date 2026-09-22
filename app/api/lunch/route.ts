import { NextRequest, NextResponse } from 'next/server';
import { fetchSchoolLunch, isValidNeisDate } from '@/lib/neis';
import { allowRequest, isSafeCode, isWithinUrlLimit } from '@/lib/request-security';
export async function GET(request: NextRequest) {
  const rate = allowRequest(request.headers);
  if (!rate.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  if (!isWithinUrlLimit(request.url)) return NextResponse.json({ error: 'Request is too large' }, { status: 414 });
  const officeCode = request.nextUrl.searchParams.get('officeCode')?.trim() ?? '';
  const schoolCode = request.nextUrl.searchParams.get('schoolCode')?.trim() ?? '';
  const date = request.nextUrl.searchParams.get('date')?.trim() ?? '';
  if (!officeCode || !schoolCode || !date) return NextResponse.json({ error: 'officeCode, schoolCode, date가 필요합니다.' }, { status: 400 });
  if (!isSafeCode(officeCode) || !isSafeCode(schoolCode) || !isValidNeisDate(date)) return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  try { const lunch = await fetchSchoolLunch({ officeCode, schoolCode, date }); return lunch ? NextResponse.json({ lunch }) : NextResponse.json({ lunch: null }, { status: 404 }); }
  catch { return NextResponse.json({ error: '급식 정보를 일시적으로 사용할 수 없습니다.' }, { status: 502 }); }
}