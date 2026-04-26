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
