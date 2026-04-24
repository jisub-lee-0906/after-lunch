import { Home, NotebookPen, RefreshCcw, Settings2, ShoppingCart, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const mockData = {
  lunch: {
    original_menu: '현미밥, 돈육김치찌개, 수제돈까스, 깍두기',
    calories: 750,
    summary_tags: { has_fried: true, has_spicy: true, is_heavy: true },
  },
  dinner_recommendations: [
    {
      recommend_name: '담백한 대구살 찜과 미역국',
      calories: 450,
      main_dishes: [{ dish_name: '대구살 찜', main_ingredient: '해산물', cooking_method: '찜/삶기' }],
      summary_tags: { prep_difficulty: 'Low', has_spicy: false },
    },
    {
      recommend_name: '부드러운 소고기 버섯 볶음',
      calories: 520,
      main_dishes: [{ dish_name: '소고기 버섯 볶음', main_ingredient: '소고기', cooking_method: '볶음' }],
      summary_tags: { prep_difficulty: 'Mid', has_spicy: false },
    },
  ],
} as const;

const dateTabs = [
  { label: '어제', subLabel: '3월 13일', active: false },
  { label: '오늘', subLabel: '3월 14일', active: true },
  { label: '내일', subLabel: '3월 15일', active: false },
];

const lunchToneTags = [
  { label: '바삭한 튀김', className: 'border-amber-200 bg-amber-100 text-amber-800' },
  { label: '매콤한 국물', className: 'border-rose-200 bg-rose-100 text-rose-700' },
  { label: '든든한 포만감', className: 'border-orange-200 bg-orange-100 text-orange-700' },
];

const lunchSummaryChips = [
  { label: '점심 밸런스', value: '든든함 92%', tone: 'bg-orange-100 text-orange-700' },
  { label: '저녁 방향', value: '가볍고 편안하게', tone: 'bg-lime-100 text-lime-700' },
  { label: '추천 이유', value: '단백질 보완', tone: 'bg-yellow-100 text-yellow-700' },
];

const quickActions = ['왜 이 메뉴예요?', '다른 메뉴 보기', '아이 반응 기록하기'];
const bottomNavItems = [
  { label: '홈', icon: Home, active: true },
  { label: '추천', icon: Sparkles, active: false },
  { label: '장보기', icon: ShoppingCart, active: false },
  { label: '기록', icon: NotebookPen, active: false },
];

function getDinnerEmoji(mainIngredient: string, cookingMethod: string) {
  if (mainIngredient.includes('해산물')) return '🐟';
  if (mainIngredient.includes('소고기')) return '🥩';
  if (mainIngredient.includes('가금류')) return '🐔';
  if (cookingMethod.includes('찜') || cookingMethod.includes('삶기')) return '♨️';
  if (cookingMethod.includes('볶음')) return '🥘';
  return '🍽️';
}

function getIngredientTone(mainIngredient: string) {
  if (mainIngredient.includes('해산물')) return 'bg-sky-100 text-sky-700';
  if (mainIngredient.includes('소고기')) return 'bg-rose-100 text-rose-700';
  if (mainIngredient.includes('가금류')) return 'bg-amber-100 text-amber-700';
  return 'bg-stone-100 text-stone-700';
}

function getDifficultyLabel(level: string) {
  if (level === 'Low') return '준비 10분';
  if (level === 'Mid') return '준비 20분';
  return '준비 30분+';
}

function getDinnerReason(dinnerName: string) {
  if (dinnerName.includes('대구살')) return '점심의 튀김 부담을 줄여주는 담백한 찜 조합';
  return '아이가 익숙하게 먹기 좋고 채소 풍미를 더한 포근한 볶음 메뉴';
}

export default function Page() {
  const lunchItems = mockData.lunch.original_menu.split(', ');
  const featuredDinner = mockData.dinner_recommendations[0];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,237,213,1),_rgba(255,251,235,0.96)_34%,_rgba(250,252,245,0.95)_70%,_rgba(255,255,255,1)_100%)] px-4 py-5 text-foreground">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 pb-32">
        <header className="flex items-center justify-between rounded-[28px] bg-white/85 px-4 py-3 shadow-sm ring-1 ring-orange-100 backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">오늘의 우리집 저녁가이드</p>
            <h1 className="mt-1 text-lg font-extrabold tracking-tight">🏫 행복초등학교</h1>
          </div>
          <button
            type="button"
            aria-label="설정"
            className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-orange-600 shadow-sm transition hover:bg-orange-100"
          >
            <Settings2 className="h-5 w-5" />
          </button>
        </header>

        <section className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-full gap-2 rounded-[28px] bg-white/85 p-2 shadow-sm ring-1 ring-orange-100">
            {dateTabs.map((tab) => (
              <button
                key={tab.label}
                type="button"
                className={cn(
                  'flex min-w-[104px] flex-1 flex-col items-center rounded-2xl px-5 py-3 text-sm font-semibold transition',
                  tab.active
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-transparent text-stone-500 hover:bg-orange-50 hover:text-orange-600',
                )}
              >
                <span>{tab.label}</span>
                <span className={cn('mt-1 text-[11px]', tab.active ? 'text-orange-50/90' : 'text-stone-400')}>
                  {tab.subLabel}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          {lunchSummaryChips.map((chip) => (
            <div key={chip.label} className="rounded-3xl bg-white/80 px-3 py-3 shadow-sm ring-1 ring-orange-100">
              <p className="text-[11px] font-semibold text-stone-500">{chip.label}</p>
              <p className={cn('mt-2 rounded-2xl px-2 py-2 text-sm font-bold', chip.tone)}>{chip.value}</p>
            </div>
          ))}
        </section>

        <Card className="overflow-hidden border-orange-100 bg-white/90 shadow-soft">
          <CardHeader className="gap-4 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardDescription className="text-sm font-medium text-orange-500">Lunch insight</CardDescription>
                <CardTitle className="mt-1 text-2xl font-extrabold tracking-tight">🍱 오늘의 식판</CardTitle>
              </div>
              <Badge className="border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                {mockData.lunch.calories}kcal
              </Badge>
            </div>
            <div className="rounded-[24px] bg-gradient-to-r from-orange-50 to-yellow-50 p-4 ring-1 ring-orange-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">우리 아이 컨디션 요약</p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                점심은 기름진 메인과 얼큰한 국물이 함께 나온 날이에요. 저녁은 위가 편안하면서도 단백질은 충분히 채워주는 방향이 좋아요.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {lunchItems.map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-orange-50/50 px-3 py-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                    {index + 1}
                  </span>
                  <p className="text-[1.05rem] font-semibold leading-7 text-stone-800">{item}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {mockData.lunch.summary_tags.has_fried && (
                <Badge className={cn('border', lunchToneTags[0].className)}>{lunchToneTags[0].label}</Badge>
              )}
              {mockData.lunch.summary_tags.has_spicy && (
                <Badge className={cn('border', lunchToneTags[1].className)}>{lunchToneTags[1].label}</Badge>
              )}
              {mockData.lunch.summary_tags.is_heavy && (
                <Badge className={cn('border', lunchToneTags[2].className)}>{lunchToneTags[2].label}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-lime-50 px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl bg-white p-2 text-orange-500 shadow-sm ring-1 ring-orange-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">급식 데이터 브리핑</p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                오늘 점심 구성 데이터를 보면 튀김과 매콤한 메뉴 비중이 높아요. 저녁은 소화가 편하고 단백질 균형이 맞는 메뉴로 이어가면 좋아요. 💡
              </p>
            </div>
          </div>
        </section>

        <Card className="border-orange-200 bg-white/95 shadow-soft">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">오늘의 우선 추천</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-900">{featuredDinner.recommend_name}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">지금 저녁으로 바로 선택하기 가장 편한 조합이에요.</p>
              </div>
              <div className="rounded-3xl bg-orange-50 px-3 py-2 text-right ring-1 ring-orange-100">
                <p className="text-[11px] font-semibold text-orange-500">부담 적음</p>
                <p className="text-sm font-bold text-orange-700">{featuredDinner.calories}kcal</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="h-12 flex-1 rounded-2xl bg-orange-500 text-white hover:bg-orange-600">
                오늘 저녁으로 선택
              </Button>
              <Button variant="outline" className="h-12 flex-1 rounded-2xl text-sm font-bold">
                장보기 메모에 담기
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="rounded-2xl bg-orange-50 px-3 py-3 text-xs font-semibold text-orange-700 ring-1 ring-orange-100 transition hover:bg-orange-100"
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                든든함 대비
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                단백질 보완
              </Badge>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3 rounded-[28px] bg-white/70 p-1">
          <div className="flex items-end justify-between px-3 pt-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Dinner picks</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">✨ 맞춤 저녁 추천</h2>
            </div>
            <p className="text-xs text-stone-500">가볍고 균형 있게</p>
          </div>

          <div className="flex items-center justify-between px-3">
            <p className="text-sm leading-6 text-stone-500">한 손으로 쓱 넘겨보고, 마음에 드는 저녁은 바로 결정하거나 장보기 메모로 이어갈 수 있어요.</p>
            <p className="ml-3 shrink-0 text-xs font-semibold text-orange-500">스와이프해서 더 보기</p>
          </div>

          <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory gap-3 pr-4">
              {mockData.dinner_recommendations.map((dinner, index) => {
                const mainDish = dinner.main_dishes[0];
                const emoji = getDinnerEmoji(mainDish.main_ingredient, mainDish.cooking_method);
                return (
                  <Card
                    key={dinner.recommend_name}
                    className="w-[82vw] max-w-[320px] shrink-0 snap-start border-lime-100 bg-white/95 shadow-soft"
                  >
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-lime-50 text-3xl shadow-sm ring-1 ring-lime-100">
                            {emoji}
                          </div>
                          <p className="mt-2 text-xs font-semibold text-lime-700">추천 {index + 1}</p>
                        </div>
                        <Badge className="border border-stone-200 bg-stone-50 text-stone-600">
                          {dinner.calories}kcal
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[1.4rem] font-black leading-8 tracking-tight text-stone-900">
                          {dinner.recommend_name}
                        </p>
                        <p className="text-sm leading-6 text-stone-500">
                          {mainDish.dish_name} · {mainDish.main_ingredient} · {mainDish.cooking_method}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                          오늘 저녁 체크포인트
                        </p>
                      </div>

                      <div className="rounded-[24px] bg-lime-50 px-4 py-3 ring-1 ring-lime-100">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">추천 이유</p>
                        <p className="mt-2 text-sm leading-6 text-stone-700">{getDinnerReason(dinner.recommend_name)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-lime-100 text-lime-700">
                          {getDifficultyLabel(dinner.summary_tags.prep_difficulty)}
                        </Badge>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          {dinner.summary_tags.has_spicy ? '매콤해요' : '자극 없이 편안해요'}
                        </Badge>
                        <Badge variant="secondary" className={getIngredientTone(mainDish.main_ingredient)}>
                          {mainDish.main_ingredient}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button className="mt-auto h-12 flex-1 rounded-2xl bg-orange-500 text-white hover:bg-orange-600">
                          오늘 저녁으로 선택
                        </Button>
                        <Button variant="outline" className="mt-auto h-12 w-12 rounded-2xl px-0">
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] px-4 pb-4">
        <div className="rounded-[28px] border border-orange-100 bg-white/95 px-3 py-3 shadow-[0_-12px_30px_rgba(251,146,60,0.12)] backdrop-blur">
          <div className="grid grid-cols-4 gap-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition',
                    item.active ? 'bg-orange-50 text-orange-600' : 'text-stone-400 hover:bg-stone-50',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
