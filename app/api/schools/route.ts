import { NextRequest, NextResponse } from 'next/server';

import { searchSchools } from '@/lib/neis';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';

  if (!query) {
    return NextResponse.json({ schools: [] });
  }

  try {
    const schools = await searchSchools(query);
    return NextResponse.json({ schools });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '학교 검색에 실패했습니다.' },
      { status: 500 },
    );
  }
}
