import productionDataset from '@/datasets/2025/production_final_dataset_2025.json';
import type { NeisLunch } from '@/lib/neis';

export type ProductionDinner = (typeof productionDataset)[number];

export type LunchSignals = {
  hasFried: boolean;
  hasSpicy: boolean;
  isHeavy: boolean;
  keywords: string[];
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
  };
  lunchTags: string[];
  bridgeComment: string;
  recommendations: DinnerRecommendation[];
};

const SOUP_KEYWORDS = ['국', '탕', '찌개', '수제비', '쌀국수', '순두부', '미역국', '된장국'];
const LIGHT_KEYWORDS = ['두부', '야채', '버섯', '아욱', '순두부', '수제비', '쌀국수'];
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

export function summarizeLunchSignals(menuItems: string[]): LunchSignals {
  const menuText = menuItems.join(' ');
  const friedKeywords = ['튀김', '돈까스', '탕수육', '치킨', '가라아게', '전', '크로켓', '멘보샤', '후라이'];
  const spicyKeywords = ['매콤', '마라', '짬뽕', '김치찌개', '떡볶이', '불닭', '제육', '육개장'];
  const heavyKeywords = ['돈까스', '짜장', '카레', '볶음밥', '갈비', '불고기', '찌개', '떡볶이', '파스타', '마라탕'];

  return {
    hasFried: friedKeywords.some((keyword) => menuText.includes(keyword)),
    hasSpicy: spicyKeywords.some((keyword) => menuText.includes(keyword)),
    isHeavy: heavyKeywords.some((keyword) => menuText.includes(keyword)),
    keywords: extractLunchKeywords(menuItems),
  };
}

function buildBridgeComment(summary: LunchSignals) {
  if (summary.hasFried && summary.hasSpicy) {
    return '점심에 기름진 메뉴와 자극적인 메뉴가 함께 나왔네요. 저녁은 편안하고 균형 잡힌 구성으로 이어가요.';
  }

  if (summary.hasFried) {
    return '점심에 튀김 요리가 나왔네요. 저녁은 소화가 잘 되는 담백한 메뉴를 제안합니다.';
  }

  if (summary.hasSpicy) {
    return '점심 메뉴가 자극적이었네요. 저녁은 매운맛을 줄인 편안한 구성을 권합니다.';
  }

  if (summary.isHeavy) {
    return '점심이 든든했던 날이라 저녁은 무겁지 않게 균형을 맞춘 메뉴를 골랐어요.';
  }

  return '점심 구성 데이터를 기준으로 균형 잡힌 저녁 메뉴를 추천합니다.';
}

function getLunchTags(summary: LunchSignals) {
  const tags: string[] = [];
  if (summary.hasFried) tags.push('튀김 있음');
  if (summary.hasSpicy) tags.push('매콤함');
  if (summary.isHeavy) tags.push('든든한 구성');
  if (tags.length === 0) tags.push('균형 잡힌 구성');
  return tags;
}

function getRecommendationReason(dinner: ProductionDinner, summary: LunchSignals) {
  const mainDish = dinner.main_dishes[0] ?? dinner.canonical_name;

  if (summary.hasFried && !dinner.attributes.fried) {
    return `점심의 기름진 흐름을 덜어줄 ${mainDish} 중심 구성이에요.`;
  }

  if (summary.hasSpicy && !dinner.attributes.spicy) {
    return `점심보다 자극을 낮춘 ${mainDish} 중심 메뉴라 저녁에 편안하게 이어가기 좋아요.`;
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

  if (dinner.quality.production_ready) score += 20;
  if (dinner.quality.calorie_profile === 'stable') score += 6;
  score += Math.min(18, Math.round(dinner.popularity.occurrence_count / 18));

  if (summary.hasFried) {
    score += dinner.attributes.fried ? -18 : 18;
    if (SOUP_KEYWORDS.some((keyword) => dinnerText.includes(keyword))) score += 8;
  }

  if (summary.hasSpicy) {
    score += dinner.attributes.spicy ? -16 : 16;
    if (LIGHT_KEYWORDS.some((keyword) => dinnerText.includes(keyword))) score += 6;
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

export function buildDinnerRecommendationPayload(lunch: NeisLunch): DinnerRecommendationPayload {
  const lunchSummary = summarizeLunchSignals(lunch.menuItems);
  const recommendations = productionDataset
    .map((dinner) => ({ dinner, score: scoreDinnerCandidate(dinner, lunchSummary) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.dinner.popularity.occurrence_count !== left.dinner.popularity.occurrence_count) {
        return right.dinner.popularity.occurrence_count - left.dinner.popularity.occurrence_count;
      }
      return left.dinner.nutrition.calories.avg - right.dinner.nutrition.calories.avg;
    })
    .filter(({ dinner }, index, items) => items.findIndex((item) => item.dinner.canonical_name === dinner.canonical_name) === index)
    .slice(0, 3)
    .map(({ dinner, score }) => ({
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
    },
    lunchTags: getLunchTags(lunchSummary),
    bridgeComment: buildBridgeComment(lunchSummary),
    recommendations,
  };
}
