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

export type RecipeAction = {
  role: 'primary' | 'secondary';
  label: string;
  dishName: string;
  url: string;
};

export type DinnerRecommendation = {
  menuId: string;
  displayName: string;
  canonicalName: string;
  primaryDish: string;
  secondaryDish?: string;
  recipeActions: RecipeAction[];
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

export type RecommendationExposureHistoryEntry = {
  schoolKey: string;
  userKey: string;
  recommendedAt: string;
  menuId: string;
};

export type RecommendationHistoryContext = {
  schoolKey?: string;
  userKey?: string;
  currentDate?: string;
  recentExposureHistory?: RecommendationExposureHistoryEntry[];
};

const SOUP_KEYWORDS = ['국', '탕', '찌개', '수제비', '쌀국수', '순두부', '미역국', '된장국'];
const LIGHT_KEYWORDS = ['두부', '야채', '버섯', '아욱', '순두부', '수제비', '쌀국수'];
const primaryProteinKeywords: Record<string, string[]> = {
  '콩/두부': ['두부', '순두부', '콩', '비지'],
  해산물: ['해물', '낙지', '오징어', '새우', '고등어', '갈치', '꽃게', '참치', '연어', '조개'],
  가금류: ['닭', '찜닭', '치킨', '오리', '유린기'],
  돼지고기: ['돼지', '돈까스', '돈육', '제육', '수육', '보쌈', '곱창', '장육'],
  소고기: ['쇠고기', '소고기', '불고기', '갈비', '한우'],
};
const friedKeywords = ['튀김', '돈까스', '생선까스', '까스', '카츠', '탕수육', '치킨', '가라아게', '유린기', '전', '크로켓', '멘보샤', '후라이', '핫도그'];
const greasyMainKeywords = ['튀김', '돈까스', '생선까스', '까스', '카츠', '탕수육', '치킨', '가라아게', '유린기', '크로켓', '멘보샤', '후라이'];
const spicyKeywords = ['매콤', '마라', '짬뽕', '김치찌개', '떡볶이', '불닭', '제육', '육개장', '고추장구이', '마파두부'];
const heavyKeywords = ['돈까스', '생선까스', '까스', '카츠', '짜장', '카레', '볶음밥', '갈비', '불고기', '찌개', '떡볶이', '파스타', '스파게티', '마라탕', '핫도그', '비엔나', '떡갈비', '찜닭', '오리훈제', '오리쌈', '삼겹살', '편육', '수육', '함박', '순대곱창볶음', '곱창볶음', '오향장육', '장육', '유린기'];
const starchHeavyKeywords = ['볶음밥', '짜장', '카레', '파스타', '스파게티', '떡볶이', '덮밥', '비빔밥', '쫄면'];
const heartySoupKeywords = ['갈비탕', '순두부', '찌개', '국', '탕', '수제비', '쌀국수', '된장국', '미역국'];
const processedHeavyKeywords = ['핫도그', '비엔나', '소시지', '햄', '떡갈비', '강정', '텐더'];
const proteinMainKeywords = ['불고기', '갈비', '찜닭', '제육', '돈까스', '생선까스', '고등어', '조림', '볶음', '떡갈비', '치킨', '핫도그', '오리훈제', '오리쌈', '삼겹살', '편육', '수육', '함박', '순대곱창볶음', '곱창볶음', '오향장육', '장육', '유린기'];
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
const RECENT_EXPOSURE_WINDOW_DAYS = 4;
const MAX_RECENT_EXPOSURE_ENTRIES = 18;
const dinnerByMenuId = new Map(productionDataset.map((dinner) => [dinner.menu_id, dinner]));

type RecentExposureSignals = {
  recentMenuCounts: Map<string, number>;
  recentCategoryCounts: Map<string, number>;
  recentProteinCounts: Map<string, number>;
  recentPerceivedClusterCounts: Map<string, number>;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function buildRecipeSearchUrlForDish(dishName: string) {
  return `https://www.10000recipe.com/recipe/list.html?q=${encodeURIComponent(dishName)}`;
}

function getDinnerComponents(dinner: ProductionDinner) {
  const displayNameWithoutSet = dinner.display_name.replace(/\s*정식$/, '').trim();
  const comboMatch = displayNameWithoutSet.match(/^(.+?)(?:와|과)\s*(.+)$/);
  const parsedPrimaryDish = comboMatch?.[1]?.trim();
  const parsedSecondaryDish = comboMatch?.[2]?.trim();
  const primaryDish = parsedPrimaryDish || dinner.main_dishes[0] || dinner.canonical_name || displayNameWithoutSet;
  const secondaryDish = parsedSecondaryDish && normalizeText(parsedSecondaryDish) !== normalizeText(primaryDish) ? parsedSecondaryDish : undefined;

  return {
    primaryDish,
    secondaryDish,
  };
}

function buildRecipeActions(dinner: ProductionDinner): RecipeAction[] {
  const { primaryDish } = getDinnerComponents(dinner);

  return [
    {
      role: 'primary',
      label: '레시피 보기',
      dishName: primaryDish,
      url: buildRecipeSearchUrlForDish(primaryDish),
    },
  ];
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

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function scoreMatchedItems(menuItems: string[], keywords: string[]) {
  return menuItems.reduce((count, item) => count + (includesAny(item, keywords) ? 1 : 0), 0);
}

function getLunchProfile(lunch: NeisLunch, summary: LunchSignals) {
  const menuItems = lunch.menuItems;
  const menuText = menuItems.join(' ');
  const calories = lunch.calories ?? 0;
  const friedCount = scoreMatchedItems(menuItems, friedKeywords);
  const greasyMainCount = scoreMatchedItems(menuItems, greasyMainKeywords);
  const spicyCount = scoreMatchedItems(menuItems, spicyKeywords);
  const starchCount = scoreMatchedItems(menuItems, starchHeavyKeywords);
  const soupCount = scoreMatchedItems(menuItems, heartySoupKeywords);
  const processedCount = scoreMatchedItems(menuItems, processedHeavyKeywords);
  const proteinMainCount = scoreMatchedItems(menuItems, proteinMainKeywords);
  const proteinTagCount = summary.proteinTags.length;
  const calorieWeight = calories >= 980 ? 3 : calories >= 760 ? 2 : calories >= 620 ? 1 : 0;
  const heavyScore =
    friedCount * 2 +
    starchCount * 2 +
    processedCount * 2 +
    proteinMainCount * 2 +
    proteinTagCount +
    calorieWeight +
    (summary.isHeavy ? 1 : 0);
  const soupScore = soupCount > 0 ? soupCount + (includesAny(menuText, SOUP_KEYWORDS) ? 1 : 0) : 0;
  const densityScore = friedCount * 2 + starchCount * 2 + processedCount * 2 + proteinMainCount + calorieWeight + (summary.isHeavy ? 1 : 0);

  const densityLabel =
    densityScore >= 6 ||
    (starchCount >= 1 && calories >= 620) ||
    (calories >= 760 && (proteinMainCount >= 1 || processedCount >= 1 || friedCount >= 1 || starchCount >= 1))
      ? '든든한 구성'
      : densityScore >= 2 || calories >= 560
        ? '적당한 구성'
        : '가벼운 구성';

  const oneBowlStyleSignal = starchCount >= 1 && heavyScore >= 4 && friedCount === 0 && greasyMainCount === 0;

  let summaryLabel: string;
  if (greasyMainCount >= 1 && spicyCount >= 1) {
    summaryLabel = heavyScore >= 5 ? '기름지고 매콤한 편' : '매콤한 편';
  } else if (spicyCount >= 1 && heavyScore >= 5) {
    summaryLabel = '매콤하고 든든한 편';
  } else if (oneBowlStyleSignal) {
    summaryLabel = '한 그릇 메뉴가 있었던 편';
  } else if (greasyMainCount >= 1 || (friedCount >= 1 && spicyCount === 0)) {
    summaryLabel = '기름기 있는 편';
  } else if (heavyScore >= 6) {
    summaryLabel = '메인 반찬이 든든한 편';
  } else if (soupScore >= 2 && heavyScore <= 4 && calories >= 560 && calories < 760) {
    summaryLabel = '국물 메뉴가 있는 편';
  } else if (spicyCount >= 1) {
    summaryLabel = '매콤한 편';
  } else {
    summaryLabel = '자극이 적은 편';
  }

  return {
    densityLabel,
    summaryLabel,
    heavyScore,
    soupScore,
  };
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

  const hasFried = includesAny(menuText, friedKeywords);
  const hasSpicy = includesAny(menuText, spicyKeywords);
  const isHeavy = includesAny(menuText, heavyKeywords);
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

function buildBridgeComment(lunch: NeisLunch, summary: LunchSignals) {
  const profile = getLunchProfile(lunch, summary);

  if (profile.summaryLabel === '기름지고 매콤한 편') {
    return '점심이 기름지고 자극적이었어서, 저녁은 더 편안한 메뉴들로 골랐어요.';
  }

  if (profile.summaryLabel === '기름기 있는 편') {
    return '점심이 조금 진한 편이어서, 저녁은 더 담백한 메뉴들로 골랐어요.';
  }

  if (profile.summaryLabel === '매콤하고 든든한 편' || profile.summaryLabel === '매콤한 편') {
    return '점심이 매콤했어서, 저녁은 자극을 낮춘 메뉴들로 골랐어요.';
  }

  if (profile.summaryLabel === '한 그릇 메뉴가 있었던 편') {
    return '점심이 한 그릇 메뉴 위주였어서, 저녁은 단백질과 반찬 균형을 더한 메뉴들로 골랐어요.';
  }

  if (profile.summaryLabel === '메인 반찬이 든든한 편') {
    return '점심에 메인 반찬이 든든했어서, 저녁은 조금 더 편안하게 먹기 좋은 메뉴로 골랐어요.';
  }

  if (profile.summaryLabel === '국물 메뉴가 있는 편') {
    return '점심에 국물 메뉴가 있었어서, 저녁은 너무 무겁지 않은 메뉴로 골랐어요.';
  }

  if (summary.proteinPreference === 'diverse-protein') {
    return '점심 구성을 보고, 저녁은 부담 없이 먹기 좋은 메뉴로 골랐어요.';
  }

  if (summary.isHeavy) {
    return '점심이 든든했어서, 저녁은 조금 더 가볍게 먹기 좋은 메뉴로 골랐어요.';
  }

  return '오늘 점심이 비교적 가벼워서, 저녁은 편하게 먹기 좋은 메뉴로 골랐어요.';
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
  return getLunchProfile(lunch, summary).densityLabel;
}

function getLunchSummaryLabel(lunch: NeisLunch, summary: LunchSignals) {
  return getLunchProfile(lunch, summary).summaryLabel;
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

function classifyPerceivedRepeatCluster(dinner: ProductionDinner) {
  const dinnerText = `${dinner.display_name} ${dinner.canonical_name} ${dinner.main_dishes.join(' ')}`;
  if (/순두부|두부조림|연두부|두부양념조림/.test(dinnerText)) return 'tofu';
  if (/된장국|된장찌개/.test(dinnerText)) return 'doenjang';
  if (/미역국/.test(dinnerText)) return 'miyeok';
  if (/장조림/.test(dinnerText)) return 'jangjorim';
  if (/불고기/.test(dinnerText)) return 'bulgogi';
  if (/볶음밥|덮밥|비빔밥|카레|짜장/.test(dinnerText)) return 'oneplate';
  if (/국|탕|찌개|수제비/.test(dinnerText)) return 'broth';
  return 'other';
}

function stableHash(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return hash;
}

function parseYmdToUtcDayIndex(value: string) {
  if (!/^\d{8}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const utcTime = Date.UTC(year, month - 1, day);
  if (Number.isNaN(utcTime)) return null;
  return Math.floor(utcTime / 86400000);
}

function buildRecentExposureSignals(currentDate: string, context?: RecommendationHistoryContext): RecentExposureSignals {
  const recentMenuCounts = new Map<string, number>();
  const recentCategoryCounts = new Map<string, number>();
  const recentProteinCounts = new Map<string, number>();
  const recentPerceivedClusterCounts = new Map<string, number>();
  const history = context?.recentExposureHistory ?? [];

  if (!context?.schoolKey || !context?.userKey || history.length === 0) {
    return { recentMenuCounts, recentCategoryCounts, recentProteinCounts, recentPerceivedClusterCounts };
  }

  const currentDayIndex = parseYmdToUtcDayIndex(currentDate);
  if (currentDayIndex === null) {
    return { recentMenuCounts, recentCategoryCounts, recentProteinCounts, recentPerceivedClusterCounts };
  }

  for (const exposure of history.slice(-MAX_RECENT_EXPOSURE_ENTRIES)) {
    if (exposure.schoolKey !== context.schoolKey || exposure.userKey !== context.userKey) continue;

    const exposureDayIndex = parseYmdToUtcDayIndex(exposure.recommendedAt);
    if (exposureDayIndex === null) continue;

    const dayDiff = currentDayIndex - exposureDayIndex;
    if (dayDiff < 0 || dayDiff > RECENT_EXPOSURE_WINDOW_DAYS) continue;

    const dinner = dinnerByMenuId.get(exposure.menuId);
    if (!dinner) continue;

    recentMenuCounts.set(exposure.menuId, (recentMenuCounts.get(exposure.menuId) ?? 0) + 1);

    const category = classifyDinnerCategory(dinner);
    recentCategoryCounts.set(category, (recentCategoryCounts.get(category) ?? 0) + 1);

    const perceivedCluster = classifyPerceivedRepeatCluster(dinner);
    recentPerceivedClusterCounts.set(perceivedCluster, (recentPerceivedClusterCounts.get(perceivedCluster) ?? 0) + 1);

    for (const proteinTag of dinner.protein_tags) {
      recentProteinCounts.set(proteinTag, (recentProteinCounts.get(proteinTag) ?? 0) + 1);
    }
  }

  return { recentMenuCounts, recentCategoryCounts, recentProteinCounts, recentPerceivedClusterCounts };
}

function getPreferredFirstPickCategories(summary: LunchSignals | undefined, seedBase: string) {
  if (!summary) return ['balanced', 'soup', 'starch', 'spicy', 'fried'];
  if (summary.mealType === 'hearty-soup') return ['balanced', 'starch', 'soup', 'spicy', 'fried'];
  if (summary.mealType === 'starch-heavy') return ['balanced', 'soup', 'starch', 'spicy', 'fried'];
  if (summary.hasFried || summary.hasSpicy) return ['soup', 'balanced', 'starch', 'spicy', 'fried'];
  if (summary.mealType === 'balanced') return ['soup', 'balanced', 'starch', 'spicy', 'fried'];

  const neutralCategories = ['balanced', 'soup', 'starch'];
  const offset = stableHash(`${seedBase}:neutral-category`) % neutralCategories.length;
  return [...neutralCategories.slice(offset), ...neutralCategories.slice(0, offset), 'spicy', 'fried'];
}

function selectDiverseRecommendations(
  scoredCandidates: Array<{ dinner: ProductionDinner; score: number }>,
  limit: number,
  candidatePoolSize = 18,
  summary?: LunchSignals,
  rotationSeed?: string,
  recentExposureSignals?: RecentExposureSignals,
) {
  // 점수제는 유지하되, 상위 후보 풀 안에서만 다양성을 조금 더 강하게 보장한다.
  const shortlisted = scoredCandidates.slice(0, candidatePoolSize).map((candidate, shortlistRank) => ({
    ...candidate,
    shortlistRank,
  }));
  const selected: Array<{ dinner: ProductionDinner; score: number }> = [];
  const seenProteinTags = new Set<string>();
  const seenMealCategories = new Set<string>();
  const seenPerceivedClusters = new Set<string>();
  const summarySeed = summary ? `${summary.mealType}:${summary.proteinPreference}:${summary.keywords.join('|')}` : 'default';
  const seedBase = rotationSeed ?? summarySeed;
  const remainingCandidates = [...shortlisted];

  while (remainingCandidates.length > 0 && selected.length < limit) {
    const rankedByVarietyScore = remainingCandidates
      .map((candidate) => {
        const category = classifyDinnerCategory(candidate.dinner);
        const perceivedCluster = classifyPerceivedRepeatCluster(candidate.dinner);
        const hasNewProtein = candidate.dinner.protein_tags.some((tag) => !seenProteinTags.has(tag));
        const hasNewCategory = !seenMealCategories.has(category);
        const hasNewPerceivedCluster = !seenPerceivedClusters.has(perceivedCluster);
        const repeatedCategoryPenalty = seenMealCategories.has(category) ? 8 : 0;
        const repeatedProteinPenalty = candidate.dinner.protein_tags.filter((tag) => seenProteinTags.has(tag)).length * 4;
        const repeatedPerceivedClusterPenalty = seenPerceivedClusters.has(perceivedCluster) ? (selected.length === 0 ? 0 : 12) : 0;
        const recentMenuCount = recentExposureSignals?.recentMenuCounts.get(candidate.dinner.menu_id) ?? 0;
        const recentCategoryCount = recentExposureSignals?.recentCategoryCounts.get(category) ?? 0;
        const recentPerceivedClusterCount = recentExposureSignals?.recentPerceivedClusterCounts.get(perceivedCluster) ?? 0;
        const recentProteinCount = candidate.dinner.protein_tags.reduce((sum, tag) => sum + (recentExposureSignals?.recentProteinCounts.get(tag) ?? 0), 0);
        const recentExactMenuPenalty = recentMenuCount * (selected.length === 0 ? 32 : 18);
        const recentCategoryPenalty = recentCategoryCount * (selected.length === 0 ? 14 : 8);
        const recentPerceivedClusterPenalty = recentPerceivedClusterCount * (selected.length === 0 ? 18 : 10);
        const recentProteinPenalty = recentProteinCount * (selected.length === 0 ? 9 : 5);
        const noveltyBonus =
          selected.length === 0
            ? hasNewPerceivedCluster ? 2 : 0
            : (hasNewCategory ? 6 : 0) +
              (hasNewPerceivedCluster ? 8 : 0) +
              (hasNewProtein ? 4 : 0) +
              (category !== 'soup' && seenMealCategories.has('soup') ? 2 : 0);
        const selectionBaseScore = (candidatePoolSize - candidate.shortlistRank) * 3;
        const popularitySinkPenalty = selected.length === 0 ? Math.round(candidate.dinner.popularity.occurrence_count / 90) : 0;

        return {
          candidate,
          category,
          perceivedCluster,
          hasNewProtein,
          hasNewCategory,
          hasNewPerceivedCluster,
          recentMenuCount,
          recentCategoryCount,
          recentPerceivedClusterCount,
          recentProteinCount,
          adjustedScore:
            selectionBaseScore +
            noveltyBonus -
            repeatedCategoryPenalty -
            repeatedProteinPenalty -
            repeatedPerceivedClusterPenalty -
            recentExactMenuPenalty -
            recentCategoryPenalty -
            recentPerceivedClusterPenalty -
            recentProteinPenalty -
            popularitySinkPenalty,
        };
      })
      .sort((left, right) => {
        if (right.adjustedScore !== left.adjustedScore) return right.adjustedScore - left.adjustedScore;
        return right.candidate.dinner.popularity.occurrence_count - left.candidate.dinner.popularity.occurrence_count;
      });

    const topAdjustedScore = rankedByVarietyScore[0]?.adjustedScore ?? 0;
    const scoreBand = selected.length === 0 ? 6 : 4;
    const nearTopCandidates = rankedByVarietyScore.filter(({ adjustedScore }) => adjustedScore >= topAdjustedScore - scoreBand);
    const diversityEligible = nearTopCandidates.filter(
      ({ hasNewProtein, hasNewCategory, hasNewPerceivedCluster }) => selected.length === 0 || hasNewProtein || hasNewCategory || hasNewPerceivedCluster,
    );
    const candidateBand = diversityEligible.length > 0 ? diversityEligible : nearTopCandidates;

    const rankedCandidateBand = [...candidateBand].sort((left, right) => {
      if (Number(right.hasNewCategory) !== Number(left.hasNewCategory)) return Number(right.hasNewCategory) - Number(left.hasNewCategory);
      if (Number(right.hasNewPerceivedCluster) !== Number(left.hasNewPerceivedCluster)) {
        return Number(right.hasNewPerceivedCluster) - Number(left.hasNewPerceivedCluster);
      }
      if (Number(right.hasNewProtein) !== Number(left.hasNewProtein)) return Number(right.hasNewProtein) - Number(left.hasNewProtein);
      if (right.adjustedScore !== left.adjustedScore) return right.adjustedScore - left.adjustedScore;
      return right.candidate.dinner.popularity.occurrence_count - left.candidate.dinner.popularity.occurrence_count;
    });

    const forcedNewCategoryPick =
      selected.length > 0 && !rankedCandidateBand.some(({ hasNewCategory }) => hasNewCategory)
        ? rankedByVarietyScore.find(({ hasNewCategory }) => hasNewCategory)
        : undefined;
    const forcedNewPerceivedClusterPick =
      selected.length > 0 && !rankedCandidateBand.some(({ hasNewPerceivedCluster }) => hasNewPerceivedCluster)
        ? rankedByVarietyScore.find(({ hasNewPerceivedCluster }) => hasNewPerceivedCluster)
        : undefined;
    const forcedNewProteinPick =
      selected.length > 0 && !rankedCandidateBand.some(({ hasNewProtein }) => hasNewProtein)
        ? rankedByVarietyScore.find(({ hasNewProtein }) => hasNewProtein)
        : undefined;

    const nextPick =
      forcedNewCategoryPick ??
      forcedNewPerceivedClusterPick ??
      forcedNewProteinPick ??
      (selected.length === 0
        ? (() => {
            const preferredCategories = getPreferredFirstPickCategories(summary, seedBase);
            const unseenMenuBand = rankedByVarietyScore.filter(({ recentMenuCount }) => recentMenuCount === 0);
            const unseenCategoryBand = unseenMenuBand.filter(({ recentCategoryCount }) => recentCategoryCount === 0);
            const unseenClusterBand = unseenCategoryBand.filter(({ recentPerceivedClusterCount }) => recentPerceivedClusterCount === 0);
            const unseenProteinBand = unseenClusterBand.filter(({ recentProteinCount }) => recentProteinCount === 0);
            const firstPickBand =
              unseenProteinBand.length > 0
                ? unseenProteinBand
                : unseenClusterBand.length > 0
                  ? unseenClusterBand
                  : unseenCategoryBand.length > 0
                    ? unseenCategoryBand
                    : unseenMenuBand.length > 0
                      ? unseenMenuBand
                      : rankedCandidateBand;

            return [...firstPickBand].sort((left, right) => {
              if (left.recentCategoryCount !== right.recentCategoryCount) return left.recentCategoryCount - right.recentCategoryCount;
              if (left.recentPerceivedClusterCount !== right.recentPerceivedClusterCount) {
                return left.recentPerceivedClusterCount - right.recentPerceivedClusterCount;
              }
              if (left.recentProteinCount !== right.recentProteinCount) return left.recentProteinCount - right.recentProteinCount;
              if (right.adjustedScore !== left.adjustedScore) return right.adjustedScore - left.adjustedScore;
              const leftCategoryRank = preferredCategories.indexOf(left.category);
              const rightCategoryRank = preferredCategories.indexOf(right.category);
              if (leftCategoryRank !== rightCategoryRank) return leftCategoryRank - rightCategoryRank;
              return left.candidate.dinner.popularity.occurrence_count - right.candidate.dinner.popularity.occurrence_count;
            })[0];
          })()
        : rankedCandidateBand[0]);

    if (!nextPick) break;

    selected.push(nextPick.candidate);
    nextPick.candidate.dinner.protein_tags.forEach((tag) => seenProteinTags.add(tag));
    seenMealCategories.add(nextPick.category);
    seenPerceivedClusters.add(nextPick.perceivedCluster);
    const selectedIndex = remainingCandidates.indexOf(nextPick.candidate);
    if (selectedIndex >= 0) remainingCandidates.splice(selectedIndex, 1);
  }

  return selected;
}

function getRecommendationReason(dinner: ProductionDinner, summary: LunchSignals) {
  const mainDish = dinner.main_dishes[0] ?? dinner.canonical_name;
  const { matchedResponses, transitionFitLabel } = transitionMatchBonus(dinner, summary);

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('broth_reset')) {
    return `점심이 조금 진한 편이었다면, 저녁은 ${mainDish}처럼 편하게 먹기 좋은 메뉴예요.`;
  }

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('bland_reset')) {
    return `점심보다 자극을 줄인 ${mainDish} 메뉴라 저녁으로 무난해요.`;
  }

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('rice_anchor')) {
    return `점심이 한 그릇 메뉴였다면, ${mainDish}처럼 밥 반찬으로 먹기 좋은 메뉴예요.`;
  }

  if (transitionFitLabel !== 'weak' && matchedResponses.includes('daily_stabilizer')) {
    return `오늘 저녁으로 무난하게 고르기 좋은 ${mainDish} 메뉴예요.`;
  }

  if (summary.hasFried && !dinner.attributes.fried) {
    return `점심이 기름진 편이어서, ${mainDish}처럼 조금 더 담백한 메뉴예요.`;
  }

  if (summary.mealType === 'starch-heavy' && dinner.protein_tags.some((tag) => ['콩/두부', '해산물', '가금류'].includes(tag))) {
    return `점심보다 단백질 균형을 더하기 좋은 ${mainDish} 메뉴예요.`;
  }

  if (summary.hasSpicy && !dinner.attributes.spicy) {
    return `점심보다 맵지 않게 ${mainDish}로 이어가기 좋아요.`;
  }

  if (summary.proteinPreference === 'diverse-protein' && dinner.protein_tags.some((tag) => !summary.proteinTags.includes(tag))) {
    return `점심과 다른 단백질로 균형을 더하기 좋은 ${mainDish} 메뉴예요.`;
  }

  if (summary.isHeavy && dinner.nutrition.calories.avg <= 700) {
    return `점심보다 가볍게 ${mainDish}로 저녁을 챙기기 좋아요.`;
  }

  if (['soup_set', 'stew_set', 'noodle_soup_set'].includes(dinner.taxonomy.meal_style)) {
    return `${mainDish}처럼 국물 있어 편하게 먹기 좋은 메뉴예요.`;
  }

  if (['main_side_set', 'braised_set'].includes(dinner.taxonomy.meal_style)) {
    return `${mainDish}처럼 반찬이 함께 있는 한 끼로 고르기 좋아요.`;
  }

  if (dinner.taxonomy.meal_style === 'one_plate') {
    return `${mainDish}처럼 한 그릇으로 편하게 먹기 좋은 메뉴예요.`;
  }

  return `오늘 점심을 참고해 ${mainDish} 메뉴를 골랐어요.`;
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

function toDinnerRecommendation(dinner: ProductionDinner, score: number, reason: string): DinnerRecommendation {
  const { primaryDish, secondaryDish } = getDinnerComponents(dinner);
  const recipeActions = buildRecipeActions(dinner);

  return {
    menuId: dinner.menu_id,
    displayName: primaryDish,
    canonicalName: dinner.canonical_name,
    primaryDish,
    secondaryDish,
    recipeActions,
    prepDifficulty: dinner.attributes.prep_difficulty,
    sideDishes: getRecommendedSideDishes(dinner),
    recipeUrl: recipeActions[0].url,
    reason,
    score,
  };
}

export function buildFallbackDinnerRecommendations(limit = 3, context?: RecommendationHistoryContext): FallbackDinnerRecommendationPayload {
  const recentExposureSignals = buildRecentExposureSignals(context?.currentDate ?? '99991231', context);
  const recommendations = selectDiverseRecommendations(
    productionDataset
      .filter((dinner) => dinner.quality.production_ready)
      .map((dinner) => ({ dinner, score: dinner.popularity.occurrence_count }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.dinner.nutrition.calories.avg - right.dinner.nutrition.calories.avg;
      }),
    limit,
    18,
    undefined,
    'fallback:v2',
    recentExposureSignals,
  ).map(({ dinner, score }, index) =>
    toDinnerRecommendation(
      dinner,
      score,
      index === 0 ? '점심 없이도 바로 보기 좋은 대표 메뉴예요.' : '급식 정보가 없는 날에도 무난하게 고르기 좋은 메뉴예요.',
    ),
  );

  return {
    recommendations,
    bridgeComment: '점심 없이도 바로 볼 수 있는 저녁 메뉴예요.',
  };
}

export function buildDinnerRecommendationPayload(lunch: NeisLunch, context?: RecommendationHistoryContext): DinnerRecommendationPayload {
  const lunchSummary = summarizeLunchSignals(lunch.menuItems);
  const recentExposureSignals = buildRecentExposureSignals(lunch.date, context);
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
    18,
    lunchSummary,
    `${lunch.date}:${lunch.menuItems.join('|')}`,
    recentExposureSignals,
  ).map(({ dinner, score }) => toDinnerRecommendation(dinner, score, getRecommendationReason(dinner, lunchSummary)));

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
    bridgeComment: buildBridgeComment(lunch, lunchSummary),
    recommendations,
  };
}
