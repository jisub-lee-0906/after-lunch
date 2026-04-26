import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDinnerRecommendationPayload, buildFallbackDinnerRecommendations, summarizeLunchSignals } from '../lib/dinner-engine';
import { GET as schoolsGET } from '../app/api/schools/route';
import { GET as lunchGET } from '../app/api/lunch/route';
import { GET as recommendationsGET } from '../app/api/recommendations/route';
import { cleanDishName } from '../lib/neis';

test('summarizeLunchSignals detects rice_missing from one-plate lunch text', () => {
  const summary = summarizeLunchSignals(['참치마요덮밥', '배추김치']);
  assert.equal(summary.mealType, 'starch-heavy');
  assert.deepEqual(summary.lunchAftertaste, ['rice_missing']);
});

test('cleanDishName strips trailing single-letter Latin suffix noise from NEIS menu names', () => {
  assert.equal(cleanDishName('돈까스-J'), '돈까스');
  assert.equal(cleanDishName('비빔밥-M'), '비빔밥');
});

test('buildDinnerRecommendationPayload returns three deduped recommendations with non-empty reasons', () => {
  const payload = buildDinnerRecommendationPayload({
    date: '20250424',
    calories: 666,
    menuItems: ['온국수', '양념김치', '닭다리살오븐구이'],
    rawMenu: '온국수<br/>양념김치<br/>닭다리살오븐구이',
  });

  assert.equal(payload.recommendations.length, 3);
  const names = payload.recommendations.map((item) => item.displayName);
  assert.equal(new Set(names).size, 3);
  for (const recommendation of payload.recommendations) {
    assert.ok(recommendation.reason.length > 0);
    assert.ok(recommendation.recipeUrl.startsWith('https://www.10000recipe.com/recipe/list.html?q='));
  }
});

test('buildDinnerRecommendationPayload derives persuasive density and summary labels for fried spicy lunches', () => {
  const payload = buildDinnerRecommendationPayload({
    date: '20250424',
    calories: 820,
    menuItems: ['돈까스', '떡볶이', '배추김치'],
    rawMenu: '돈까스<br/>떡볶이<br/>배추김치',
  });

  assert.equal(payload.lunchSummary.densityLabel, '든든하게 먹은 편');
  assert.equal(payload.lunchSummary.summaryLabel, '기름지고 매콤한 편');
});

test('buildDinnerRecommendationPayload derives balanced labels for steady lunches', () => {
  const payload = buildDinnerRecommendationPayload({
    date: '20250424',
    calories: 610,
    menuItems: ['쌀밥', '닭곰탕', '시금치나물', '깍두기'],
    rawMenu: '쌀밥<br/>닭곰탕<br/>시금치나물<br/>깍두기',
  });

  assert.equal(payload.lunchSummary.densityLabel, '적당히 먹은 편');
  assert.equal(payload.lunchSummary.summaryLabel, '국물 메뉴가 있는 편');
  assert.equal(payload.bridgeComment, '점심에 국물 메뉴가 있었어서, 저녁은 너무 무겁지 않은 메뉴로 골랐어요.');
});

test('buildDinnerRecommendationPayload derives one-plate summary labels for starch-heavy lunches', () => {
  const payload = buildDinnerRecommendationPayload({
    date: '20250424',
    calories: 680,
    menuItems: ['참치마요덮밥', '배추김치'],
    rawMenu: '참치마요덮밥<br/>배추김치',
  });

  assert.equal(payload.lunchSummary.densityLabel, '든든하게 먹은 편');
  assert.equal(payload.lunchSummary.summaryLabel, '한 그릇 메뉴가 있었던 편');
  assert.equal(payload.bridgeComment, '점심이 한 그릇 메뉴 위주였어서, 저녁은 단백질과 반찬 균형을 더한 메뉴들로 골랐어요.');
});

test('buildDinnerRecommendationPayload derives lighter labels for very simple lunches', () => {
  const payload = buildDinnerRecommendationPayload({
    date: '20250424',
    calories: 520,
    menuItems: ['맑은두부국', '계란찜', '오이무침'],
    rawMenu: '맑은두부국<br/>계란찜<br/>오이무침',
  });

  assert.equal(payload.lunchSummary.densityLabel, '가볍게 먹은 편');
  assert.equal(payload.lunchSummary.summaryLabel, '자극이 적은 편');
  assert.equal(payload.bridgeComment, '오늘 점심이 비교적 가벼운 편이라, 저녁은 부담 없이 준비해 먹을 수 있는 메뉴로 골랐어요.');
});

test('buildDinnerRecommendationPayload interprets whole-menu weight before picking persuasive summary labels', () => {
  const cases = [
    {
      name: 'fried fish cutlet lunch should not collapse to bland',
      lunch: {
        date: '20260423',
        calories: 650,
        menuItems: ['보리밥', '버섯샤브샤브', '두부면야채무침', '생선까스 타르타르소스', '깍두기', '망고푸딩'],
        rawMenu: '보리밥<br/>버섯샤브샤브<br/>두부면야채무침<br/>생선까스 타르타르소스<br/>깍두기<br/>망고푸딩',
      },
      expectedDensityLabel: '적당히 먹은 편',
      expectedSummaryLabel: '기름기 있는 편',
    },
    {
      name: 'spaghetti lunch should count as starch-heavy whole plate',
      lunch: {
        date: '20260422',
        calories: 700,
        menuItems: ['미니찹쌀밥 김자반', '스파게티', '갈릭파이', '배추김치', '사과쥬스'],
        rawMenu: '미니찹쌀밥 김자반<br/>스파게티<br/>갈릭파이<br/>배추김치<br/>사과쥬스',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '한 그릇 메뉴가 있었던 편',
    },
    {
      name: 'spicy pork plus hotdog lunch should stay heavy instead of spicy-only',
      lunch: {
        date: '20260424',
        calories: 840,
        menuItems: ['찰보리밥', '연두부새우젓국', '숙주나물무침', '제육볶음', '모짜렐라핫도그', '깍두기', '자몽주스'],
        rawMenu: '찰보리밥<br/>연두부새우젓국<br/>숙주나물무침<br/>제육볶음<br/>모짜렐라핫도그<br/>깍두기<br/>자몽주스',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '매콤하고 든든한 편',
    },
    {
      name: 'high-calorie soup lunch with chicken main should read as hearty meal',
      lunch: {
        date: '20260421',
        calories: 780,
        menuItems: ['발아현미밥', '애호박찌개', '안동식찜닭', '진미채양념구이', '열무김치', '포도'],
        rawMenu: '발아현미밥<br/>애호박찌개<br/>안동식찜닭<br/>진미채양념구이<br/>열무김치<br/>포도',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '메인 반찬이 든든한 편',
    },
    {
      name: 'soup plus braised chicken lunch should not be reduced to broth-only copy',
      lunch: {
        date: '20260424',
        calories: 1040,
        menuItems: ['백미밥', '물만두국', '묵은지찜닭', '쑥갓두부무침', '새송이버섯볶음', '깍두기'],
        rawMenu: '백미밥<br/>물만두국<br/>묵은지찜닭<br/>쑥갓두부무침<br/>새송이버섯볶음<br/>깍두기',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '메인 반찬이 든든한 편',
    },
    {
      name: 'smoked duck lunch should not collapse to bland copy',
      lunch: {
        date: '20260417',
        calories: 673,
        menuItems: ['현미밥', '콩나물국', '탕평채', '건조두부야채볶음', '배추김치', '오리훈제', '우유'],
        rawMenu: '현미밥<br/>콩나물국<br/>탕평채<br/>건조두부야채볶음<br/>배추김치<br/>오리훈제<br/>우유',
      },
      expectedDensityLabel: '적당히 먹은 편',
      expectedSummaryLabel: '메인 반찬이 든든한 편',
    },
    {
      name: 'pork belly lunch should not read as bland',
      lunch: {
        date: '20260417',
        calories: 917,
        menuItems: ['차조밥', '소고기무국', '삼겹살편육', '감자채볶음', '배추김치', '배', '급식우유'],
        rawMenu: '차조밥<br/>소고기무국<br/>삼겹살편육<br/>감자채볶음<br/>배추김치<br/>배<br/>급식우유',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '메인 반찬이 든든한 편',
    },
    {
      name: 'hamburg steak lunch should feel hearty instead of bland',
      lunch: {
        date: '20260423',
        calories: 842,
        menuItems: ['차수수밥', '쇠고기무국', '비빔만두', '간장계란함박', '배추김치'],
        rawMenu: '차수수밥<br/>쇠고기무국<br/>비빔만두<br/>간장계란함박<br/>배추김치',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '메인 반찬이 든든한 편',
    },
    {
      name: 'spicy pork grill lunch should not stay bland',
      lunch: {
        date: '20260421',
        calories: 793,
        menuItems: ['칼슘찹쌀밥', '조랭이떡국', '청경채무침', '삼겹살고추장구이', '배추김치', '파인애플'],
        rawMenu: '칼슘찹쌀밥<br/>조랭이떡국<br/>청경채무침<br/>삼겹살고추장구이<br/>배추김치<br/>파인애플',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '매콤하고 든든한 편',
    },
    {
      name: 'duck ssam with mapo tofu should read as hearty lunch',
      lunch: {
        date: '20260417',
        calories: 760,
        menuItems: ['칼슘찹쌀밥', '시금치된장국', '오리쌈', '마파두부', '배추김치'],
        rawMenu: '칼슘찹쌀밥<br/>시금치된장국<br/>오리쌈<br/>마파두부<br/>배추김치',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '매콤하고 든든한 편',
    },
    {
      name: 'sundae gopchang lunch should not read as bland',
      lunch: {
        date: '20260423',
        calories: 873,
        menuItems: ['차수수밥', '열무된장국', '날치알계란찜', '순대곱창볶음', '배추김치', '휘낭시에'],
        rawMenu: '차수수밥<br/>열무된장국<br/>날치알계란찜<br/>순대곱창볶음<br/>배추김치<br/>휘낭시에',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '메인 반찬이 든든한 편',
    },
    {
      name: 'five-spice pork lunch should not read as bland',
      lunch: {
        date: '20260416',
        calories: 855,
        menuItems: ['보리밥', '들깨수제비국', '오향장육', '새송이마늘쫑무침', '열무김치', '사과'],
        rawMenu: '보리밥<br/>들깨수제비국<br/>오향장육<br/>새송이마늘쫑무침<br/>열무김치<br/>사과',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '메인 반찬이 든든한 편',
    },
    {
      name: 'yuringi lunch should feel oilier than bland',
      lunch: {
        date: '20260414',
        calories: 994,
        menuItems: ['칼슘찹쌀밥', '찰감자꽃만두', '사과치커리무침', '통닭가슴살유린기', '배추김치', '자장소스', '미니바나나우유'],
        rawMenu: '칼슘찹쌀밥<br/>찰감자꽃만두<br/>사과치커리무침<br/>통닭가슴살유린기<br/>배추김치<br/>자장소스<br/>미니바나나우유',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '기름기 있는 편',
      expectedBridgeComment: '점심이 조금 진한 편이어서, 저녁은 더 담백한 메뉴들로 골랐어요.',
    },
    {
      name: 'rice plus jjolmyeon plus cutlet lunch should not read as one-bowl style',
      lunch: {
        date: '20260428',
        calories: 764,
        menuItems: ['기장밥', '단호박스프', '쫄면무침', '고구마치즈롤까스', '깍두기', '브라운소스'],
        rawMenu: '기장밥<br/>단호박스프<br/>쫄면무침<br/>고구마치즈롤까스<br/>깍두기<br/>브라운소스',
      },
      expectedDensityLabel: '든든하게 먹은 편',
      expectedSummaryLabel: '기름기 있는 편',
      expectedBridgeComment: '점심이 조금 진한 편이어서, 저녁은 더 담백한 메뉴들로 골랐어요.',
    },

  ];

  for (const scenario of cases) {
    const payload = buildDinnerRecommendationPayload(scenario.lunch);
    assert.equal(payload.lunchSummary.densityLabel, scenario.expectedDensityLabel, scenario.name);
    assert.equal(payload.lunchSummary.summaryLabel, scenario.expectedSummaryLabel, scenario.name);
    if ('expectedBridgeComment' in scenario) {
      assert.equal(payload.bridgeComment, scenario.expectedBridgeComment, `${scenario.name} bridge comment`);
    }
  }
});

test('buildFallbackDinnerRecommendations returns three recommendations', () => {
  const payload = buildFallbackDinnerRecommendations();
  assert.equal(payload.recommendations.length, 3);
  assert.ok(payload.bridgeComment.length > 0);
});

test('schools route returns empty schools list for blank query', async () => {
  const request = {
    nextUrl: new URL('http://localhost:3000/api/schools?query='),
  };
  const response = await schoolsGET(request as never);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data, { schools: [] });
});

test('lunch route returns 400 for missing params', async () => {
  const request = {
    nextUrl: new URL('http://localhost:3000/api/lunch?officeCode=&schoolCode=&date='),
  };
  const response = await lunchGET(request as never);
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(typeof data.error, 'string');
});

test('lunch route returns 400 for invalid date format', async () => {
  const request = {
    nextUrl: new URL('http://localhost:3000/api/lunch?officeCode=C10&schoolCode=7201268&date=2025-04-24'),
  };
  const response = await lunchGET(request as never);
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(typeof data.error, 'string');
});

test('recommendations route returns 400 for missing params', async () => {
  const response = await recommendationsGET(new Request('http://localhost:3000/api/recommendations?officeCode=&schoolCode=&date='));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'officeCode, schoolCode, date are required');
});

test('recommendations route returns 400 for invalid date format', async () => {
  const response = await recommendationsGET(new Request('http://localhost:3000/api/recommendations?officeCode=C10&schoolCode=7201268&date=2025-04-24'));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(typeof data.error, 'string');
});
