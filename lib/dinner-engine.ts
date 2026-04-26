import productionDataset from '@/datasets/2025/production_final_dataset_2025.json';
import type { NeisLunch } from '@/lib/neis';

export type ProductionDinner = (typeof productionDataset)[number];

export type LunchAftertaste = 'spicy_heavy' | 'greasy_heavy' | 'noodle_fatigue' | 'rice_missing' | 'comfort_saturated';
export type DinnerResponse = 'bland_reset' | 'broth_reset' | 'rice_anchor' | 'daily_stabilizer' | 'treat_continuation';

export type LunchSignals = {
  hasFried: boolean;
  hasSpicy: boolean;
  isHeavy: boolean;
  mealType: 'fried-heavy' | 'starch-heavy' | 'hearty-soup' | 'balanced';
  proteinPreference: 'lighter-protein' | 'diverse-protein' | 'comforting';
  proteinTags: string[];
  keywords: string[];
  lunchAftertaste: LunchAftertaste[];
};

export type DinnerRecommendation = {
  menuId: string;
  displayName: string;
  canonicalName: string;
  prepDifficulty: string;
  sideDishes: string[];
  recipeUrl: string;
  reason: string;
  score: number;
};

export type DinnerRecommendationPayload = {
  lunch: NeisLunch;
  lunchSummary: {
    hasFried: boolean;
    hasSpicy: boolean;
    isHeavy: boolean;
    densityLabel: string;
    summaryLabel: string;
  };
  lunchTags: string[];
  bridgeComment: string;
  recommendations: DinnerRecommendation[];
};

export type FallbackDinnerRecommendationPayload = {
  recommendations: DinnerRecommendation[];
  bridgeComment: string;
};

const SOUP_KEYWORDS = ['국', '탕', '찌개', '수제비', '쌀국수', '순두부', '미역국', '된장국'];
const LIGHT_KEYWORDS = ['두부', '야채', '버섯', '아욱', '순두부', '수제비', '쌀국수'];
const primaryProteinKeywords: Record<string, string[]> = {
  '콩/두부': ['두부', '순두부', '콩', '비지'],
  해산물: ['해물', '낙지', '오징어', '새우', '고등어', '갈치', '꽃게', '참치', '연어', '조개'],
  가금류: ['닭', '찜닭', '치킨', '오리'],
  돼지고기: ['돼지', '돈까스', '돈육', '제육', '수육', '보쌈'],
  소고기: ['쇠고기', '소고기', '불고기', '갈비', '한우'],
};
const starchHeavyKeywords = ['볶음밥', '짜장', '카레', '파스타', '떡볶이', '덮밥', '비빔밥', '쫄면'];
const heartySoupKeywords = ['갈비탕', '순두부', '찌개', '국', '탕', '수제비', '쌀국수', '된장국', '미역국'];
const NOISE_KEYWORDS = [
  '정식',
  '볶음밥',
  '밥',
  '김치',
  '배추김치',
  '깍두기',
  '샐러드',
  '무침',
  '나물',
  '주스',
  '과일',
  '우유',
  '요거트',
  '요구르트',
  '소스',
];
const SIDE_DISH_EXCLUSION_KEYWORDS = ['밥', '우유', '요구르트', '요거트', '수박', '바나나', '토마토', '푸딩', '과일', '주스', '사과'];

function normalizeText(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function buildRecipeSearchUrl(dinner: ProductionDinner) {
  const query = dinner.main_dishes[0] ?? dinner.canonical_name ?? dinner.display_name;
  return `https://www.10000recipe.com/recipe/list.html?q=${encodeURIComponent(query)}`;
}

function getRecommendedSideDishes(dinner: ProductionDinner) {
  const mainDish = dinner.main_dishes[0] ?? dinner.canonical_name;
  const normalizedMainDish = normalizeText(mainDish);

  const dishes = dinner.representative_menus
    .flatMap((menu) => menu.split(','))
    .map((item) => item.replace(/[.·]/g, ' ').trim())
    .filter(Boolean)
    .filter((item) => normalizeText(item) !== normalizedMainDish)
    .filter((item) => !item.includes(dinner.canonical_name))
    .filter((item) => SIDE_DISH_EXCLUSION_KEYWORDS.every((keyword) => !item.includes(keyword)));

  return Array.from(new Set(dishes)).slice(0, 3);
}

function extractLunchKeywords(menuItems: string[]) {
  return Array.from(
    new Set(
      menuItems
        .flatMap((item) => item.split(/[\s,/]+/))
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
        .filter((item) => NOISE_KEYWORDS.every((keyword) => item !== keyword && !item.endsWith(keyword))),
    ),
  ).slice(0, 12);
}

function extractLunchProteinTags(menuItems: string[]) {
  const menuText = menuItems.join(' ');
  return Object.entries(primaryProteinKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => menuText.includes(keyword)))
    .map(([tag]) => tag);
}

function classifyMealType(menuItems: string[], flags: { hasFried: boolean; isHeavy: boolean }) {
  const menuText = menuItems.join(' ');
  if (flags.hasFried) return 'fried-heavy' as const;
  if (starchHeavyKeywords.some((keyword) => menuText.includes(keyword))) return 'starch-heavy' as const;
  if (heartySoupKeywords.some((keyword) => menuText.includes(keyword))) return 'hearty-soup' as const;
  if (flags.isHeavy) return 'starch-heavy' as const;
  return 'balanced' as const;
}

function classifyProteinPreference(mealType: LunchSignals['mealType'], proteinTags: string[]) {
  if (mealType === 'fried-heavy' || mealType === 'starch-heavy') return 'lighter-protein' as const;
  if (proteinTags.length >= 2) return 'diverse-protein' as const;
  return 'comforting' as const;
}

function deriveLunchAftertaste(summary: Pick<LunchSignals, 'hasFried' | 'hasSpicy' | 'isHeavy' | 'keywords'> & { menuText: string }) {
  const keywordText = summary.keywords.join(' ');
  const lunchAftertaste: LunchAftertaste[] = [];
  const comfortSaturated =
    summary.hasSpicy &&
    summary.isHeavy &&
    (summary.hasFried || ['치킨', '강정', '텐더', '돈까스', '탕수육', '카레', '볶음밥'].some((keyword) => keywordText.includes(keyword) || summary.menuText.includes(keyword)));

  if (summary.hasSpicy && summary.isHeavy) {
    lunchAftertaste.push('spicy_heavy');
  } else if (summary.hasFried && summary.isHeavy) {
    lunchAftertaste.push('greasy_heavy');
  }

  if (['면', '국수', '라면', '짜장면', '짬뽕', '우동', '쫄면', '파스타'].some((keyword) => keywordText.includes(keyword) || summary.menuText.includes(keyword))) {
    lunchAftertaste.push('noodle_fatigue');
  } else if (['덮밥', '볶음밥', '비빔밥', '카레', '오므라이스'].some((keyword) => keywordText.includes(keyword) || summary.menuText.includes(keyword)) && !comfortSaturated) {
    lunchAftertaste.push('rice_missing');
  }

  if (comfortSaturated) {
    lunchAftertaste.push('comfort_saturated');
  }

  return Array.from(new Set(lunchAftertaste));
}

function deriveDinnerResponse(dinner: ProductionDinner) {
  const dinnerResponses: DinnerResponse[] = [];
  const mealStyle = dinner.taxonomy.meal_style;
  const comfortLevel = dinner.taxonomy.comfort_level;
  const dinnerFit = dinner.taxonomy.dinner_fit;
  const comfortPush = comfortLevel === 'hearty' && (dinnerFit === 'special' || mealStyle === 'one_plate' || dinner.attributes.fried);

  if (!dinner.attributes.spicy) {
    dinnerResponses.push('bland_reset');
  }
  if ((!dinner.attributes.fried && (comfortLevel === 'light' || ['soup_set', 'stew_set', 'noodle_soup_set'].includes(mealStyle))) || ['soup_set', 'stew_set', 'noodle_soup_set'].includes(mealStyle)) {
    dinnerResponses.push('broth_reset');
  }
  if (['main_side_set', 'braised_set'].includes(mealStyle)) {
    dinnerResponses.push('rice_anchor');
  }
  if (dinnerFit === 'everyday' && comfortLevel !== 'hearty') {
    dinnerResponses.push('daily_stabilizer');
  }
  if (comfortPush) {
    dinnerResponses.push('treat_continuation');
  }

  return Array.from(new Set(dinnerResponses));
}

function buildTransitionMatchPlan(lunchAftertaste: LunchAftertaste[], dinnerResponse: DinnerResponse[]) {
  const primaryNeeds: DinnerResponse[] = [];

  if (lunchAftertaste.includes('spicy_heavy')) {
    primaryNeeds.push('bland_reset', 'daily_stabilizer');
  }
  if (lunchAftertaste.includes('greasy_heavy')) {
    primaryNeeds.push('broth_reset');
  }
  if (lunchAftertaste.includes('noodle_fatigue') || lunchAftertaste.includes('rice_missing')) {
    primaryNeeds.push('rice_anchor');
  }
  if (lunchAftertaste.includes('comfort_saturated')) {
    primaryNeeds.push('daily_stabilizer');
  }

  const dedupedNeeds = Array.from(new Set(primaryNeeds));
  const matchedResponses = dedupedNeeds.filter((need) => dinnerResponse.includes(need));

  let transitionFitLabel: 'strong' | 'partial' | 'weak' | 'neutral';
  if (dedupedNeeds.length === 0) {
    transitionFitLabel = 'neutral';
  } else if (matchedResponses.length >= Math.min(2, dedupedNeeds.length)) {
    transitionFitLabel = 'strong';
  } else if (matchedResponses.length > 0) {
    transitionFitLabel = 'partial';
  } else {
    transitionFitLabel = 'weak';
  }

  return {
    primaryNeeds: dedupedNeeds,
    matchedResponses,
    transitionFitLabel,
  };
}

function transitionMatchBonus(dinner: ProductionDinner, summary: LunchSignals) {
  const dinnerResponse = deriveDinnerResponse(dinner);
  const { matchedResponses, transitionFitLabel } = buildTransitionMatchPlan(summary.lunchAftertaste, dinnerResponse);

  let bonus = 0;
  if (transitionFitLabel === 'strong') bonus += 20;
  else if (transitionFitLabel === 'partial') bonus += 9;

  bonus += matchedResponses.length * 4;

  if (summary.lunchAftertaste.includes('rice_missing')) {
    if (dinnerResponse.includes('daily_stabilizer')) bonus += 8;
    if (dinnerResponse.includes('treat_continuation')) bonus -= 8;
  }

  if (summary.lunchAftertaste.includes('noodle_fatigue')) {
    if (dinnerResponse.includes('daily_stabilizer')) bonus += 6;
    if (dinnerResponse.includes('treat_continuation')) bonus -= 10;
  }

  if (transitionFitLabel === 'weak' && dinnerResponse.includes('treat_continuation') && summary.lunchAftertaste.includes('comfort_saturated')) {
    bonus -= 12;
  }

  return {
    bonus,
    matchedResponses,
    transitionFitLabel,
  };
}

export function summarizeLunchSignals(menuItems: string[]): LunchSignals {
  const menuText = menuItems.join(' ');
  const friedKeywords = ['튀김', '돈까스', '탕수육', '치킨', '가라아게', '전', '크로켓', '멘보샤', '후라이'];
  const spicyKeywords = ['매콤', '마라', '짬뽕', '김치찌개', '떡볶이', '불닭', '제육', '육개장'];
  const heavyKeywords = ['돈까스', '짜장', '카레', '볶음밥', '갈비', '불고기', '찌개', '떡볶이', '파스타', '마라탕'];

  const hasFried = friedKeywords.some((keyword) => menuText.includes(keyword));
  const hasSpicy = spicyKeywords.some((keyword) => menuText.includes(keyword));
  const isHeavy = heavyKeywords.some((keyword) => menuText.includes(keyword));
  const proteinTags = extractLunchProteinTags(menuItems);
  const mealType = classifyMealType(menuItems, { hasFried, isHeavy });
  const keywords = extractLunchKeywords(menuItems);
  const lunchAftertaste = deriveLunchAftertaste({ hasFried, hasSpicy, isHeavy, keywords, menuText });

  return {
    hasFried,
    hasSpicy,
    isHeavy,
    mealType,
    proteinPreference: classifyProteinPreference(mealType, proteinTags),
    proteinTags,
    keywords,
    lunchAftertaste,
  };
}

function buildBridgeComment(summary: LunchSignals) {
  if (summary.hasFried && summary.hasSpicy) {
    return '점심이 기름지고 자극적이었어서, 저녁은 더 편안한 메뉴들로 골랐어요.';
  }

  if (summary.hasFried) {
    return '점심이 조금 무거웠어서, 저녁은 더 담백한 메뉴들로 골랐어요.';
  }

  if (summary.hasSpicy) {
    return '점심이 매콤했어서, 저녁은 자극을 낮춘 메뉴들로 골랐어요.';
  }

  if (summary.mealType === 'starch-heavy') {
    return '점심이 탄수화물 중심이었어서, 저녁은 단백질 균형을 더한 메뉴들로 골랐어요.';
  }

  if (summary.proteinPreference === 'diverse-protein') {
    return '점심 구성이 든든했어서, 저녁은 부담 없이 이어갈 메뉴들로 골랐어요.';
  }

  if (summary.isHeavy) {
    return '점심이 든든했어서, 저녁은 무게를 덜어낸 메뉴들로 골랐어요.';
  }

  return '점심 흐름에 맞춰 가볍게 이어갈 메뉴들로 골랐어요.';
}

function getLunchTags(summary: LunchSignals) {
  const tags: string[] = [];
  if (summary.hasFried) tags.push('튀김 있음');
  if (summary.hasSpicy) tags.push('매콤함');
  if (summary.isHeavy) tags.push('든든한 구성');
  if (tags.length === 0) tags.push('균형 잡힌 구성');
  return tags;
}

function getLunchDensityLabel(lunch: NeisLunch, summary: LunchSignals) {
  const calories = lunch.calories ?? 0;

  if (summary.hasFried || summary.isHeavy || summary.mealType === 'starch-heavy' || calories >= 760) {
    return '든든한 구성';
  }

  if (summary.mealType === 'balanced' || calories >= 560) {
    return '균형 잡힌 구성';
  }

  return '가벼운 구성';
}

function getLunchSummaryLabel(lunch: NeisLunch, summary: LunchSignals) {
  const calories = lunch.calories ?? 0;

  if (summary.hasFried && summary.hasSpicy) {
    return '기름지고 매콤한 편';
  }

  if (summary.hasFried) {
    return '기름진 편';
  }

  if (summary.hasSpicy && summary.isHeavy) {
    return '매콤하고 든든한 편';
  }

  if (summary.hasSpicy) {
    return '매콤한 편';
  }

  if (summary.mealType === 'starch-heavy') {
    return '든든한 한 그릇형';
  }

  if (summary.mealType === 'hearty-soup' && calories >= 560) {
    return '국물 있는 한 끼';
  }

  return '담백한 편';
}

function proteinDiversityBonus(dinner: ProductionDinner, summary: LunchSignals) {
  const dinnerProteinTags = dinner.protein_tags ?? [];
  if (summary.proteinPreference === 'lighter-protein') {
    if (dinnerProteinTags.includes('콩/두부')) return 10;
    if (dinnerProteinTags.includes('해산물')) return 8;
    if (dinnerProteinTags.includes('가금류')) return 6;
    return 0;
  }

  if (summary.proteinPreference === 'diverse-protein') {
    return dinnerProteinTags.some((tag) => !summary.proteinTags.includes(tag)) ? 7 : 0;
  }

  if (summary.mealType === 'hearty-soup') {
    return dinnerProteinTags.includes('콩/두부') || dinnerProteinTags.includes('해산물') ? 5 : 0;
  }

  return dinnerProteinTags.length > 0 ? 3 : 0;
}

function classifyDinnerCategory(dinner: ProductionDinner) {
  const dinnerText = `${dinner.display_name} ${dinner.canonical_name} ${dinner.main_dishes.join(' ')}`;
  if (SOUP_KEYWORDS.some((keyword) => dinnerText.includes(keyword))) return 'soup';
  if (dinner.attributes.spicy) return 'spicy';
  if (dinner.attributes.fried) return 'fried';
  if (starchHeavyKeywords.some((keyword) => dinnerText.includes(keyword))) return 'starch';
  return 'balanced';
}

function selectDiverseRecommendations(
  scoredCandidates: Array<{ dinner: ProductionDinner; score: number }>,
  limit: number,
  candidatePoolSize = 9,
  summary?: LunchSignals,
  rotationSeed?: string,
) {
  // 추천 다양성: 상위권 안정성을 유지하면서 단백질군/메뉴 타입 반복은 완만하게 줄인다.
  const shortlisted = scoredCandidates.slice(0, candidatePoolSize);
  const selected: Array<{ dinner: ProductionDinner; score: number }> = [];
  const seenProteinTags = new Set<string>();
  const seenMealCategories = new Set<string>();
  const neutralShortlisted = [...shortlisted].sort((left, right) => {
    const leftCategory = classifyDinnerCategory(left.dinner);
    const rightCategory = classifyDinnerCategory(right.dinner);
    const neutralVarietyBonus = (candidate: { dinner: ProductionDinner; score: number }, category: string) => {
      let bonus = 0;
      if (candidate.dinner.taxonomy.dinner_fit === 'everyday') bonus += 4;
      else if (candidate.dinner.taxonomy.dinner_fit === 'flexible') bonus += 2;
      if (category !== 'soup') bonus += 6;
      if (candidate.dinner.taxonomy.comfort_level !== 'hearty') bonus += 2;
      return bonus;
    };

    if (summary?.lunchAftertaste.length === 0) {
      const leftAdjusted = left.score + neutralVarietyBonus(left, leftCategory);
      const rightAdjusted = right.score + neutralVarietyBonus(right, rightCategory);
      if (rightAdjusted !== leftAdjusted) return rightAdjusted - leftAdjusted;
    }

    if (right.score !== left.score) return right.score - left.score;
    return right.dinner.popularity.occurrence_count - left.dinner.popularity.occurrence_count;
  });
  const rotatedNeutralPool = (() => {
    if (summary?.lunchAftertaste.length === 0 && rotationSeed && neutralShortlisted.length > 1) {
      const seedValue = Array.from(rotationSeed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const rotationOffset = seedValue % Math.min(3, neutralShortlisted.length);
      return [...neutralShortlisted.slice(rotationOffset), ...neutralShortlisted.slice(0, rotationOffset)];
    }
    return neutralShortlisted;
  })();
  const rankedShortlisted = summary?.lunchAftertaste.length === 0 ? rotatedNeutralPool : shortlisted;
  const remainingCandidates = [...rankedShortlisted];

  while (remainingCandidates.length > 0 && selected.length < limit) {
    const rankedByVarietyScore = remainingCandidates
      .map((candidate) => {
        const category = classifyDinnerCategory(candidate.dinner);
        const repeatedCategoryPenalty = seenMealCategories.has(category) ? 6 : 0;
        const repeatedProteinPenalty = candidate.dinner.protein_tags.filter((tag) => seenProteinTags.has(tag)).length * 3;
        return {
          candidate,
          category,
          adjustedScore: candidate.score - repeatedCategoryPenalty - repeatedProteinPenalty,
        };
      })
      .sort((left, right) => {
        if (right.adjustedScore !== left.adjustedScore) return right.adjustedScore - left.adjustedScore;
        return right.candidate.dinner.popularity.occurrence_count - left.candidate.dinner.popularity.occurrence_count;
      });

    const nextPick =
      rankedByVarietyScore.find(({ candidate, category }) => {
        const hasNewProtein = candidate.dinner.protein_tags.some((tag) => !seenProteinTags.has(tag));
        const hasNewCategory = !seenMealCategories.has(category);
        return selected.length === 0 || hasNewProtein || hasNewCategory;
      }) ?? rankedByVarietyScore[0];

    if (!nextPick) break;

    selected.push(nextPick.candidate);
    nextPick.candidate.dinner.protein_tags.forEach((tag) => seenProteinTags.add(tag));
    seenMealCategories.add(nextPick.category);
    const selectedIndex = remainingCandidates.indexOf(nextPick.candidate);
    if (selectedIndex >= 0) remainingCandidates.splice(selectedIndex, 1);
  }

  return selected;
}

function getRecommendationReason(dinner: ProductionDinner, summary: LunchSignals) {
  const mainDish = dinner.main_dishes[0] ?? dinner.canonical_name;
  const { matchedResponses, transitionFitLabel } = transitionMatchBonus(dinner, summary);

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('broth_reset')) {
    return `점심 뒤 기름진 흐름을 정리하기 좋은 ${mainDish} 중심 메뉴예요.`;
  }

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('bland_reset')) {
    return `점심보다 자극을 낮춰 저녁을 편안하게 이어가기 좋은 ${mainDish} 중심 메뉴예요.`;
  }

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('rice_anchor')) {
    return `점심 뒤 밥상형 저녁으로 균형을 다시 잡기 좋은 ${mainDish} 중심 메뉴예요.`;
  }

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('daily_stabilizer')) {
    return `점심 흐름 뒤 무난하게 저녁을 정리하기 좋은 ${mainDish} 중심 메뉴예요.`;
  }

  if (summary.hasFried && !dinner.attributes.fried) {
    return `점심의 기름진 흐름을 덜어줄 ${mainDish} 중심 구성이에요.`;
  }

  if (summary.mealType === 'starch-heavy' && dinner.protein_tags.some((tag) => ['콩/두부', '해산물', '가금류'].includes(tag))) {
    return `점심보다 단백질 균형을 보완하기 좋은 ${mainDish} 중심 메뉴예요.`;
  }

  if (summary.hasSpicy && !dinner.attributes.spicy) {
    return `점심보다 자극을 낮춘 ${mainDish} 중심 메뉴라 저녁에 편안하게 이어가기 좋아요.`;
  }

  if (summary.proteinPreference === 'diverse-protein' && dinner.protein_tags.some((tag) => !summary.proteinTags.includes(tag))) {
    return `점심과 다른 단백질 흐름을 더해 균형을 맞추기 좋은 ${mainDish} 중심 메뉴예요.`;
  }

  if (summary.isHeavy && dinner.nutrition.calories.avg <= 700) {
    return `점심보다 무게를 낮춘 ${mainDish} 중심 구성이라 저녁 균형이 좋아요.`;
  }

  return `오늘 점심을 바탕으로 ${mainDish} 중심 메뉴를 골랐어요.`;
}

export function scoreDinnerCandidate(dinner: ProductionDinner, summary: LunchSignals) {
  let score = 0;
  const dinnerText = `${dinner.display_name} ${dinner.canonical_name} ${dinner.main_dishes.join(' ')}`;
  const averageCalories = dinner.nutrition.calories.avg;
  const { bonus: transitionBonus } = transitionMatchBonus(dinner, summary);

  if (dinner.quality.production_ready) score += 20;
  if (dinner.quality.calorie_profile === 'stable') score += 6;
  score += Math.min(18, Math.round(dinner.popularity.occurrence_count / 18));

  if (summary.hasFried) {
    score += dinner.attributes.fried ? -18 : 18;
    if (SOUP_KEYWORDS.some((keyword) => dinnerText.includes(keyword))) score += 8;
  }

  if (summary.mealType === 'starch-heavy') {
    if (SOUP_KEYWORDS.some((keyword) => dinnerText.includes(keyword))) score += 6;
    if (dinner.nutrition.calories.avg <= 760) score += 4;
  }

  if (summary.hasSpicy) {
    score += dinner.attributes.spicy ? -16 : 16;
    if (LIGHT_KEYWORDS.some((keyword) => dinnerText.includes(keyword))) score += 6;
  }

  if (summary.mealType === 'hearty-soup') {
    if (!dinner.attributes.fried) score += 5;
    if (!SOUP_KEYWORDS.some((keyword) => dinnerText.includes(keyword))) score += 4;
  }

  score += proteinDiversityBonus(dinner, summary);
  score += transitionBonus;

  if (summary.lunchAftertaste.length === 0) {
    if (dinner.taxonomy.dinner_fit === 'everyday') score += 6;
    else if (dinner.taxonomy.dinner_fit === 'flexible') score += 2;
    else if (dinner.taxonomy.dinner_fit === 'special') score -= 8;

    if (dinner.taxonomy.comfort_level === 'hearty') score -= 4;
  }

  if (summary.isHeavy) {
    if (averageCalories <= 700) score += 10;
    else if (averageCalories >= 850) score -= 10;

    if (dinner.attributes.prep_difficulty === 'Low') score += 8;
    else if (dinner.attributes.prep_difficulty === 'Mid') score += 4;
    else score -= 6;
  }

  for (const keyword of summary.keywords) {
    if (keyword.length < 2) continue;
    if (dinnerText.includes(keyword)) {
      score -= 10;
    }
  }

  for (const lunchMenu of summary.keywords) {
    if (normalizeText(dinner.canonical_name) === normalizeText(lunchMenu)) {
      score -= 24;
    }
  }

  if (!summary.hasFried && !summary.hasSpicy && !summary.isHeavy) {
    if (!dinner.attributes.fried) score += 6;
    if (!dinner.attributes.spicy) score += 4;
  }

  return score;
}

export function buildFallbackDinnerRecommendations(limit = 3): FallbackDinnerRecommendationPayload {
  const recommendations = selectDiverseRecommendations(
    productionDataset
      .filter((dinner) => dinner.quality.production_ready)
      .map((dinner) => ({ dinner, score: dinner.popularity.occurrence_count }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.dinner.nutrition.calories.avg - right.dinner.nutrition.calories.avg;
      }),
    limit,
    9,
    undefined,
    'fallback',
  ).map(({ dinner, score }, index) => ({
      menuId: dinner.menu_id,
      displayName: dinner.display_name,
      canonicalName: dinner.canonical_name,
      prepDifficulty: dinner.attributes.prep_difficulty,
      sideDishes: getRecommendedSideDishes(dinner),
      recipeUrl: buildRecipeSearchUrl(dinner),
      reason: index === 0 ? '점심 없이도 바로 보기 좋은 대표 메뉴예요.' : '급식 정보가 없는 날에도 무난하게 고르기 좋은 메뉴예요.',
      score,
    } satisfies DinnerRecommendation));

  return {
    recommendations,
    bridgeComment: '점심 없이도 바로 볼 수 있는 저녁 메뉴예요.',
  };
}

export function buildDinnerRecommendationPayload(lunch: NeisLunch): DinnerRecommendationPayload {
  const lunchSummary = summarizeLunchSignals(lunch.menuItems);
  const recommendations = selectDiverseRecommendations(
    productionDataset
      .map((dinner) => ({ dinner, score: scoreDinnerCandidate(dinner, lunchSummary) }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (right.dinner.popularity.occurrence_count !== left.dinner.popularity.occurrence_count) {
          return right.dinner.popularity.occurrence_count - left.dinner.popularity.occurrence_count;
        }
        return left.dinner.nutrition.calories.avg - right.dinner.nutrition.calories.avg;
      })
      .filter(({ dinner }, index, items) => items.findIndex((item) => item.dinner.canonical_name === dinner.canonical_name) === index),
    3,
    9,
    lunchSummary,
    lunch.date,
  ).map(({ dinner, score }) => ({
      menuId: dinner.menu_id,
      displayName: dinner.display_name,
      canonicalName: dinner.canonical_name,
      prepDifficulty: dinner.attributes.prep_difficulty,
      sideDishes: getRecommendedSideDishes(dinner),
      recipeUrl: buildRecipeSearchUrl(dinner),
      reason: getRecommendationReason(dinner, lunchSummary),
      score,
    } satisfies DinnerRecommendation));

  return {
    lunch,
    lunchSummary: {
      hasFried: lunchSummary.hasFried,
      hasSpicy: lunchSummary.hasSpicy,
      isHeavy: lunchSummary.isHeavy,
      densityLabel: getLunchDensityLabel(lunch, lunchSummary),
      summaryLabel: getLunchSummaryLabel(lunch, lunchSummary),
    },
    lunchTags: getLunchTags(lunchSummary),
    bridgeComment: buildBridgeComment(lunchSummary),
    recommendations,
  };
}
