'use client';

import { Check, ChevronRight, Clock3, LoaderCircle, Search, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SchoolSearchResult = {
  officeCode: string;
  officeName: string;
  schoolCode: string;
  schoolName: string;
  schoolLevel: string;
  address?: string;
};

type LunchData = {
  date: string;
  calories: number | null;
  menuItems: string[];
  rawMenu: string;
};

type LunchSummary = {
  hasFried: boolean;
  hasSpicy: boolean;
  isHeavy: boolean;
};

type Recommendation = {
  menuId: string;
  displayName: string;
  canonicalName: string;
  prepDifficulty: string;
  sideDishes: string[];
  recipeUrl: string;
  reason: string;
  score: number;
};

type RecommendationResponse = {
  lunch: LunchData;
  lunchSummary: LunchSummary;
  lunchTags: string[];
  bridgeComment: string;
  recommendations: Recommendation[];
  error?: string;
};

const dateTabs = [-1, 0, 1] as const;

function formatDateForApi(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

function getDateLabel(offsetDays: number) {
  if (offsetDays === -1) return '어제';
  if (offsetDays === 1) return '내일';
  return '오늘';
}

function getDifficultyLabel(level: string) {
  if (level === 'Low') return '준비 난이도 낮음';
  if (level === 'Mid') return '준비 난이도 보통';
  return '준비 난이도 높음';
}

export default function Page() {
  const [selectedSchool, setSelectedSchool] = useState<SchoolSearchResult | null>(null);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolSearchResult[]>([]);
  const [isSearchingSchools, setIsSearchingSchools] = useState(false);
  const [schoolSearchError, setSchoolSearchError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDayOffset, setSelectedDayOffset] = useState<(typeof dateTabs)[number]>(0);
  const [lunchData, setLunchData] = useState<LunchData | null>(null);
  const [lunchSummary, setLunchSummary] = useState<LunchSummary | null>(null);
  const [lunchTags, setLunchTags] = useState<string[]>([]);
  const [bridgeComment, setBridgeComment] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingLunch, setIsLoadingLunch] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [lunchError, setLunchError] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  const selectedDate = useMemo(() => formatDateForApi(selectedDayOffset), [selectedDayOffset]);

  useEffect(() => {
    const query = schoolQuery.trim();
    if (!isSettingsOpen || !query) {
      setSchoolResults([]);
      setSchoolSearchError(null);
      return;
    }

    const controller = new AbortController();
    const loadSchools = async () => {
      try {
        setIsSearchingSchools(true);
        setSchoolSearchError(null);
        const response = await fetch('/api/schools?query=' + encodeURIComponent(query), {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { schools?: SchoolSearchResult[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? '학교 검색에 실패했습니다.');
        }
        setSchoolResults(payload.schools ?? []);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setSchoolSearchError(error instanceof Error ? error.message : '학교 검색에 실패했습니다.');
      } finally {
        setIsSearchingSchools(false);
      }
    };

    void loadSchools();
    return () => controller.abort();
  }, [isSettingsOpen, schoolQuery]);

  useEffect(() => {
    if (!selectedSchool?.officeCode || !selectedSchool?.schoolCode) {
      setLunchData(null);
      setLunchSummary(null);
      setLunchTags([]);
      setBridgeComment('');
      setRecommendations([]);
      setLunchError(null);
      setRecommendationError(null);
      return;
    }

    const controller = new AbortController();
    const loadRecommendationPlan = async () => {
      try {
        setIsLoadingLunch(true);
        setIsLoadingRecommendations(true);
        setLunchError(null);
        setRecommendationError(null);

        const response = await fetch(
          '/api/recommendations?officeCode=' +
            encodeURIComponent(selectedSchool?.officeCode) +
            '&schoolCode=' +
            encodeURIComponent(selectedSchool?.schoolCode) +
            '&date=' +
            encodeURIComponent(selectedDate),
          { signal: controller.signal },
        );
        const payload = (await response.json()) as RecommendationResponse;

        if (response.status === 404) {
          setLunchData(null);
          setLunchSummary(null);
          setLunchTags([]);
          setBridgeComment('');
          setRecommendations([]);
          setLunchError('오늘 급식을 찾지 못했어요.');
          setRecommendationError(null);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? '추천 정보를 불러오지 못했습니다.');
        }

        setLunchData(payload.lunch);
        setLunchSummary(payload.lunchSummary);
        setLunchTags(payload.lunchTags ?? []);
        setBridgeComment(payload.bridgeComment ?? '오늘 점심을 바탕으로 고른 메뉴예요.');
        setRecommendations(payload.recommendations ?? []);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setLunchData(null);
        setLunchSummary(null);
        setLunchTags([]);
        setBridgeComment('');
        setRecommendations([]);
        const message = error instanceof Error ? error.message : '추천 정보를 불러오지 못했습니다.';
        setLunchError(message);
        setRecommendationError(message);
      } finally {
        setIsLoadingLunch(false);
        setIsLoadingRecommendations(false);
      }
    };

    void loadRecommendationPlan();
    return () => controller.abort();
  }, [selectedDate, selectedSchool?.officeCode, selectedSchool?.schoolCode]);

  const filteredSchools = useMemo(() => {
    const query = schoolQuery.trim();
    if (!query) return schoolResults;
    return schoolResults.filter((school) => school.schoolName.includes(query));
  }, [schoolQuery, schoolResults]);

  const lunchItems = lunchData?.menuItems ?? [];
  const calories = lunchData?.calories;

  return (
    <main className="min-h-screen px-5 py-6 text-[var(--text-strong)]">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-8 pb-10">
        <header className="surface-card rounded-[32px] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-kicker">학교 급식 맞춤형 저녁 추천</p>
              <h1 className="text-display text-[1.78rem] font-bold">{selectedSchool?.schoolName ?? '학교를 설정해보세요'}</h1>
            </div>
            <button type="button" aria-label="학교 설정" className="icon-button" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <section className="surface-muted p-1 shadow-sm">
          <div className="grid grid-cols-3 gap-1">
            {dateTabs.map((offset) => (
              <button
                key={offset}
                type="button"
                onClick={() => setSelectedDayOffset(offset)}
                className={cn(
                  'rounded-full px-3 py-2.5 text-[0.95rem] font-medium transition',
                  selectedDayOffset === offset ? 'surface-card text-[var(--text-strong)]' : 'text-kicker',
                )}
              >
                {getDateLabel(offset)}
              </button>
            ))}
          </div>
        </section>

        {!selectedSchool ? (
          <section className="surface-card px-6 py-6 text-center">
            <p className="text-body-muted text-[1rem] leading-7">학교를 검색해 설정해보세요.</p>
          </section>
        ) : isLoadingLunch ? (
          <section className="surface-card px-6 py-6 text-center">
            <div className="flex items-center justify-center gap-3 text-[var(--text-body)]">
              <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
              <p className="text-[1rem] leading-7">오늘 급식을 불러오는 중이에요.</p>
            </div>
          </section>
        ) : lunchError ? (
          <section className="surface-card px-6 py-6 text-center">
            <p className="text-body-muted text-[1rem] leading-7">{lunchError || '오늘 급식을 찾지 못했어요.'}</p>
          </section>
        ) : lunchData && lunchSummary ? (
          <>
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-kicker">오늘의 급식</p>
                  <h2 className="section-heading">점심 메뉴</h2>
                </div>
                <p className="pill-muted shrink-0 px-3 py-1 text-sm font-medium">{calories ? `${calories} kcal` : '칼로리 정보 없음'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="surface-card px-4 py-4">
                  <p className="text-caption">식단 밀도</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text-strong)]">
                    {lunchSummary.isHeavy ? '든든한 구성' : '가벼운 구성'}
                  </p>
                </div>
                <div className="surface-card px-4 py-4">
                  <p className="text-caption">식단 요약</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text-strong)]">
                    {lunchSummary.hasFried || lunchSummary.hasSpicy ? '기름짐과 매콤함' : '균형 잡힌 구성'}
                  </p>
                </div>
              </div>

              <Card className="space-y-6 p-6">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                  <p className="text-kicker">급식 메뉴</p>
                  <p className="text-caption">식단 요약</p>
                </div>

                <div className="space-y-3">
                  {lunchItems.map((item) => (
                    <div key={item} className="surface-subtle px-4 py-3">
                      <p className="text-[1.04rem] font-medium leading-7 tracking-[-0.02em] text-[var(--text-strong)]">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {lunchTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="pill-subtle px-3 py-1 text-xs font-medium">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            </section>

            <section className="space-y-4">
              <div className="space-y-2">
                <p className="text-kicker">오늘 저녁</p>
                <h2 className="section-heading">메뉴 추천</h2>
                <p className="section-description">오늘 점심을 바탕으로 고른 메뉴예요.</p>
              </div>

              <Card className="space-y-3 p-5">
                <p className="text-caption">추천 근거</p>
                <p className="text-[1rem] leading-7 text-[var(--text-body)]">{bridgeComment}</p>
              </Card>

              {isLoadingRecommendations ? (
                <Card className="p-6 text-center">
                  <div className="flex items-center justify-center gap-3 text-[var(--text-body)]">
                    <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
                    <p className="text-[1rem] leading-7">추천을 불러오는 중이에요.</p>
                  </div>
                </Card>
              ) : recommendationError ? (
                <Card className="p-6 text-center">
                  <p className="text-body-muted text-[1rem] leading-7">{recommendationError}</p>
                </Card>
              ) : (
                <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex snap-x snap-mandatory gap-4 pr-5">
                    {recommendations.map((recommendation) => (
                      <Card key={recommendation.menuId} className="w-[88%] min-w-[286px] max-w-[320px] snap-start rounded-[32px]">
                        <CardContent className="flex h-full flex-col gap-3 p-5 pt-5">
                          <div className="pb-1">
                            <div className="difficulty-badge">
                              <div className="difficulty-icon">
                                <Clock3 className="h-4 w-4" />
                              </div>
                              <p className="difficulty-label">{getDifficultyLabel(recommendation.prepDifficulty)}</p>
                            </div>
                          </div>

                          <p className="text-xl font-semibold leading-8 tracking-[-0.03em] text-[var(--text-strong)]">{recommendation.displayName}</p>

                          <div className="space-y-2">
                            <p className="text-caption">추천 근거</p>
                            <p className="text-sm leading-6 text-[var(--text-body)]">{recommendation.reason}</p>
                          </div>

                          <div className="space-y-2">
                            <p className="text-caption">어울리는 반찬</p>
                            <div className="flex flex-wrap gap-2 text-sm text-[var(--text-body)]">
                              {recommendation.sideDishes.map((item) => (
                                <span key={item} className="meta-chip px-3 py-1">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>

                          <a
                            href={recommendation.recipeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-auto inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--surface-strong)] px-4 text-sm font-medium text-white transition hover:opacity-95"
                          >
                            레시피 보기
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/35 px-5 py-6">
          <div className="mx-auto flex h-full w-full max-w-[480px] items-end">
            <div className="surface-card w-full rounded-[32px] px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-kicker">학교 설정</p>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-strong)]">학교 검색</h2>
                </div>
                <button type="button" aria-label="닫기" className="icon-button" onClick={() => setIsSettingsOpen(false)}>
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <p className="mt-3 section-description">검색으로 학교를 바꿔보세요.</p>

              <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3">
                <Search className="h-4.5 w-4.5 text-[var(--text-muted)]" />
                <input
                  value={schoolQuery}
                  onChange={(event) => setSchoolQuery(event.target.value)}
                  placeholder="학교 검색"
                  className="w-full bg-transparent text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-soft)]"
                />
              </div>

              <div className="mt-4 space-y-2">
                {isSearchingSchools ? <p className="text-caption">학교를 찾는 중이에요.</p> : null}
                {schoolSearchError ? <p className="text-caption">{schoolSearchError}</p> : null}
                {!isSearchingSchools && !schoolSearchError && schoolQuery.trim() && filteredSchools.length === 0 ? (
                  <p className="text-caption">검색 결과가 없어요.</p>
                ) : null}
                {filteredSchools.map((school) => {
                  const isSelected = school.schoolCode === selectedSchool?.schoolCode;

                  return (
                    <button
                      key={`${school.officeCode}-${school.schoolCode}`}
                      type="button"
                      onClick={() => {
                        setSelectedSchool(school);
                        setIsSettingsOpen(false);
                        setSchoolQuery('');
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left transition',
                        isSelected
                          ? 'border-[var(--surface-strong)] bg-[var(--surface-subtle)]'
                          : 'border-[var(--border-soft)] bg-white hover:bg-[var(--surface-subtle)]',
                      )}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[var(--text-strong)]">{school.schoolName}</p>
                        <p className="text-caption">{isSelected ? '선택 중' : `${school.officeName} · ${school.schoolLevel}`}</p>
                      </div>
                      {isSelected ? <Check className="h-4.5 w-4.5 text-[var(--surface-strong)]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
