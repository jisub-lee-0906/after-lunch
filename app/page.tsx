'use client';

import { Check, ChevronRight, LoaderCircle, Search, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appendRecentRecommendationHistory, getScopedRecentRecommendationHistory, type RecentRecommendationExposure } from '@/lib/recommendation-history';
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
  densityLabel: string;
  summaryLabel: string;
};

type RecipeAction = {
  role: 'primary' | 'secondary';
  label: string;
  dishName: string;
  url: string;
};

type Recommendation = {
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

type RecommendationResponse = {
  lunch?: LunchData | null;
  lunchSummary?: LunchSummary;
  lunchTags?: string[];
  bridgeComment?: string;
  recommendations: Recommendation[];
  error?: string;
};

const dateTabs = [-1, 0, 1] as const;
const LOCAL_STORAGE_SELECTED_SCHOOL_KEY = 'after-lunch:selected-school';
const LOCAL_STORAGE_RECOMMENDATION_VIEWER_KEY = 'after-lunch:recommendation-viewer';
const LOCAL_STORAGE_RECOMMENDATION_HISTORY_KEY = 'after-lunch:recommendation-history';

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

function getSchoolScopeKey(school: Pick<SchoolSearchResult, 'officeCode' | 'schoolCode'>) {
  return `${school.officeCode}:${school.schoolCode}`;
}

function getOrCreateRecommendationViewerKey() {
  const storedViewerKey = window.localStorage.getItem(LOCAL_STORAGE_RECOMMENDATION_VIEWER_KEY)?.trim();
  if (storedViewerKey) return storedViewerKey;

  const viewerKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(LOCAL_STORAGE_RECOMMENDATION_VIEWER_KEY, viewerKey);
  return viewerKey;
}

function readRecentRecommendationHistory() {
  try {
    const rawValue = window.localStorage.getItem(LOCAL_STORAGE_RECOMMENDATION_HISTORY_KEY);
    if (!rawValue) return [] as RecentRecommendationExposure[];
    return JSON.parse(rawValue) as unknown;
  } catch {
    window.localStorage.removeItem(LOCAL_STORAGE_RECOMMENDATION_HISTORY_KEY);
    return [] as RecentRecommendationExposure[];
  }
}

function writeRecentRecommendationHistory(history: RecentRecommendationExposure[]) {
  window.localStorage.setItem(LOCAL_STORAGE_RECOMMENDATION_HISTORY_KEY, JSON.stringify(history));
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [bridgeComment, setBridgeComment] = useState<string | null>(null);
  const [isLoadingLunch, setIsLoadingLunch] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [lunchError, setLunchError] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  const selectedDate = useMemo(() => formatDateForApi(selectedDayOffset), [selectedDayOffset]);
  const selectedDayLabel = useMemo(() => getDateLabel(selectedDayOffset), [selectedDayOffset]);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(LOCAL_STORAGE_SELECTED_SCHOOL_KEY);
      if (!storedValue) return;
      const parsedSchool = JSON.parse(storedValue) as SchoolSearchResult;
      if (!parsedSchool?.officeCode || !parsedSchool?.schoolCode || !parsedSchool?.schoolName) {
        window.localStorage.removeItem(LOCAL_STORAGE_SELECTED_SCHOOL_KEY);
        return;
      }
      setSelectedSchool(parsedSchool);
    } catch {
      window.localStorage.removeItem(LOCAL_STORAGE_SELECTED_SCHOOL_KEY);
    }
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      window.localStorage.removeItem(LOCAL_STORAGE_SELECTED_SCHOOL_KEY);
      return;
    }

    window.localStorage.setItem(LOCAL_STORAGE_SELECTED_SCHOOL_KEY, JSON.stringify(selectedSchool));
  }, [selectedSchool]);

  useEffect(() => {
    if (!isSettingsOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSettingsOpen]);

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
      setRecommendations([]);
      setBridgeComment(null);
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
        setBridgeComment(null);

        const schoolKey = getSchoolScopeKey(selectedSchool);
        const userKey = getOrCreateRecommendationViewerKey();
        const recentHistory = getScopedRecentRecommendationHistory(readRecentRecommendationHistory(), {
          schoolKey,
          userKey,
          currentDate: selectedDate,
        });
        const response = await fetch(
          '/api/recommendations?officeCode=' +
            encodeURIComponent(selectedSchool.officeCode) +
            '&schoolCode=' +
            encodeURIComponent(selectedSchool.schoolCode) +
            '&date=' +
            encodeURIComponent(selectedDate) +
            '&schoolKey=' +
            encodeURIComponent(schoolKey) +
            '&userKey=' +
            encodeURIComponent(userKey) +
            '&recentHistory=' +
            encodeURIComponent(JSON.stringify(recentHistory)),
          { signal: controller.signal },
        );
        const payload = (await response.json()) as RecommendationResponse;

        if (response.status === 404) {
          setLunchData(null);
          setLunchSummary(null);
          setRecommendations([]);
          setBridgeComment(null);
          setLunchError('오늘 급식 정보가 없어요.');
          setRecommendationError(null);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? '추천 정보를 불러오지 못했습니다.');
        }

        setLunchData(payload.lunch ?? null);
        setLunchSummary(payload.lunchSummary ?? null);
        setRecommendations(payload.recommendations ?? []);
        setBridgeComment(payload.bridgeComment ?? null);
        writeRecentRecommendationHistory(
          appendRecentRecommendationHistory(readRecentRecommendationHistory(), {
            schoolKey,
            userKey,
            recommendedAt: selectedDate,
            currentDate: selectedDate,
            recommendations: payload.recommendations ?? [],
          }),
        );
        } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setLunchData(null);
        setLunchSummary(null);
        setRecommendations([]);
        setBridgeComment(null);
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
    <main className="page-shell">
      <div className="page-stack">
        <header className="surface-card app-header">
          <div className="space-y-1.5">
            <p className="text-kicker">오늘 급식을 참고한 저녁 메뉴 추천</p>
            <h1 className="text-display text-[1.78rem] font-bold">{selectedSchool?.schoolName ?? '학교를 설정해보세요'}</h1>
          </div>
          <Button type="button" aria-label="학교 설정" variant="icon" className="icon-button" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4.5 w-4.5" />
          </Button>
        </header>

        <section className="surface-muted day-tabs">
          {dateTabs.map((offset) => (
            <Button
              key={offset}
              type="button"
              variant="tab"
              onClick={() => setSelectedDayOffset(offset)}
              className={cn(selectedDayOffset === offset && 'day-tab is-active')}
            >
              {getDateLabel(offset)}
            </Button>
          ))}
        </section>

        {!selectedSchool ? (
          <section className="status-card">
            <p className="text-body-muted text-base leading-7">학교를 검색해 설정해보세요.</p>
          </section>
        ) : isLoadingLunch ? (
          <section className="status-card">
            <div className="flex items-center justify-center gap-3 text-body-muted">
              <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
              <p className="text-base leading-7">오늘 급식을 불러오는 중이에요.</p>
            </div>
          </section>
        ) : lunchError ? (
          <section className="status-card text-left">
            <div className="space-y-2">
              <h2 className="section-heading text-[1.55rem]">급식이 없는 날이에요.</h2>
              <p className="section-description">주말 또는 방학 등의 일정일 수 있어요.</p>
            </div>
          </section>
        ) : lunchData && lunchSummary ? (
          <>
            <section className="space-y-4">
              <div className="section-header">
                <h2 className="section-heading">점심 메뉴</h2>
                <p className="pill-muted shrink-0 px-3 py-1 text-sm font-medium">{calories ? `${calories} kcal` : '칼로리 정보 없음'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="metric-card">
                  <p className="text-caption">점심 구성</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                    {lunchSummary.densityLabel}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="text-caption">점심 특징</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                    {lunchSummary.summaryLabel}
                  </p>
                </div>
              </div>

              <Card className="space-y-6 p-6">
                <div className="section-header border-b border-slate-100 pb-4">
                  <p className="text-kicker">급식 메뉴</p>
                </div>

                <div className="space-y-3">
                  {lunchItems.map((item) => (
                    <div key={item} className="list-row">
                      <p className="text-[1.04rem] font-medium leading-7 tracking-[-0.02em] text-slate-950">{item}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="space-y-4">
              <div className="space-y-2">
                <h2 className="section-heading">저녁 추천</h2>
              </div>

              {isLoadingRecommendations ? (
                <Card className="p-6 text-center">
                  <div className="flex items-center justify-center gap-3 text-body-muted">
                    <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
                    <p className="text-base leading-7">추천을 불러오는 중이에요.</p>
                  </div>
                </Card>
              ) : recommendationError ? (
                <Card className="p-6 text-center">
                  <p className="text-body-muted text-base leading-7">{recommendationError}</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Card className="bridge-card">
                    <div className="bridge-card__content flex flex-col items-center justify-center text-center">
                      <div className="bridge-card__quote-wrap flex items-start justify-center" style={{ gap: '0.18rem' }}>
                        <span aria-hidden="true" className="bridge-card__mark" style={{ transform: 'translateY(1px)' }}>
                          “
                        </span>
                        <p className="bridge-card__quote bridge-card__quote--editorial text-center">
                          {bridgeComment}{' '}
                          <span
                            aria-hidden="true"
                            className="bridge-card__mark bridge-card__mark--inline"
                            style={{ fontSize: '1.9rem', lineHeight: 1, fontWeight: 400, color: 'rgb(100 116 139 / 0.42)', display: 'inline-block', verticalAlign: '-0.18rem' }}
                          >
                            ”
                          </span>
                        </p>
                      </div>
                    </div>
                  </Card>
                  <div className="recommendation-scroller overflow-x-auto">
                    <div className="recommendation-track flex snap-x snap-mandatory gap-4 pr-6">
                      {recommendations.map((recommendation) => {
                        const primaryRecipeAction = recommendation.recipeActions.find((action) => action.role === 'primary') ?? recommendation.recipeActions[0];
                        const secondaryRecipeAction = recommendation.recipeActions.find((action) => action.role === 'secondary');

                        return (
                          <Card key={recommendation.menuId} className="recommendation-card min-w-[320px] max-w-[360px]">
                            <CardContent className="flex h-full flex-col gap-6 p-7 pt-8">
                              <div className="space-y-2">
                                <p className="text-xl font-semibold leading-8 tracking-[-0.03em] text-slate-950">{recommendation.displayName}</p>
                                {recommendation.secondaryDish ? (
                                  <p className="text-sm leading-6 text-slate-500">
                                    {recommendation.primaryDish}에 {recommendation.secondaryDish}를 곁들인 구성
                                  </p>
                                ) : null}
                              </div>

                              <div className="mt-auto space-y-2">
                                <a
                                  href={primaryRecipeAction?.url ?? recommendation.recipeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="button-primary inline-flex h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-medium"
                                >
                                  대표 레시피
                                  <ChevronRight className="ml-2 h-4 w-4" />
                                </a>
                                {secondaryRecipeAction ? (
                                  <a
                                    href={secondaryRecipeAction.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex w-full items-center justify-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
                                  >
                                    국/찌개도 보기
                                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      {isSettingsOpen ? (
        <div className="modal-scrim overflow-y-auto overscroll-contain">
          <div className="mx-auto flex h-full w-full max-w-[480px] items-end">
            <div className="surface-card modal-panel max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain">
              <div className="section-header items-start">
                <div className="space-y-1">
                  <p className="text-kicker">학교 설정</p>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">학교 검색</h2>
                </div>
                <Button type="button" aria-label="닫기" variant="icon" className="icon-button" onClick={() => setIsSettingsOpen(false)}>
                  <X className="h-4.5 w-4.5" />
                </Button>
              </div>

              <p className="mt-3 section-description">검색으로 학교를 바꿔보세요.</p>

              <div className="mt-4 field-shell">
                <Search className="h-4.5 w-4.5 text-slate-500" />
                <input
                  value={schoolQuery}
                  onChange={(event) => setSchoolQuery(event.target.value)}
                  placeholder="학교 검색"
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
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
                    <Button
                      key={`${school.officeCode}-${school.schoolCode}`}
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedSchool(school);
                        setIsSettingsOpen(false);
                        setSchoolQuery('');
                      }}
                      className={cn('option-card !justify-between !items-start !h-auto min-h-[72px]', isSelected && 'is-selected')}
                    >
                      <div className="flex-1 space-y-1 text-left">
                        <p className="text-sm font-medium text-slate-950">{school.schoolName}</p>
                        <p className="text-caption">{isSelected ? '선택 중' : `${school.officeName} · ${school.schoolLevel}`}</p>
                      </div>
                      <span className="option-card__check-slot">{isSelected ? <Check className="h-4.5 w-4.5 text-slate-900" /> : null}</span>
                    </Button>
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
