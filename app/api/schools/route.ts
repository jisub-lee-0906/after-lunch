import { NextRequest, NextResponse } from 'next/server';
import { searchSchools } from '@/lib/neis';
import { allowRequest, isWithinUrlLimit } from '@/lib/request-security';

export async function GET(request: NextRequest) {
  const rate = allowRequest(request.headers);
  if (!rate.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  if (!isWithinUrlLimit(request.url)) return NextResponse.json({ error: 'Request is too large' }, { status: 414 });
  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  if (!query) return NextResponse.json({ schools: [] });
  if (query.length > 80 || /[\u0000-\u001f\u007f]/.test(query)) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  try { return NextResponse.json({ schools: await searchSchools(query) }); }
  catch { return NextResponse.json({ error: '학교 검색을 일시적으로 사용할 수 없습니다.' }, { status: 502 }); }
}