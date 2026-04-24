import { NextRequest, NextResponse } from 'next/server';

import { fetchSchoolLunch } from '@/lib/neis';

export async function GET(request: NextRequest) {
  const officeCode = request.nextUrl.searchParams.get('officeCode')?.trim() ?? '';
  const schoolCode = request.nextUrl.searchParams.get('schoolCode')?.trim() ?? '';
  const date = request.nextUrl.searchParams.get('date')?.trim() ?? '';

  if (!officeCode || !schoolCode || !date) {
    return NextResponse.json({ error: 'officeCode, schoolCode, date가 필요합니다.' }, { status: 400 });
  }

  try {
    const lunch = await fetchSchoolLunch({ officeCode, schoolCode, date });

    if (!lunch) {
      return NextResponse.json({ lunch: null }, { status: 404 });
    }

    return NextResponse.json({ lunch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '급식 조회에 실패했습니다.' },
      { status: 500 },
    );
  }
}
