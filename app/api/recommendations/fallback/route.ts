import { NextResponse } from 'next/server';

import { buildFallbackDinnerRecommendations } from '@/lib/dinner-engine';

export async function GET() {
  return NextResponse.json(buildFallbackDinnerRecommendations());
}
