from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class MobileMainPageContractTests(unittest.TestCase):
    def test_page_contains_minimal_parent_focused_sections(self):
        page_path = PROJECT_ROOT / 'app/page.tsx'
        self.assertTrue(page_path.exists(), 'app/page.tsx should exist')
        content = page_path.read_text(encoding='utf-8')
        engine_path = PROJECT_ROOT / 'lib/dinner-engine.ts'
        self.assertTrue(engine_path.exists(), 'lib/dinner-engine.ts should exist')
        combined_content = content + '\n' + engine_path.read_text(encoding='utf-8')

        required_strings = [
            "import { Button } from '@/components/ui/button';",
            "import { Card, CardContent } from '@/components/ui/card';",
            'selectedDayLabel',
            '점심 메뉴',
            '급식 메뉴',
            '식단 요약',
            '식단 밀도',
            '메뉴 추천',
            '레시피 보기',
            '10000recipe.com',
            '학교 설정',
            '학교 검색',
            '검색으로 학교를 바꿔보세요.',
            '선택 중',
            '추천을 불러오는 중이에요.',
            '어제',
            'overflow-x-auto',
            'snap-x snap-mandatory',
            'min-w-[320px]',
            'max-w-[360px]',
            'pr-6',
            'useState',
            'Settings',
            'page-shell',
            'page-stack',
            'app-header',
            'day-tabs',
            'day-tab',
            'day-tab is-active',
            'status-card',
            'metric-card',
            'list-row',
            'field-shell',
            'option-card',
            '!justify-between',
            '!items-start',
            '!h-auto',
            'min-h-[72px]',
            'flex-1',
            'option-card__check-slot',
            'recommendation-scroller',
            'recommendation-track',
            'recommendation-card',
            'modal-scrim',
            'modal-panel',
            'section-header',
            'text-kicker',
            'text-display',
            'pill-muted',
            'section-description',
            'icon-button',
            'bridge-card',
            'bridge-card__quote',
            'bridge-card__quote--editorial',
            'bridge-card__mark',
            'bridge-card__mark--inline',
            'bridge-card__quote-wrap',
            'setRecommendations',
            'recommendationError',
            '급식이 없는 날이에요.',
            '주말 또는 방학 등의 일정일 수 있어요.',
            'buildDinnerRecommendationPayload',
            'selectDiverseRecommendations',
            'LOCAL_STORAGE_SELECTED_SCHOOL_KEY',
            'window.localStorage.setItem',
            'JSON.parse',
            'JSON.stringify',
        ]
        for item in required_strings:
            self.assertIn(item, combined_content)

        forbidden_strings = [
            '🍱',
            '✨',
            '🏫',
            'AI',
            'Sparkles',
            '오늘의 우리집 저녁가이드',
            'production_final_dataset_2025.json',
            '실제 서비스 데이터셋 기준',
            '캐러셀 안내',
            '데이터 기준 · 전국',
            '반복 출현 · 학교급',
            '저녁 추천 기준',
            '추천 근거',
            '반찬 추천',
            'border-orange-200 bg-white text-orange-700 hover:bg-orange-50',
            'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
            'rounded-3xl border border-border bg-card text-card-foreground shadow-sm rounded-[',
            'realDinnerRecommendations.map',
            'curatedDinnerSeed',
            'min-w-[272px]',
            'max-w-[300px]',
            'pr-2',
            'text-[var(--text-strong)]',
            'text-[var(--text-body)]',
            'border-[var(--border-soft)]',
            'bg-[var(--surface-card)]',
            'bg-[var(--surface-subtle)]',
            'primary-action',
        ]
        for item in forbidden_strings:
            self.assertNotIn(item, content)

    def test_design_tokens_are_defined_in_global_styles(self):
        globals_path = PROJECT_ROOT / 'app/globals.css'
        self.assertTrue(globals_path.exists(), 'app/globals.css should exist')
        content = globals_path.read_text(encoding='utf-8')

        required_strings = [
            '@import "tailwindcss";',
            ':root',
            '--page-background:',
            '--surface-card:',
            '--surface-subtle:',
            '--surface-muted:',
            '--text-strong:',
            '--text-muted:',
            '--border-soft:',
            '--shadow-card:',
            '.page-shell',
            '.page-stack',
            '.app-header',
            '.day-tabs',
            '.day-tab',
            '.day-tab.is-active',
            '.surface-card',
            '.surface-subtle',
            '.surface-muted',
            '.status-card',
            '.metric-card',
            '.list-row',
            '.field-shell',
            '.option-card',
            '.option-card__check-slot',
            '.recommendation-scroller',
            '.recommendation-track',
            '.recommendation-card',
            '.modal-scrim',
            '.modal-panel',
            'max-height: calc(100vh - 3rem);',
            'overflow-y: auto;',
            'overscroll-behavior: contain;',
            '.section-header',
            '.pill-muted',
            '.pill-subtle',
            '.meta-chip',
            '.text-kicker',
            '.text-display',
            '.section-description',
            '.bridge-card',
            '.bridge-card__content',
            '.bridge-card__quote-wrap',
            '.bridge-card__mark',
            '.bridge-card__mark--inline',
            '.bridge-card__quote',
            '.bridge-card__quote--editorial',
            '.difficulty-badge',
            '.difficulty-icon',
            '.difficulty-label',
            '.icon-button',
        ]
        for item in required_strings:
            self.assertIn(item, content)


if __name__ == '__main__':
    unittest.main()
